import os
import sys
import time
import requests

TOKEN = os.environ.get("GITHUB_TOKEN", "")
RELEASE_ID = 422670570
FILE_PATH = r"d:\HINTON_STUDIO_PACKAGE.zip"
FILE_NAME = "HINTON_STUDIO_PACKAGE.zip"
URL = f"https://uploads.github.com/repos/buiminhkhang27032023-afk/hinton-studio/releases/{RELEASE_ID}/assets?name={FILE_NAME}"

file_size = os.path.getsize(FILE_PATH)
print(f"Bắt đầu tải lên {FILE_NAME} ({file_size / 1024 / 1024:.1f} MB) lên GitHub Release...")

class ProgressFile:
    def __init__(self, path, total_size):
        self.f = open(path, "rb")
        self.total_size = total_size
        self.uploaded = 0
        self.t0 = time.time()
        self.last_print = 0

    def read(self, chunk_size=-1):
        chunk = self.f.read(chunk_size)
        if chunk:
            self.uploaded += len(chunk)
            now = time.time()
            if now - self.last_print >= 5 or self.uploaded == self.total_size:
                elapsed = now - self.t0
                speed = (self.uploaded / 1024 / 1024) / max(0.1, elapsed)
                pct = (self.uploaded / self.total_size) * 100
                print(f"Tiến độ: {self.uploaded / 1024 / 1024:.1f}/{self.total_size / 1024 / 1024:.1f} MB ({pct:.1f}%) - Tốc độ: {speed:.2f} MB/s", flush=True)
                self.last_print = now
        return chunk

    def __len__(self):
        return self.total_size

    def close(self):
        self.f.close()

headers = {
    "Authorization": f"token {TOKEN}",
    "Content-Type": "application/zip",
    "Content-Length": str(file_size),
    "User-Agent": "HintonUploader"
}

progress_f = ProgressFile(FILE_PATH, file_size)
try:
    res = requests.post(URL, data=progress_f, headers=headers, timeout=3600)
    print("Response status:", res.status_code)
    if res.status_code in (200, 201):
        data = res.json()
        print("TẢI LÊN THÀNH CÔNG!")
        print("Asset URL:", data.get("browser_download_url"))
    else:
        print("Lỗi tải lên:", res.status_code, res.text[:300])
finally:
    progress_f.close()
