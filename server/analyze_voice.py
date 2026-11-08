"""Voice Characteristic Analyzer for Voice Cloning & Pitch Matching.
Analyzes audio file (gender, median fundamental frequency F0, delta pitch, best neural base).
"""
import sys
import json
import os

def analyze(audio_path: str):
    if not os.path.exists(audio_path):
        return {
            "error": f"File not found: {audio_path}",
            "gender": "male",
            "median_f0": 120.0,
            "delta_hz": 0,
            "pitch_arg": "+0Hz",
            "selected_voice": "vi-VN-NamMinhNeural"
        }

    try:
        import librosa
        import numpy as np

        # Load first 2.5 seconds at 16kHz for lightning-fast analysis (<1.5s)
        y, sr = librosa.load(audio_path, sr=16000, duration=2.5)
        if len(y) == 0:
            raise ValueError("Empty audio")

        f0 = librosa.yin(y, fmin=75, fmax=500, sr=sr)
        voiced = f0[(f0 >= 80) & (f0 <= 450)]

        if len(voiced) > 0:
            med_f0 = float(np.median(voiced))
        else:
            med_f0 = 175.0

        is_female = med_f0 > 165.0
        gender = "female" if is_female else "male"

        # Baseline frequencies: HoaiMy ~ 215 Hz, NamMinh ~ 115 Hz
        base_f0 = 215.0 if is_female else 115.0
        delta_hz = int(round(med_f0 - base_f0))
        # Clamp to avoid unnatural pitch artifacts
        delta_hz = max(-45, min(75, delta_hz))

        selected_voice = "vi-VN-HoaiMyNeural" if is_female else "vi-VN-NamMinhNeural"
        pitch_arg = f"+{delta_hz}Hz" if delta_hz >= 0 else f"{delta_hz}Hz"

        return {
            "gender": gender,
            "median_f0": round(med_f0, 1),
            "delta_hz": delta_hz,
            "pitch_arg": pitch_arg,
            "selected_voice": selected_voice,
            "status": "ok"
        }
    except Exception as e:
        return {
            "error": str(e),
            "gender": "female" if "female" in audio_path.lower() else "male",
            "median_f0": 175.0,
            "delta_hz": 0,
            "pitch_arg": "+0Hz",
            "selected_voice": "vi-VN-HoaiMyNeural" if "female" in audio_path.lower() else "vi-VN-NamMinhNeural",
            "status": "fallback"
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio path provided"}))
        sys.exit(1)
    
    path_arg = sys.argv[1]
    res = analyze(path_arg)
    print(json.dumps(res))
