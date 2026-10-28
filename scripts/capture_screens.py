import subprocess
import time

def snap(url, output_path):
    # Use msedge with debugging or small delay
    cmd = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "--headless",
        "--disable-gpu",
        f"--screenshot={output_path}",
        "--window-size=1500,950",
        "--virtual-time-budget=5000",
        url
    ]
    subprocess.run(cmd, check=True)
    print(f"Captured {url} -> {output_path}")

if __name__ == '__main__':
    snap("http://localhost:3210", r"C:\Users\Chen Qianyu\.gemini\antigravity\brain\bdbd603a-d0a7-4176-a196-329393979b65\dashboard_loaded.png")
    snap("http://localhost:3210/canvas/prj_combat_seedance_15s", r"C:\Users\Chen Qianyu\.gemini\antigravity\brain\bdbd603a-d0a7-4176-a196-329393979b65\canvas_loaded.png")
