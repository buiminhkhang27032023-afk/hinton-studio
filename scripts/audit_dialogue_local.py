"""Read-only ASR using the locally cached Whisper model; no model downloads."""
import json,pathlib,sys,wave,time
import numpy as np
import torch
from transformers import pipeline

torch.set_num_threads(6)
root=pathlib.Path(__file__).resolve().parent.parent
out=root/'outputs/voice-fix-20261105'
model='C:/Users/Chen Qianyu/.cache/huggingface/hub/models--openai--whisper-tiny/snapshots/169d4a4341b33bc18d8881c4b69c2e104e1cc0af'
asr=pipeline('automatic-speech-recognition',model=model,device='cpu')
for f in out.glob('*-source.wav'):
 target=f.with_suffix('.asr.json')
 if target.exists(): continue
 with wave.open(str(f),'rb') as w: samples=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
 r=asr({'raw':samples,'sampling_rate':16000},return_timestamps=True,generate_kwargs={'language':'vi','task':'transcribe'})
 target.write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf8')
 print(f.name,json.dumps(r,ensure_ascii=False),flush=True)
