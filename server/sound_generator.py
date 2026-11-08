"""
High-quality Sound Effects (SFX) and Ambient Music (BGM) generator for Hinton Studio.
Generates broadcast-grade procedural audio using NumPy and SciPy.
"""
import argparse
import math
import os
import sys
import wave
import numpy as np

def generate_music(prompt: str, duration: float = 10.0, sr: int = 44100) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    audio = np.zeros_like(t)

    # Chords in Hz (Cinematic emotional progression: Dm -> Bb -> F -> C or Am -> F -> C -> G)
    # Dm (D3=146.83, F3=174.61, A3=220.00, D4=293.66)
    # Bb (Bb2=116.54, D3=146.83, F3=174.61, Bb3=233.08)
    # F  (F2=87.31, C3=130.81, F3=174.61, A3=220.00)
    # C  (C3=130.81, E3=164.81, G3=196.00, C4=261.63)
    chord_prog = [
        [146.83, 174.61, 220.00, 293.66, 440.00],  # Dm
        [116.54, 146.83, 174.61, 233.08, 349.23],  # Bb
        [130.81, 174.61, 220.00, 261.63, 349.23],  # F
        [130.81, 164.81, 196.00, 261.63, 392.00],  # C
    ]

    chord_duration = duration / len(chord_prog)

    for i, chord in enumerate(chord_prog):
        start_idx = int(i * chord_duration * sr)
        end_idx = int((i + 1) * chord_duration * sr) if i < len(chord_prog) - 1 else len(t)
        seg_len = end_idx - start_idx
        seg_t = np.linspace(0, seg_len / sr, seg_len, endpoint=False)

        seg_audio = np.zeros(seg_len)
        # Pad layer (warm smooth synth pad)
        envelope = np.sin(np.pi * np.linspace(0, 1, seg_len)) ** 0.5  # smooth swell
        for f in chord:
            # Fundamental + soft harmonics
            sine = np.sin(2 * np.pi * f * seg_t)
            harm2 = 0.3 * np.sin(2 * np.pi * 2 * f * seg_t)
            harm3 = 0.1 * np.sin(2 * np.pi * 3 * f * seg_t)
            # Gentle chorus detune
            chorus = 0.25 * np.sin(2 * np.pi * (f + 0.6) * seg_t)
            seg_audio += (sine + harm2 + harm3 + chorus) * envelope

        # Subtle melodic piano-like bell notes on beat
        notes = [chord[3], chord[4], chord[2], chord[3]]
        sub_len = seg_len // len(notes)
        for n_i, note_f in enumerate(notes):
            n_start = n_i * sub_len
            n_end = min(seg_len, (n_i + 1) * sub_len + int(0.5 * sr))
            n_samples = n_end - n_start
            if n_samples <= 0: continue
            note_t = np.linspace(0, n_samples / sr, n_samples, endpoint=False)
            # Piano percussive envelope: fast attack, exponential decay
            decay = np.exp(-note_t * 3.5)
            bell = (np.sin(2 * np.pi * note_f * note_t) + 
                    0.4 * np.sin(2 * np.pi * 2 * note_f * note_t) +
                    0.15 * np.sin(2 * np.pi * 3 * note_f * note_t)) * decay * 0.35
            seg_audio[n_start:n_end] += bell[:len(seg_audio[n_start:n_end])]

        audio[start_idx:end_idx] += seg_audio

    # Add gentle global tape/reverb tail & fade in/out
    fade_len = int(min(sr * 0.6, len(audio) // 4))
    fade_in = np.linspace(0, 1, fade_len)
    fade_out = np.linspace(1, 0, fade_len)
    audio[:fade_len] *= fade_in
    audio[-fade_len:] *= fade_out

    # Normalize
    max_val = np.max(np.abs(audio))
    if max_val > 1e-5:
        audio = (audio / max_val) * 0.82
    return audio

def generate_sfx(prompt: str, duration: float = 10.0, sr: int = 44100) -> np.ndarray:
    p_lower = prompt.lower()
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    n_samples = len(t)
    audio = np.zeros(n_samples)

    # 1. Riverside Wind / Gió đêm vi vu
    if any(k in p_lower for k in ["gió", "wind", "bão", "đêm", "hiu hắt", "bờ sông"]):
        # Pink/brown noise generated via filtered white noise
        white = np.random.normal(0, 1, n_samples)
        # Slow moving gust modulation
        gusts = 0.5 + 0.4 * np.sin(2 * np.pi * 0.18 * t) + 0.2 * np.sin(2 * np.pi * 0.45 * t + 1.2)
        gusts = np.clip(gusts, 0.1, 1.0)
        # Lowpass filter approximation with cumulative sum (brownian)
        brown = np.cumsum(white)
        brown = brown - np.mean(brown)
        brown = brown / (np.max(np.abs(brown)) + 1e-5)
        # Add resonance sweep
        sweep = np.sin(2 * np.pi * (180 + 90 * gusts) * t) * 0.25
        audio += (brown * 0.7 + sweep * 0.3) * gusts * 0.6

    # 2. Water / Tiếng nước chảy / Sóng vỗ
    if any(k in p_lower for k in ["nước", "sóng", "water", "sông", "stream", "river", "mưa", "rain"]):
        white = np.random.normal(0, 1, n_samples)
        # Bandpass trick around 400-800Hz
        water_lfo = 0.6 + 0.35 * np.sin(2 * np.pi * 0.32 * t)
        # Bubbling droplet impulses
        droplets = np.zeros(n_samples)
        n_drops = int(duration * 6)
        drop_times = np.random.randint(0, n_samples - int(sr * 0.1), n_drops)
        for dt_idx in drop_times:
            drop_len = int(sr * 0.08)
            d_t = np.linspace(0, 0.08, drop_len)
            f_drop = np.random.uniform(700, 1400)
            chirp = np.sin(2 * np.pi * f_drop * d_t * (1.0 + d_t * 5)) * np.exp(-d_t * 60)
            droplets[dt_idx:dt_idx+drop_len] += chirp * np.random.uniform(0.15, 0.4)
        audio += white * water_lfo * 0.25 + droplets

    # 3. Footsteps / Bước chân
    if any(k in p_lower for k in ["bước", "chân", "step", "footstep", "giày", "đi"]):
        step_interval = 1.15  # seconds between footsteps
        n_steps = int(duration / step_interval)
        for i in range(n_steps):
            s_time = (i + 0.4) * step_interval
            s_idx = int(s_time * sr)
            if s_idx + int(sr * 0.25) < n_samples:
                f_len = int(sr * 0.22)
                f_t = np.linspace(0, 0.22, f_len)
                # Low thud + gravel noise crunch
                thud = np.sin(2 * np.pi * 75 * f_t) * np.exp(-f_t * 30)
                crunch = np.random.normal(0, 1, f_len) * np.exp(-f_t * 40) * 0.3
                audio[s_idx:s_idx+f_len] += (thud * 0.8 + crunch) * 0.7

    # 4. Default nocturnal peaceful ambience if nothing matched
    if np.max(np.abs(audio)) < 0.01:
        # Subtle night drone + warm breeze
        white = np.random.normal(0, 1, n_samples)
        breeze = np.cumsum(white)
        breeze = breeze / (np.max(np.abs(breeze)) + 1e-5)
        drone = 0.2 * np.sin(2 * np.pi * 110 * t) + 0.1 * np.sin(2 * np.pi * 220 * t)
        audio = breeze * 0.5 + drone

    # Smooth edges
    fade_len = int(min(sr * 0.4, len(audio) // 4))
    fade_in = np.linspace(0, 1, fade_len)
    fade_out = np.linspace(1, 0, fade_len)
    audio[:fade_len] *= fade_in
    audio[-fade_len:] *= fade_out

    # Normalize
    max_val = np.max(np.abs(audio))
    if max_val > 1e-5:
        audio = (audio / max_val) * 0.85
    return audio

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", type=str, required=True)
    parser.add_argument("--kind", type=str, default="sfx", choices=["sfx", "music", "bgm"])
    parser.add_argument("--duration", type=float, default=10.0)
    parser.add_argument("--out", type=str, required=True)
    args = parser.parse_args()

    sr = 44100
    if args.kind in ["music", "bgm"]:
        samples = generate_music(args.prompt, duration=args.duration, sr=sr)
    else:
        samples = generate_sfx(args.prompt, duration=args.duration, sr=sr)

    # Convert to 16-bit PCM WAV
    audio_int16 = (samples * 32767).astype(np.int16)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with wave.open(args.out, "w") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sr)
        wav_file.writeframes(audio_int16.tobytes())

    print(f"DONE:{args.out}:{len(samples)/sr:.2f}")

if __name__ == "__main__":
    main()
