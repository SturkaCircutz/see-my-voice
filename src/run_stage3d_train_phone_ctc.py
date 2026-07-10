from __future__ import annotations

import argparse
import csv
import json
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn.functional as F

from stage1_pronunciation import SAMPLE_RATE, load_audio
from stage3a_labels import CTC_BLANK_TOKEN
from stage3a_labels import FROZEN_PHONE_TOKENS


DEFAULT_DATASET = Path("stage3b_dataset") / "dataset.csv"
DEFAULT_OUTPUT_DIR = Path("models") / "mandarin_phone_ctc"
DEFAULT_MODEL = "hf-internal-testing/tiny-random-wav2vec2"


@dataclass
class TrainingConfig:
    dataset: str
    output_dir: str
    base_model: str
    device: str
    seed: int
    max_train_samples: int
    max_eval_samples: int
    max_steps: int
    batch_size: int
    learning_rate: float
    max_audio_seconds: float
    max_phone_tokens: int
    early_stop_patience: int
    early_stop_min_delta: float
    load_best_at_end: bool
    freeze_feature_encoder: bool


def read_dataset(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def token_inventory() -> tuple[dict[str, int], dict[int, str]]:
    tokens = [CTC_BLANK_TOKEN] + FROZEN_PHONE_TOKENS
    token_to_id = {token: index for index, token in enumerate(tokens)}
    id_to_token = {index: token for token, index in token_to_id.items()}
    return token_to_id, id_to_token


def encode_phone_tokens(phone_tokens: str, token_to_id: dict[str, int]) -> list[int]:
    tokens = [token for token in phone_tokens.split() if token]
    unknown = [token for token in tokens if token not in token_to_id]
    if unknown:
        raise ValueError(f"Unknown phone token(s): {', '.join(unknown)}")
    return [token_to_id[token] for token in tokens]


def split_rows(rows: list[dict[str, str]]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    train_rows = [row for row in rows if row.get("split") == "train" and row.get("audio_exists") == "True"]
    eval_rows = [
        row
        for row in rows
        if row.get("split") in {"val", "test"} and row.get("audio_exists") == "True"
    ]
    if not eval_rows:
        eval_rows = train_rows[: max(1, min(4, len(train_rows)))]
    return train_rows, eval_rows


def phone_token_count(row: dict[str, str]) -> int:
    value = row.get("n_phone_tokens", "")
    if value:
        return int(value)
    return len(row.get("phone_tokens", "").split())


def filter_short_targets(rows: list[dict[str, str]], max_phone_tokens: int) -> list[dict[str, str]]:
    if max_phone_tokens <= 0:
        return rows
    return [row for row in rows if phone_token_count(row) <= max_phone_tokens]


def choose_rows(rows: list[dict[str, str]], max_count: int, rng: random.Random) -> list[dict[str, str]]:
    rows = sorted(rows, key=phone_token_count)
    if max_count <= 0:
        return rows
    short_pool = rows[: max(max_count * 4, max_count)]
    rng.shuffle(short_pool)
    rows = sorted(short_pool[:max_count], key=phone_token_count)
    return rows[:max_count] if max_count > 0 else rows


def sample_ids(rows: list[dict[str, str]]) -> list[str]:
    return [row["sample_id"] for row in rows]


def load_waveform(path: Path, max_audio_seconds: float) -> np.ndarray:
    audio, sample_rate = load_audio(path, SAMPLE_RATE)
    if max_audio_seconds > 0:
        max_samples = int(max_audio_seconds * sample_rate)
        if len(audio) > max_samples:
            audio = audio[:max_samples]
    return audio.astype(np.float32)


def prepare_batch(
    rows: list[dict[str, str]],
    processor: Any,
    token_to_id: dict[str, int],
    max_audio_seconds: float,
    device: str,
) -> dict[str, torch.Tensor]:
    waveforms = [load_waveform(Path(row["audio_path"]), max_audio_seconds) for row in rows]
    inputs = processor(
        waveforms,
        sampling_rate=SAMPLE_RATE,
        return_tensors="pt",
        padding=True,
    )
    labels = [encode_phone_tokens(row["phone_tokens"], token_to_id) for row in rows]
    flat_labels = [item for row_labels in labels for item in row_labels]

    return {
        "input_values": inputs.input_values.to(device),
        "attention_mask": getattr(inputs, "attention_mask", None).to(device)
        if getattr(inputs, "attention_mask", None) is not None
        else None,
        "labels": torch.tensor(flat_labels, dtype=torch.long, device=device),
        "label_lengths": torch.tensor([len(row_labels) for row_labels in labels], dtype=torch.long, device=device),
    }


def ctc_loss_from_batch(model: Any, batch: dict[str, torch.Tensor], blank_id: int = 0) -> torch.Tensor:
    model_inputs = {"input_values": batch["input_values"]}
    if batch["attention_mask"] is not None:
        model_inputs["attention_mask"] = batch["attention_mask"]
    logits = model(**model_inputs).logits
    log_probs = F.log_softmax(logits, dim=-1).transpose(0, 1)
    input_lengths = torch.full(
        (logits.shape[0],),
        logits.shape[1],
        dtype=torch.long,
        device=logits.device,
    )
    return F.ctc_loss(
        log_probs,
        batch["labels"],
        input_lengths,
        batch["label_lengths"],
        blank=blank_id,
        zero_infinity=True,
    )


def evaluate_loss(
    model: Any,
    rows: list[dict[str, str]],
    processor: Any,
    token_to_id: dict[str, int],
    batch_size: int,
    max_audio_seconds: float,
    device: str,
) -> float | None:
    if not rows:
        return None
    model.eval()
    losses = []
    with torch.no_grad():
        for start in range(0, len(rows), batch_size):
            batch_rows = rows[start : start + batch_size]
            batch = prepare_batch(batch_rows, processor, token_to_id, max_audio_seconds, device)
            loss = ctc_loss_from_batch(model, batch)
            if torch.isfinite(loss):
                losses.append(float(loss.item()))
    model.train()
    if not losses:
        return None
    return float(sum(losses) / len(losses))


def write_json(data: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_loss_csv(history: list[dict[str, float | int | None]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["step", "train_loss", "eval_loss"])
        writer.writeheader()
        writer.writerows(history)


def plot_loss(history: list[dict[str, float | int | None]], path: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    steps = [int(row["step"]) for row in history]
    train_losses = [float(row["train_loss"]) for row in history if row["train_loss"] is not None]
    train_steps = [int(row["step"]) for row in history if row["train_loss"] is not None]
    eval_rows = [row for row in history if row["eval_loss"] is not None]
    eval_steps = [int(row["step"]) for row in eval_rows]
    eval_losses = [float(row["eval_loss"]) for row in eval_rows]

    plt.figure(figsize=(8, 5))
    if train_steps:
        plt.plot(train_steps, train_losses, marker="o", label="train loss")
    if eval_steps:
        plt.plot(eval_steps, eval_losses, marker="s", label="eval loss")
    plt.xlabel("training step")
    plt.ylabel("CTC loss")
    plt.title("Stage 3D phone CTC post-training loss")
    plt.grid(True, alpha=0.3)
    plt.legend()
    path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(path, dpi=160)
    plt.close()


def build_model_and_processor(model_name: str, vocab_size: int, device: str):
    from transformers import AutoConfig, AutoProcessor, AutoModelForCTC

    processor = AutoProcessor.from_pretrained(model_name)
    config = AutoConfig.from_pretrained(
        model_name,
        vocab_size=vocab_size,
        ctc_loss_reduction="mean",
        pad_token_id=0,
    )
    model = AutoModelForCTC.from_pretrained(
        model_name,
        config=config,
        ignore_mismatched_sizes=True,
    )
    model.to(device)
    return processor, model


def train(args: argparse.Namespace) -> int:
    if args.device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    else:
        device = args.device
    torch.manual_seed(args.seed)
    rng = random.Random(args.seed)

    rows = read_dataset(args.dataset)
    train_rows, eval_rows = split_rows(rows)
    train_rows = filter_short_targets(train_rows, args.max_phone_tokens)
    eval_rows = filter_short_targets(eval_rows, args.max_phone_tokens)
    if not eval_rows:
        eval_rows = train_rows[-max(1, min(args.max_eval_samples, len(train_rows))) :]
        train_rows = train_rows[: -len(eval_rows)] if len(train_rows) > len(eval_rows) else train_rows
    train_rows = choose_rows(train_rows, args.max_train_samples, rng)
    eval_rows = choose_rows(eval_rows, args.max_eval_samples, rng)
    if not train_rows:
        print("No train rows with audio_exists=True were found.")
        return 1
    if not eval_rows:
        print("No eval rows with audio_exists=True were found.")
        return 1

    train_ids = set(sample_ids(train_rows))
    eval_ids = set(sample_ids(eval_rows))
    overlap_ids = sorted(train_ids & eval_ids)
    if overlap_ids:
        raise RuntimeError(f"Train/eval overlap is not allowed: {', '.join(overlap_ids)}")

    token_to_id, id_to_token = token_inventory()
    processor, model = build_model_and_processor(args.base_model, len(token_to_id), device)
    if args.freeze_feature_encoder and hasattr(model, "freeze_feature_encoder"):
        model.freeze_feature_encoder()

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate)
    history: list[dict[str, float | int | None]] = []
    best_eval_loss: float | None = None
    best_eval_step: int | None = None
    best_state_dict: dict[str, torch.Tensor] | None = None
    bad_eval_count = 0
    stopped_early = False

    print(f"Device: {device}")
    print(f"Base model: {args.base_model}")
    print(f"Train rows: {len(train_rows)}")
    print(f"Eval rows: {len(eval_rows)}")
    print(f"Train/eval overlap: {len(overlap_ids)}")
    print(f"Vocabulary size: {len(token_to_id)}")
    print(f"Max phone tokens: {args.max_phone_tokens}")
    print(f"Max steps: {args.max_steps}")

    model.train()
    for step in range(1, args.max_steps + 1):
        batch_rows = rng.sample(train_rows, k=min(args.batch_size, len(train_rows)))
        batch = prepare_batch(batch_rows, processor, token_to_id, args.max_audio_seconds, device)
        loss = ctc_loss_from_batch(model, batch)
        if not torch.isfinite(loss):
            print(f"Step {step}: non-finite loss, skipping update: {float(loss.item())}")
            continue

        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), args.max_grad_norm)
        optimizer.step()

        eval_loss = None
        if step == 1 or step == args.max_steps or step % args.eval_every == 0:
            eval_loss = evaluate_loss(
                model,
                eval_rows,
                processor,
                token_to_id,
                args.batch_size,
                args.max_audio_seconds,
                device,
            )
            improved = (
                eval_loss is not None
                and (best_eval_loss is None or eval_loss < best_eval_loss - args.early_stop_min_delta)
            )
            if improved:
                best_eval_loss = eval_loss
                best_eval_step = step
                bad_eval_count = 0
                if args.load_best_at_end:
                    best_state_dict = {
                        name: value.detach().cpu().clone()
                        for name, value in model.state_dict().items()
                    }
            elif eval_loss is not None:
                bad_eval_count += 1
        row = {
            "step": step,
            "train_loss": float(loss.item()),
            "eval_loss": eval_loss,
        }
        history.append(row)
        eval_text = "" if eval_loss is None else f", eval_loss={eval_loss:.4f}"
        print(f"step={step} train_loss={loss.item():.4f}{eval_text}")
        if (
            args.early_stop_patience > 0
            and eval_loss is not None
            and bad_eval_count >= args.early_stop_patience
        ):
            print(
                "Early stopping: validation loss did not improve for "
                f"{bad_eval_count} eval checks."
            )
            stopped_early = True
            break

    if args.load_best_at_end and best_state_dict is not None:
        model.load_state_dict(best_state_dict)
        model.to(device)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(args.output_dir)
    processor.save_pretrained(args.output_dir)
    write_json({str(index): token for index, token in id_to_token.items()}, args.output_dir / "id_to_phone_token.json")
    write_json(token_to_id, args.output_dir / "phone_token_to_id.json")
    write_loss_csv(history, args.output_dir / "loss_history.csv")
    plot_loss(history, args.output_dir / "loss_curve.png")
    write_json(
        {
            "stage": "stage_3d_phone_ctc_post_training",
            "config": asdict(
                TrainingConfig(
                    dataset=str(args.dataset),
                    output_dir=str(args.output_dir),
                    base_model=args.base_model,
                    device=device,
                    seed=args.seed,
                    max_train_samples=args.max_train_samples,
                    max_eval_samples=args.max_eval_samples,
                    max_steps=args.max_steps,
                    batch_size=args.batch_size,
                    learning_rate=args.learning_rate,
                    max_audio_seconds=args.max_audio_seconds,
                    max_phone_tokens=args.max_phone_tokens,
                    early_stop_patience=args.early_stop_patience,
                    early_stop_min_delta=args.early_stop_min_delta,
                    load_best_at_end=args.load_best_at_end,
                    freeze_feature_encoder=args.freeze_feature_encoder,
                )
            ),
            "n_train_rows": len(train_rows),
            "n_eval_rows": len(eval_rows),
            "train_sample_ids": sample_ids(train_rows),
            "eval_sample_ids": sample_ids(eval_rows),
            "train_eval_overlap_count": len(overlap_ids),
            "train_eval_overlap_ids": overlap_ids,
            "vocab_size": len(token_to_id),
            "steps_ran": history[-1]["step"] if history else 0,
            "stopped_early": stopped_early,
            "best_eval_loss": best_eval_loss,
            "best_eval_step": best_eval_step,
            "final_train_loss": history[-1]["train_loss"] if history else None,
            "final_eval_loss": history[-1]["eval_loss"] if history else None,
            "artifacts": {
                "model_dir": str(args.output_dir),
                "loss_history": str(args.output_dir / "loss_history.csv"),
                "loss_curve": str(args.output_dir / "loss_curve.png"),
            },
        },
        args.output_dir / "training_report.json",
    )
    print(f"Saved model and training artifacts to {args.output_dir.resolve()}")
    print(f"Saved loss graph to {(args.output_dir / 'loss_curve.png').resolve()}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Stage 3D: post-train a phone-token CTC model and save a loss graph."
    )
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--base-model", default=DEFAULT_MODEL)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--seed", type=int, default=13)
    parser.add_argument("--max-train-samples", type=int, default=8)
    parser.add_argument("--max-eval-samples", type=int, default=2)
    parser.add_argument("--max-steps", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--max-audio-seconds", type=float, default=4.0)
    parser.add_argument("--max-phone-tokens", type=int, default=32)
    parser.add_argument("--eval-every", type=int, default=1)
    parser.add_argument("--early-stop-patience", type=int, default=0)
    parser.add_argument("--early-stop-min-delta", type=float, default=0.0)
    parser.add_argument("--no-load-best-at-end", action="store_true")
    parser.add_argument("--max-grad-norm", type=float, default=1.0)
    parser.add_argument("--no-freeze-feature-encoder", action="store_true")
    args = parser.parse_args()
    args.freeze_feature_encoder = not args.no_freeze_feature_encoder
    args.load_best_at_end = not args.no_load_best_at_end
    return train(args)


if __name__ == "__main__":
    raise SystemExit(main())
