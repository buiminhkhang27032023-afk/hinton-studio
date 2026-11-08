"""Local OmniVoice TTS Service (with Hinton Voice-Lock v2 & Zero-Shot Voice Cloning).
Compatible with Windows and Linux.
Provides:
  1. GET  /health -> Returns voice_locked=True, ref_audio, speed, status=ok
  2. POST /tts    -> Returns audio/wav or audio/mpeg (with custom_ref voice cloning)
  3. CLI mode     -> python omnivoice_service.py --text "..." --output "out.wav"
"""
import io
import os
import sys
import time
import json
import logging
import argparse
import subprocess
import threading
import tempfile
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("omnivoice")

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
DATA_DIR = PROJECT_ROOT / "data" / "omnivoice"

REF_AUDIO = os.environ.get("OMNIVOICE_REF_AUDIO", str(DATA_DIR / "voice-lock-vn-v2.wav"))
REF_TEXT_FILE = os.environ.get("OMNIVOICE_REF_TEXT", str(DATA_DIR / "voice-lock-vn-v2.ref.txt"))
SPEED = float(os.environ.get("OMNIVOICE_SPEED", "1.2"))
PORT = int(os.environ.get("OMNIVOICE_PORT", "8123"))
LANG = os.environ.get("OMNIVOICE_LANG", "vi")

# Check ref files
if not os.path.exists(REF_AUDIO):
    alt_ref = Path(r"D:\aivideo\hinton-all-in-one\08-pipeline-code\omnivoice-server\voice-lock-vn-v2.wav")
    if alt_ref.exists():
        REF_AUDIO = str(alt_ref)
        REF_TEXT_FILE = str(alt_ref.with_suffix(".ref.txt"))

ref_text_content = ""
if os.path.exists(REF_TEXT_FILE):
    try:
        ref_text_content = Path(REF_TEXT_FILE).read_text(encoding="utf-8").strip()
    except Exception as e:
        log.warning("Could not read ref text: %s", e)

log.info("OmniVoice configuration: ref_audio=%s, ref_text_len=%d, speed=%s", REF_AUDIO, len(ref_text_content), SPEED)

# Lazy OmniVoice model loading
_model = None
_default_prompt = None
_model_lock = threading.Lock()
_prompt_cache = {}
_whisper_pipe = None

def get_whisper_pipe():
    global _whisper_pipe
    if _whisper_pipe is None:
        from transformers import pipeline
        log.info("Loading whisper-tiny for fast reference transcription...")
        _whisper_pipe = pipeline("automatic-speech-recognition", model="openai/whisper-tiny", device="cpu")
    return _whisper_pipe

def get_omnivoice_model():
    global _model, _default_prompt
    with _model_lock:
        if _model is not None:
            return _model, _default_prompt
        try:
            import torch
            torch.set_num_threads(10)
            from omnivoice import OmniVoice
            from omnivoice.models.omnivoice import OmniVoiceGenerationConfig
            log.info("Loading OmniVoice model (k2-fsa/OmniVoice)...")
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = torch.float16 if device == "cuda" else torch.float32
            m = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map=device, dtype=dtype)
            prompt = None
            if os.path.exists(REF_AUDIO) and ref_text_content:
                log.info("Creating default voice-lock v2 prompt from %s", REF_AUDIO)
                prompt = m.create_voice_clone_prompt(ref_audio=REF_AUDIO, ref_text=ref_text_content)
            _model = m
            _default_prompt = prompt
            try:
                get_whisper_pipe()
            except Exception as we:
                log.warning("Whisper pre-warm skipped: %s", we)
            return _model, _default_prompt
        except Exception as e:
            log.warning("OmniVoice model direct load failed: %s", e)
            return None, None

def get_prompt_for_ref(model, ref_path: str):
    stat = os.stat(ref_path)
    key = f"{ref_path}_{stat.st_mtime}"
    if key in _prompt_cache:
        return _prompt_cache[key]

    import soundfile as sf
    import numpy as np

    # Only read the first 4.0s from disk directly (super fast, even for large 50MB+ files)
    info = sf.info(ref_path)
    sr = info.samplerate
    max_frames = int(sr * 4.0)
    y, _ = sf.read(ref_path, frames=max_frames)
    if y.ndim > 1:
        y = np.mean(y, axis=1)
    trimmed_wav = y

    # Auto-transcribe with whisper-tiny (<1.5s)
    ref_text = ""
    try:
        pipe = get_whisper_pipe()
        res = pipe({"raw": trimmed_wav, "sampling_rate": sr}, generate_kwargs={"language": "vietnamese"})
        ref_text = res.get("text", "").strip()
    except Exception as e:
        log.warning("Whisper transcription error: %s", e)

    if not ref_text:
        ref_text = "xin chào bạn"

    log.info("Ref audio %s auto-transcribed: '%s'", os.path.basename(ref_path), ref_text)

    temp_wav = os.path.join(tempfile.gettempdir(), f"omniref_{int(time.time()*1000)}.wav")
    sf.write(temp_wav, trimmed_wav, sr)

    try:
        prompt = model.create_voice_clone_prompt(ref_audio=temp_wav, ref_text=ref_text)
        _prompt_cache[key] = prompt
        return prompt
    finally:
        if os.path.exists(temp_wav):
            try: os.remove(temp_wav)
            except Exception: pass

def parse_instruct(raw: str) -> str:
    """Parse Vietnamese or English voice descriptions into valid OmniVoice instruct tags."""
    if not raw or not raw.strip():
        return ""
    text = raw.lower().strip()
    matched = []

    # Gender
    if any(k in text for k in ["female", "nữ", "gái", "bà", "cô", "chị"]):
        matched.append("female")
    elif any(k in text for k in ["male", "nam", "trai", "ông", "anh", "chú"]):
        matched.append("male")

    # Age
    if any(k in text for k in ["child", "trẻ em", "em bé", "con nít"]):
        matched.append("child")
    elif any(k in text for k in ["teenager", "thiếu niên", "học sinh"]):
        matched.append("teenager")
    elif any(k in text for k in ["middle-aged", "trung niên", "bác"]):
        matched.append("middle-aged")
    elif any(k in text for k in ["elderly", "già", "ông cụ", "bà cụ"]):
        matched.append("elderly")
    elif any(k in text for k in ["young adult", "trẻ", "thanh niên", "cô gái", "chàng trai", "20", "25"]):
        matched.append("young adult")

    # Pitch
    if any(k in text for k in ["very low pitch", "rất trầm"]):
        matched.append("very low pitch")
    elif any(k in text for k in ["low pitch", "trầm ấm", "trầm", "ấm áp", "thấp"]):
        matched.append("low pitch")
    elif any(k in text for k in ["very high pitch", "rất cao"]):
        matched.append("very high pitch")
    elif any(k in text for k in ["high pitch", "cao", "trong trẻo", "thanh", "sáng"]):
        matched.append("high pitch")
    elif any(k in text for k in ["moderate pitch", "vừa", "trung bình"]):
        matched.append("moderate pitch")

    # Style
    if any(k in text for k in ["whisper", "thì thầm", "nhỏ nhẹ", "thì thào", "xúc động"]):
        matched.append("whisper")

    if not matched:
        return "young adult, moderate pitch"
    return ", ".join(matched)

def synthesize_with_edge_tts(text: str, output_path: str, speed: float = 1.2, voice: str = "vi-VN-NamMinhNeural", pitch: str = None) -> bool:
    """Fallback generator using edge-tts."""
    try:
        rate_pct = int(round((speed - 1.0) * 100))
        rate_str = f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"
        edge_cli = Path(r"D:\aivideo\OpenMontage\.venv\Scripts\edge-tts.exe")

        cmd = [
            str(edge_cli),
            "--voice", voice,
            f"--rate={rate_str}",
        ]
        if pitch and pitch != "+0Hz":
            cmd.extend(["--pitch", pitch])
        cmd.extend([
            "--text", text,
            "--write-media", str(output_path)
        ])
        res = subprocess.run(cmd, capture_output=True, timeout=60)
        return res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        log.error("Edge-TTS CLI synthesis error: %s", e)
        return False

def synthesize(text: str, speed: float = 1.2, language: str = "vi", custom_ref: str = None, instruct: str = None) -> bytes:
    """Synthesize voice with OmniVoice (Clone or Voice Design) or fallback."""
    model, default_prompt = get_omnivoice_model()
    if model is not None:
        try:
            import numpy as np
            import soundfile as sf
            from omnivoice.models.omnivoice import OmniVoiceGenerationConfig

            parsed_inst = parse_instruct(instruct) if instruct else None
            p = None
            if custom_ref and os.path.exists(custom_ref):
                try:
                    p = get_prompt_for_ref(model, custom_ref)
                except Exception as e:
                    log.warning("Failed custom prompt creation: %s, using default prompt", e)
            elif not parsed_inst:
                p = default_prompt

            gen_kwargs = {
                "text": text,
                "language": language,
                "speed": 1.0,
                "generation_config": OmniVoiceGenerationConfig(num_step=6)
            }
            if p is not None:
                gen_kwargs["voice_clone_prompt"] = p
            elif parsed_inst:
                log.info("Generating OmniVoice speech in Voice Design mode: instruct='%s'", parsed_inst)
                gen_kwargs["instruct"] = parsed_inst
            else:
                gen_kwargs["voice_clone_prompt"] = default_prompt

            audio = model.generate(**gen_kwargs)
            wav = np.asarray(audio[0]).reshape(-1)
            sr = getattr(model, "sampling_rate", 24000)

            buf = io.BytesIO()
            sf.write(buf, wav, sr, format="WAV", subtype="PCM_16")
            raw_bytes = buf.getvalue()

            # Speed adjustment with atempo if requested
            if abs(speed - 1.0) > 0.05:
                try:
                    r = subprocess.run(
                        ["ffmpeg", "-v", "error", "-y", "-f", "wav", "-i", "pipe:0", "-af", f"atempo={speed}", "-c:a", "pcm_s16le", "-f", "wav", "pipe:1"],
                        input=raw_bytes,
                        capture_output=True,
                        check=True
                    )
                    return r.stdout
                except Exception as e:
                    log.warning("ffmpeg atempo failed: %s", e)
            return raw_bytes
        except Exception as e:
            log.error("OmniVoice generation failed (%s), using Edge-TTS fallback", e)

    # Fallback via edge-tts
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_name = tmp.name
    try:
        fallback_voice = "vi-VN-NamMinhNeural"
        fallback_pitch = None
        if instruct:
            low_inst = instruct.lower()
            if any(k in low_inst for k in ["female", "nữ", "gái", "cô"]):
                fallback_voice = "vi-VN-HoaiMyNeural"
            if any(k in low_inst for k in ["low pitch", "trầm"]):
                fallback_pitch = "-20Hz"
            elif any(k in low_inst for k in ["high pitch", "cao"]):
                fallback_pitch = "+25Hz"

        ok = synthesize_with_edge_tts(text, tmp_name, speed=speed, voice=fallback_voice, pitch=fallback_pitch)
        if ok:
            with open(tmp_name, "rb") as f:
                return f.read()
        raise RuntimeError("Synthesis failed across all engines")
    finally:
        if os.path.exists(tmp_name):
            try: os.remove(tmp_name)
            except Exception: pass

def create_app():
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import Response
    from pydantic import BaseModel

    app = FastAPI(title="OmniVoice Local TTS Service")

    class TTSReq(BaseModel):
        text: str
        speed: float | None = None
        language: str | None = None
        instruct: str | None = None
        custom_ref: str | None = None

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "engine": "OmniVoice",
            "voice_mode": "clone",
            "voice_locked": True,
            "ref_audio": os.path.basename(REF_AUDIO),
            "speed": SPEED,
            "language": LANG,
            "qa_string": "OmniVoice · voice clone v2 · 1.2 · voice_locked:true"
        }

    @app.post("/tts")
    def tts_endpoint(req: TTSReq):
        text = req.text.strip()
        if not text:
            raise HTTPException(400, "Empty text")
        sp = req.speed or SPEED
        data = synthesize(text=text, speed=sp, language=req.language or LANG, custom_ref=req.custom_ref, instruct=req.instruct)
        import urllib.parse
        encoded_inst = urllib.parse.quote(req.instruct or "")
        return Response(
            content=data,
            media_type="audio/wav" if data[:4] == b"RIFF" else "audio/mpeg",
            headers={
                "X-Voice-Locked": "true",
                "X-Voice-Clone": os.path.basename(req.custom_ref or REF_AUDIO),
                "X-Voice-Instruct": encoded_inst,
                "X-Voice-Speed": str(sp)
            }
        )

    return app

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OmniVoice Voice-Lock v2 Service")
    parser.add_argument("--server", action="store_true", help="Start HTTP server on port")
    parser.add_argument("--port", type=int, default=PORT, help="Server port (default 8123)")
    parser.add_argument("--text", type=str, help="Text to synthesize (CLI mode)")
    parser.add_argument("--output", type=str, help="Output audio file path")
    parser.add_argument("--ref", type=str, default=None, help="Custom reference audio path")
    parser.add_argument("--speed", type=float, default=SPEED, help="Speech rate (default 1.2)")
    args = parser.parse_args()

    if args.server:
        import uvicorn
        log.info("Pre-warming OmniVoice model and Whisper pipe before starting server...")
        try:
            get_omnivoice_model()
            get_whisper_pipe()
            log.info("Pre-warm complete! OmniVoice and Whisper ready in memory.")
        except Exception as pwe:
            log.warning("Pre-warm had warning: %s", pwe)
        app = create_app()
        log.info("Starting OmniVoice server on 127.0.0.1:%d...", args.port)
        uvicorn.run(app, host="127.0.0.1", port=args.port)
    elif args.text and args.output:
        log.info("CLI mode: synthesizing '%s' -> %s", args.text[:50], args.output)
        data = synthesize(args.text, speed=args.speed, custom_ref=args.ref)
        Path(args.output).write_bytes(data)
        log.info("Saved %d bytes to %s", len(data), args.output)
    else:
        parser.print_help()
