from __future__ import annotations

import argparse
import shutil
import tempfile
from pathlib import Path

from huggingface_hub import HfApi, create_repo
from huggingface_hub.errors import HfHubHTTPError


DEFAULT_SPACE_DIR = Path("deploy") / "huggingface-pronunciation-api"
DEFAULT_SRC_DIR = Path("src")
DEFAULT_REPO_ID = "sturka/see-my-voice-pronunciation-api"


def stage_space(space_dir: Path, src_dir: Path, target: Path) -> None:
    shutil.copytree(space_dir, target)
    shutil.copytree(src_dir, target / "src")


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy the pronunciation API Docker Space.")
    parser.add_argument("--space-dir", type=Path, default=DEFAULT_SPACE_DIR)
    parser.add_argument("--src-dir", type=Path, default=DEFAULT_SRC_DIR)
    parser.add_argument("--repo-id", default=DEFAULT_REPO_ID)
    parser.add_argument("--private", action="store_true")
    args = parser.parse_args()

    if not args.space_dir.exists():
        raise SystemExit(f"Space template directory was not found: {args.space_dir}")
    if not args.src_dir.exists():
        raise SystemExit(f"Source directory was not found: {args.src_dir}")

    try:
        create_repo(
            args.repo_id,
            repo_type="space",
            space_sdk="docker",
            private=args.private,
            exist_ok=True,
        )
    except HfHubHTTPError as exc:
        message = str(exc)
        if "Payment Required" in message or "PRO subscription" in message:
            raise SystemExit(
                "Hugging Face refused Docker Space creation for this account. "
                "Enable HF PRO or deploy this Docker service to another container host."
            ) from exc
        raise

    with tempfile.TemporaryDirectory(prefix="see_my_voice_space_") as temp_dir:
        stage = Path(temp_dir) / "space"
        stage_space(args.space_dir, args.src_dir, stage)
        commit = HfApi().upload_folder(
            repo_id=args.repo_id,
            repo_type="space",
            folder_path=str(stage),
            commit_message="Deploy See My Voice pronunciation API",
        )

    print(f"Uploaded Space to https://huggingface.co/spaces/{args.repo_id}")
    print(f"API URL: https://{args.repo_id.replace('/', '-')}.hf.space")
    print(f"Commit: {commit.commit_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
