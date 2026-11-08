import os
import sys
import time
import zipfile
from pathlib import Path

SOURCE_DIR = Path(r"D:\phim ai thời trang")
OUTPUT_ZIP = Path(r"D:\SeeCut_Studio_Full_MayMoi.zip")

# Patterns/folders to exclude
EXCLUDE_DIRS = {
    ".git",
    ".next",
    ".next-deploy-check",
    ".tmp",
    "seecut_jobs",      # 19.5 GB old temp cut cache
    "output",           # old outputs
    "outputs",          # old outputs
    "output_lookbooks", # old outputs
    "scratch_tryon",
    "temp_render_wuxia",
    "temp_render_island",
    "temp_render_male_runway",
    "temp_render_100_male",
    "temp_render_breakup",
    "temp_render_combat",
    "temp_clean_runway_frames",
    "temp_fashion_scan",
    "temp_flawless_look_1_trench",
    "temp_flawless_scene_3_silver",
    "temp_frames_model2",
    "temp_frontal_close_frames",
    "temp_frontal_final_frames",
    "temp_model4_studio_frames",
}

EXCLUDE_PREFIXES = (
    "temp_",
    "compare_",
    "crop_",
    "test_",
    "veo-fashion-",
    "aud_face_",
    "catwalk_",
)

def should_skip(rel_path_str: str, file_name: str) -> bool:
    parts = rel_path_str.replace("\\", "/").split("/")
    for p in parts:
        if p in EXCLUDE_DIRS:
            return True
        if p.startswith("temp_"):
            return True
    
    if len(parts) == 1: # root file
        for pfx in EXCLUDE_PREFIXES:
            if file_name.startswith(pfx):
                return True
        if file_name.endswith(".zip"):
            return True

    return False

def main():
    print(f"Bắt đầu đóng gói dự án từ: {SOURCE_DIR}")
    print(f"File nén đầu ra: {OUTPUT_ZIP}")
    t0 = time.time()

    if OUTPUT_ZIP.exists():
        OUTPUT_ZIP.unlink()

    # Collect files
    file_list = []
    total_bytes = 0

    for root, dirs, files in os.walk(SOURCE_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith("temp_")]
        for f in files:
            full_path = Path(root) / f
            rel_path = full_path.relative_to(SOURCE_DIR)
            rel_str = str(rel_path)

            if should_skip(rel_str, f):
                continue

            try:
                sz = full_path.stat().st_size
                file_list.append((full_path, rel_str, sz))
                total_bytes += sz
            except Exception:
                pass

    print(f"Tìm thấy {len(file_list)} files. Tổng dung lượng thô: {total_bytes / (1024**3):.2f} GB")
    print("Đang nén file (sử dụng Fast Deflate)...")

    # Use zipfile with fast compression level 1
    packed_bytes = 0
    with zipfile.ZipFile(OUTPUT_ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=1) as zf:
        for idx, (full_path, rel_str, sz) in enumerate(file_list):
            try:
                zf.write(full_path, arcname=rel_str)
                packed_bytes += sz
                if (idx + 1) % 500 == 0 or (idx + 1) == len(file_list):
                    pct = (packed_bytes / total_bytes) * 100 if total_bytes > 0 else 100
                    elapsed = time.time() - t0
                    print(f"Tiến độ: [{idx+1}/{len(file_list)}] {pct:.1f}% ({packed_bytes/(1024**3):.2f}/{total_bytes/(1024**3):.2f} GB) - {elapsed:.0f}s", flush=True)
            except Exception as e:
                print(f"Lỗi nén file {rel_str}: {e}")

    total_time = time.time() - t0
    final_size_mb = OUTPUT_ZIP.stat().st_size / (1024**2)
    final_size_gb = final_size_mb / 1024

    print("=" * 60)
    print("HOÀN THÀNH ĐÓNG GÓI THÀNH CÔNG!")
    print(f"File zip: {OUTPUT_ZIP}")
    print(f"Dung lượng nén: {final_size_gb:.2f} GB ({final_size_mb:.1f} MB)")
    print(f"Thời gian: {total_time:.1f} giây")
    print("=" * 60)

if __name__ == "__main__":
    main()
