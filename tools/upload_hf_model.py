from __future__ import annotations

import argparse
from pathlib import Path

from huggingface_hub import HfApi, create_repo


DEFAULT_MODEL_DIR = Path("models") / "mandarin_phone_ctc_xlsr_chinese_gpu"
DEFAULT_REPO_ID = "sturka/see-my-voice-mandarin-phone-ctc"


def main() -> int:
    parser = argparse.ArgumentParser(description="Upload the trained phone CTC model to Hugging Face Hub.")
    parser.add_argument("--model-dir", type=Path, default=DEFAULT_MODEL_DIR)
    parser.add_argument("--repo-id", default=DEFAULT_REPO_ID)
    parser.add_argument("--private", action="store_true")
    args = parser.parse_args()

    if not args.model_dir.exists():
        raise SystemExit(f"Model directory was not found: {args.model_dir}")

    create_repo(args.repo_id, repo_type="model", private=args.private, exist_ok=True)
    commit = HfApi().upload_folder(
        repo_id=args.repo_id,
        repo_type="model",
        folder_path=str(args.model_dir),
        commit_message="Upload See My Voice Mandarin phone CTC model",
    )
    print(f"Uploaded model to https://huggingface.co/{args.repo_id}")
    print(f"Commit: {commit.commit_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
