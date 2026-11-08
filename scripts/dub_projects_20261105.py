"""Create reusable, individually timed local OmniVoice dialogue and dub existing videos.
No paid video/API calls. Original media is kept. Restart reuses completed files.
"""
import concurrent.futures, csv, hashlib, json, pathlib, shutil, sqlite3, subprocess, time, urllib.request, uuid, wave
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'outputs/voice-fix-20261105'
FILM='prj_06d6f1c9496a'; MAT='prj_8693b254f1db'
SEEDS={'male':OUT/'thang-voice-seed.wav','female':OUT/'linh-voice-test.wav','secretary':OUT/'linh-voice-test.wav','sales':OUT/'linh-voice-test.wav'}

def line(s,a,b,text):return {'speaker':s,'start':a,'end':b,'text':text}
INTRO=[line('male',3.1,4.3,'Linh?'),line('female',5.9,7.7,'Ơ… anh Thắng.'),line('male',8.1,9.8,'Sao em ngồi đây?'),line('female',10.1,12.5,'Em ra hóng gió tí.')]
SCENES=[
 (FILM,'generate-j4er7l','01 · Gặp nhau bên sông',INTRO),
 (FILM,'generate-7k2q4l','01B · Bản Mini',[
  line('male',5.2,6.6,'Linh?'),line('female',8.0,9.5,'Ơ… anh Thắng.'),line('male',9.7,11.6,'Sao em ngồi đây?'),line('female',11.8,14.4,'Em ra hóng gió tí.')]),
 (FILM,'generate-8jqcdi','02 · Câu chuyện với bố',[
  line('female',0.2,2.55,'Em vừa cãi nhau với bố.'),line('male',3.0,4.3,'Chuyện gì thế?'),
  line('female',6.0,9.5,'Bố muốn em lấy người em không thích.'),line('male',10.05,12.0,'Em nói với bố chưa?'),line('female',12.3,14.8,'Nói rồi… bố không nghe.')]),
 (FILM,'generate-4kbc7i','03 · Ngồi lại cùng em',[
  line('male',0.05,1.85,'Thế giờ em tính sao?'),line('female',2.05,4.25,'Em chưa biết. Chưa muốn về.'),
  line('male',4.65,6.8,'Ừ, ngồi thêm tí cũng được.'),line('female',7.75,9.35,'Anh không bận à?'),
  line('male',9.6,11.65,'Không. Anh ngồi với em.'),line('female',12.1,14.15,'Cho em tựa nhờ nhé?'),line('male',14.2,14.85,'Ừ.')]),
 (FILM,'generate-4twob5','04 · Từ bờ sông đến phòng họp',[
  line('male',0.15,2.1,'Đi trốn với anh không?'),line('female',5.85,7.45,'Để em nấu đã!'),
  line('secretary',9.8,12.45,'Thưa Tổng giám đốc, hợp đồng đây ạ.'),line('male',13.25,14.95,'Được, bắt đầu thôi.')]),
 (FILM,'generate-76efe2','05 · Bắt đầu họp', [line('male',3.75,5.85,'Bắt đầu họp thôi.')]),
 (MAT,'omni-1','01 · Giới thiệu chiếu',[
  line('sales',0.12,9.8,'Chị em đang tìm chiếu trải lên nệm mà sợ bị xô lệch, nhìn mẫu này với em nha! Chiếu mây lót đệm, dùng được hai mặt, có chun góc, giá từ hai trăm tám mươi nghìn thôi ạ!')]),
 (MAT,'omni-2','02 · Mặt cói và viền',[
  line('sales',0.12,9.8,'Đây, em đưa sát máy cho chị em nhìn rõ. Mẫu này thường gọi là chiếu mây, còn bề mặt là sợi cói. Màu nâu dễ phối với phòng ngủ, phần viền được may bao quanh.')]),
]

def db():return sqlite3.connect(ROOT/'data/studio.db',timeout=30)
def dump(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
def run(cmd):return subprocess.run(cmd,check=True,capture_output=True)
def duration(p):return float(json.loads(run(['ffprobe','-v','quiet','-show_format','-of','json',str(p)]).stdout)['format']['duration'])
def key(c):return hashlib.sha256((c['speaker']+'|'+c['text']).encode()).hexdigest()[:16]
def local(url):
 if not url.startswith('/api/files/'):raise ValueError('Only existing local media allowed')
 p=(ROOT/'data/assets'/url.removeprefix('/api/files/')).resolve()
 if not p.is_relative_to((ROOT/'data/assets').resolve()):raise ValueError('Invalid asset path')
 return p

def synth(c):
 k=key(c);raw=OUT/f'voice-{k}-raw.wav';trim=OUT/f'voice-{k}.wav'
 if trim.exists() and trim.stat().st_size>1000:return
 if not raw.exists():
  payload={'text':c['text'],'speed':1.0,'language':'vi','custom_ref':str(SEEDS[c['speaker']].resolve())}
  req=urllib.request.Request('http://127.0.0.1:8123/tts',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
  with urllib.request.urlopen(req,timeout=300) as r:data=r.read()
  if data[:4]!=b'RIFF':raise RuntimeError('Local OmniVoice did not return WAV; refusing mislabeled fallback')
  raw.write_bytes(data)
 run(['ffmpeg','-y','-i',str(raw),'-af','silenceremove=start_periods=1:start_duration=0.035:start_threshold=-48dB:stop_periods=-1:stop_duration=0.18:stop_threshold=-48dB','-ar','48000','-ac','1','-c:a','pcm_s16le',str(trim)])
 print('VOICE_READY',c['speaker'],c['text'],round(duration(trim),2),flush=True)

def add_asset(c,pid,src,name,kind,meta):
 a='asset_'+uuid.uuid4().hex[:12];dst=ROOT/'data/assets'/pid/(a+src.suffix)
 dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
 mime='video/mp4' if kind=='video' else 'audio/wav'
 obj={'id':a,'projectId':pid,'name':name,'kind':kind,'mime':mime,'url':f'/api/files/{pid}/{dst.name}','createdAt':int(time.time()*1000),'size':dst.stat().st_size,'duration':duration(dst)}
 c.execute('insert into assets values(?,?,?,?,?,?,?,?)',(a,pid,name,kind,mime,obj['url'],json.dumps(meta,ensure_ascii=False),obj['createdAt']))
 return obj

def dub(s):
 pid,nid,name,cues=s;directory=OUT/nid;directory.mkdir(exist_ok=True)
 with db() as c:g=json.loads(c.execute('select data from graphs where project_id=?',(pid,)).fetchone()[0])
 n=next(n for n in g['nodes'] if n['id']==nid);source=local(n['data']['videoUrl']);length=duration(source)
 samples=np.zeros(int(np.ceil(length*48000)),dtype=np.float32)
 log=[]
 for cue in cues:
  src=OUT/f'voice-{key(cue)}.wav';d=duration(src);window=cue['end']-cue['start']-.04
  # Keep natural pace: slowing is limited; never cut a final word to fit.
  speed=max(.82,d/window) if d>window else max(.82,d/(window*.84))
  if speed>1.4:raise RuntimeError(f'Line too long for natural speech: {nid} {cue["text"]} ({speed:.2f}x)')
  fit=directory/f'{len(log):02d}-fitted.wav'
  run(['ffmpeg','-y','-i',str(src),'-af',f'atempo={speed:.6f},highpass=f=75,lowpass=f=13000,loudnorm=I=-19:TP=-2:LRA=7,afade=t=in:d=0.012','-ar','48000','-ac','1','-c:a','pcm_s16le',str(fit)])
  with wave.open(str(fit),'rb') as w:y=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
  start=round(cue['start']*48000)
  if start+len(y)>round(cue['end']*48000)+2400:raise RuntimeError('Dialogue extends past its assigned window')
  # A short end fade prevents clicks without clipping consonants.
  fade=min(384,len(y)//10);y[-fade:]*=np.linspace(1,0,fade)
  samples[start:start+len(y)]+=y
  log.append({**cue,'actualEnd':round(cue['start']+len(y)/48000,3),'speed':round(speed,4),'voiceKey':key(cue),'engine':'OmniVoice local clone','sourceAudio':str(src)})
 peak=float(np.max(np.abs(samples)))
 if peak>.94:samples*=.94/peak
 stem=directory/'dialogue.wav'
 with wave.open(str(stem),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes((samples*32767).astype(np.int16).tobytes())
 result=directory/'dubbed.mp4'
 # Replace original AI speech rather than layering a second voice over it.
 run(['ffmpeg','-y','-i',str(source),'-i',str(stem),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',str(length),'-movflags','+faststart',str(result)])
 dump(directory/'timeline.json',{'projectId':pid,'sourceNodeId':nid,'sourceVideo':str(source),'duration':length,'cues':log,'originalAudioReplaced':True,'lipAnimationRegenerated':False})
 print('DUBBED',nid,round(length,2),flush=True)
 return {'projectId':pid,'sourceNodeId':nid,'name':name,'duration':length,'video':str(result),'audio':str(stem),'cues':log}

def import_results(results):
 # Save an import manifest first; rerunning only reuses these assets.
 manifest=OUT/'imported-assets.json'
 if manifest.exists():return json.loads(manifest.read_text(encoding='utf8'))
 imported=[]
 with db() as c:
  for pid in [FILM,MAT]:
   row=c.execute('select data from graphs where project_id=?',(pid,)).fetchone();g=json.loads(row[0]);dump(OUT/(pid+'-before-import.json'),g)
   lane=max(n['position'].get('y',0) for n in g['nodes'])+650
   selected=[r for r in results if r['projectId']==pid]
   for i,r in enumerate(selected):
    meta={'sourceNodeId':r['sourceNodeId'],'engine':'OmniVoice local clone','cues':r['cues'],'originalAudioReplaced':True,'lipAnimationRegenerated':False}
    a=add_asset(c,pid,pathlib.Path(r['audio']),'Voice · '+r['name'],'audio',meta)
    v=add_asset(c,pid,pathlib.Path(r['video']),'Đã lồng tiếng · '+r['name'],'video',meta)
    an='dub-audio-'+r['sourceNodeId'];vn='dub-video-'+r['sourceNodeId']
    g['nodes'].extend([
     {'id':vn,'type':'result','position':{'x':i*400,'y':lane},'data':{'name':v['name'],'result':v,'videoUrl':v['url'],'status':'done','text':'Giọng OmniVoice mới; hình ảnh gốc được giữ nguyên.'}},
     {'id':an,'type':'audio','position':{'x':i*400,'y':lane+350},'data':{'name':a['name'],'result':a,'audioUrl':a['url'],'status':'done','text':'\n'.join(f"{q['start']:.2f}–{q['actualEnd']:.2f}s [{q['speaker']}]: {q['text']}" for q in r['cues']),'engine':'OmniVoice local clone','speed':1.0,'voice':'omnivoice_custom'}}
    ])
    g['edges'].append({'id':'e-'+an+'-'+vn,'source':an,'target':vn,'sourceHandle':'out','targetHandle':'in','data':{}})
    imported.append({**r,'audioAsset':a,'videoAsset':v})
   c.execute('update graphs set data=?,updated_at=? where project_id=?',(json.dumps(g,ensure_ascii=False),int(time.time()*1000),pid))
 dump(manifest,imported);return imported

def final_movie(imported,pid,ids,name):
 chosen=[next(x for x in imported if x['sourceNodeId']==nid) for nid in ids]
 files=[];offset=0;timeline=[]
 directory=OUT/('film' if pid==FILM else 'chieu');directory.mkdir(exist_ok=True)
 for i,r in enumerate(chosen):
  dest=directory/f'{i:02d}-norm.mp4'
  run(['ffmpeg','-y','-i',r['video'],'-vf',('scale=1280:720,setsar=1,fps=24' if pid==FILM else 'scale=720:1280,setsar=1,fps=24'),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2',str(dest)])
  files.append(dest)
  for q in r['cues']:timeline.append({**q,'sourceNodeId':r['sourceNodeId'],'globalStart':round(offset+q['start'],3),'globalEnd':round(offset+q['actualEnd'],3)})
  offset+=duration(dest)
 listing=directory/'concat.txt';listing.write_text(''.join("file '"+str(x).replace('\\','/')+"'\n" for x in files),encoding='utf8')
 final=directory/(('Khoi-dau-moi' if pid==FILM else 'Chieu-may-20s')+'-long-tieng.mp4')
 run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(final)])
 dump(directory/'timeline.json',timeline)
 with open(directory/'timeline.csv','w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=['globalStart','globalEnd','speaker','text','sourceNodeId']);w.writeheader();w.writerows({k:q[k] for k in w.fieldnames} for q in timeline)
 with db() as c:
  a=add_asset(c,pid,final,name,'video',{'engine':'OmniVoice local clone','timeline':timeline,'originalAudioReplaced':True})
  g=json.loads(c.execute('select data from graphs where project_id=?',(pid,)).fetchone()[0]);maxy=max(n['position']['y'] for n in g['nodes'])
  g['nodes'].append({'id':'dub-final-20261105','type':'result','position':{'x':len(chosen)*400+100,'y':maxy-350},'data':{'name':name,'result':a,'videoUrl':a['url'],'status':'done'}})
  c.execute('update graphs set data=?,updated_at=? where project_id=?',(json.dumps(g,ensure_ascii=False),int(time.time()*1000),pid))
 dump(directory/'final-asset.json',a);print('FINAL',str(final),round(duration(final),2),flush=True)

def main():
 OUT.mkdir(exist_ok=True,parents=True)
 dump(OUT/'dialogue-plan.json',[{'projectId':s[0],'nodeId':s[1],'name':s[2],'cues':s[3]} for s in SCENES])
 unique={key(q):q for s in SCENES for q in s[3]}
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  futures=[pool.submit(synth,q) for q in unique.values()]
  for f in concurrent.futures.as_completed(futures):f.result()
 results=[dub(s) for s in SCENES];dump(OUT/'dubbed-results.json',results)
 imported=import_results(results)
 final_movie(imported,FILM,['generate-j4er7l','generate-8jqcdi','generate-4kbc7i','generate-4twob5','generate-76efe2'],'KHỞI ĐẦU MỚI · Bản lồng tiếng')
 final_movie(imported,MAT,['omni-1','omni-2'],'CHIẾU MÂY · 20s đã lồng tiếng')

if __name__=='__main__':main()
