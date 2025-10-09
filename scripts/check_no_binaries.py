"""Fail if disallowed binary files are tracked in the repository."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

BLOCKED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".mp4", ".mov", ".avi", ".zip", ".psd", ".ico"}


def list_tracked_files() -> list[str]:
    result = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True)
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def main() -> int:
    offending: list[str] = []
    for relative_path in list_tracked_files():
        extension = Path(relative_path).suffix.lower()
        if extension in BLOCKED_EXTENSIONS:
            offending.append(relative_path)

    if offending:
        print("❌ Binärdateien gefunden – bitte entferne sie:")
        for path in offending:
            print(f"  - {path}")
        return 1

    print("✅ Keine verbotenen Binärdateien gefunden.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
