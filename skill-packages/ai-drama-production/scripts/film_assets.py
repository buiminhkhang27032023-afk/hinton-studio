"""Validate a shot plan or split an approved 2x2 board. Standard library + FFmpeg."""
import argparse
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys


def validate(plan, base, check_files=False):
    errors = []
    if not isinstance(plan, dict):
        return ["Plan must be an object."]
    chars = plan.get("characters", {})
    assets = plan.get("assets", {})
    shots = plan.get("shots", [])
    if not isinstance(chars, dict) or not chars:
        errors.append("characters must be a nonempty object.")
        chars = {}
    if not isinstance(assets, dict):
        errors.append("assets must be an object.")
        assets = {}
    if not isinstance(shots, list) or not shots:
        return errors + ["shots must be a nonempty list."]
    seen = set()
    total = 0.0
    previous = None
    for n, shot in enumerate(shots, 1):
        if not isinstance(shot, dict):
            errors.append(f"Shot {n}: must be an object.")
            continue
        sid = shot.get("id")
        if not isinstance(sid, str) or not sid or sid in seen:
            errors.append(f"Shot {n}: missing or duplicate string id.")
        else:
            seen.add(sid)
        for key in ("scene", "location", "camera", "action", "start_state", "end_state", "video_prompt"):
            if not isinstance(shot.get(key), str) or not shot[key].strip():
                errors.append(f"{sid}: missing {key}.")
        duration = shot.get("duration_s")
        if isinstance(duration, bool) or not isinstance(duration, (int, float)) or not math.isfinite(duration) or duration <= 0:
            errors.append(f"{sid}: duration_s must be a positive finite number.")
        else:
            total += duration
        cast = shot.get("characters")
        if not isinstance(cast, list) or not all(isinstance(c, str) and c in chars for c in cast):
            errors.append(f"{sid}: unknown or invalid character list.")
            cast = []
        refs = shot.get("references")
        if not isinstance(refs, list) or not refs or not all(isinstance(r, str) and r in assets for r in refs):
            errors.append(f"{sid}: unknown or invalid reference list.")
        dialogue = shot.get("dialogue", [])
        if not isinstance(dialogue, list):
            errors.append(f"{sid}: dialogue must be a list.")
            dialogue = []
        for line in dialogue:
            if not isinstance(line, dict) or line.get("speaker") not in cast or not isinstance(line.get("text"), str) or not line["text"].strip():
                errors.append(f"{sid}: dialogue needs a cast speaker and nonempty text.")
        if previous and previous.get("scene") == shot.get("scene") and previous.get("end_state") != shot.get("start_state"):
            errors.append(f"{sid}: start_state differs from previous end_state in same scene.")
        previous = shot
    expected = plan.get("duration_s")
    if isinstance(expected, bool) or not isinstance(expected, (int, float)) or not math.isfinite(expected) or expected <= 0 or not math.isclose(total, expected, abs_tol=0.01):
        errors.append(f"duration_s does not match shot sum ({total:g}s).")
    if check_files:
        for aid, asset in assets.items():
            path = asset.get("path") if isinstance(asset, dict) else None
            if not isinstance(path, str) or not path:
                errors.append(f"{aid}: asset has no path.")
            elif not (base / path).is_file():
                errors.append(f"{aid}: asset file missing: {path}")
    return errors


def split_board(source, output, prefix):
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise ValueError("FFmpeg and ffprobe must be installed.")
    if not source.is_file():
        raise ValueError("Source image does not exist.")
    if not prefix or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in prefix):
        raise ValueError("Prefix may contain only letters, numbers, underscore and hyphen.")
    info = json.loads(subprocess.check_output([ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", str(source)], text=True))
    stream = info["streams"][0]
    width, height = stream["width"] // 2, stream["height"] // 2
    if min(width, height) < 16:
        raise ValueError("Board is too small to split.")
    paths = [output / f"{prefix}_SH{i:02d}.png" for i in range(1, 5)]
    if any(p.exists() for p in paths):
        raise ValueError("Output exists; choose a new prefix or folder.")
    output.mkdir(parents=True, exist_ok=True)
    filters = []
    for i in range(4):
        x, y = (i % 2) * width, (i // 2) * height
        filters.append(f"[0:v]crop={width}:{height}:{x}:{y}[s{i}]")
    cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-n", "-i", str(source), "-filter_complex", ";".join(filters)]
    for i, path in enumerate(paths):
        cmd += ["-map", f"[s{i}]", "-frames:v", "1", str(path)]
    subprocess.run(cmd, check=True)
    for path in paths:
        print(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("validate")
    check.add_argument("plan", type=Path)
    check.add_argument("--check-files", action="store_true")
    split = commands.add_parser("split-board")
    split.add_argument("source", type=Path)
    split.add_argument("--out", type=Path, required=True)
    split.add_argument("--prefix", default="S01")
    args = parser.parse_args()
    try:
        if args.command == "validate":
            plan = json.loads(args.plan.read_text(encoding="utf-8-sig"))
            errors = validate(plan, args.plan.parent, args.check_files)
            if errors:
                print("INVALID\n" + "\n".join(errors))
                return 1
            print(f"VALID: {len(plan['shots'])} shots, {plan['duration_s']} seconds. Media quality not checked.")
        else:
            split_board(args.source, args.out, args.prefix)
    except (OSError, ValueError, KeyError, IndexError, subprocess.CalledProcessError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
