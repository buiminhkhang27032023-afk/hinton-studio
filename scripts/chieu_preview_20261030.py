"""Two explicitly requested Omni shots. Never resubmit a saved request."""
import json, pathlib, shutil, sqlite3, time, uuid, urllib.request, urllib.error, subprocess, sys

BASE=pathlib.Path(__file__).resolve().parent.parent
OUT=BASE/'outputs/chieu-preview-20261030'
MANIFEST=OUT/'project.json'
MODEL='iooai:omni_flash_10s'
GENERATED=pathlib.Path('C:/Users/Chen Qianyu/.codex/generated_images/01a16655-fc90-7753-99e6-154ccdc78079/exec-beff3c93-6bcd-4a1e-90cd-5a1cdc0aaefa.png')
COMMON=('Vertical Vietnamese product demonstration, 10 seconds, one continuous stable shot. '
 'Use the single reference image as first frame and exact identity, wardrobe, bedroom and product reference. '
 'Only one adult woman, standing upright in powder blue blouse and cream trousers. '
 'Preserve her face, long dark wavy hair and exact reddish brown woven sedge mat, brown stitched gold-pattern border. '
 'Realistic flexible padded bedding mat, not rigid bamboo. Natural hands, five fingers, sharp face AND weave, '
 'deep depth of field, no focus hunting or motion blur. She speaks directly to camera in a friendly clear Vietnamese female voice, '
 'natural conversational sales delivery, lip sync to exact Vietnamese dialogue below, start immediately and finish by 9.6 seconds. '
 'No music, no subtitles, no added text, no logos, no extra people. ')
SHOTS=[
 ('omni-1','01 · Giới thiệu chiếu · 10s',COMMON+
  'From 0–3s she holds the folded mat horizontally at waist level and lifts its woven surface slightly toward camera without hiding her face. '
  '3–10s she supports it with both hands and shows the border, friendly eye contact. '
  'Say exactly: "Chị em đang tìm chiếu trải lên nệm mà sợ bị xô lệch, nhìn mẫu này với em nha! Chiếu mây lót đệm, dùng được hai mặt, có chun góc, giá từ hai trăm tám mươi nghìn thôi ạ!"'),
 ('omni-2','02 · Cận mặt cói và viền · 10s',COMMON+
  'Slightly tighter product framing with her face still fully visible. She gently brings one section closer to lens, '
  'then slowly strokes the woven surface once with her open right hand while left hand supports the folded mat, '
  'and indicates the stitched edge without covering its detail. No unfolding or transforming the mat. '
  'Say exactly: "Đây, em đưa sát máy cho chị em nhìn rõ. Mẫu này thường gọi là chiếu mây, còn bề mặt là sợi cói. Màu nâu dễ phối với phòng ngủ, phần viền được may bao quanh."')]

def db(): return sqlite3.connect(BASE/'data/studio.db',timeout=30)
def save(p,x): p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf8')
def asset(c,pid,src,name,kind='image'):
 aid='asset_'+uuid.uuid4().hex[:12]; dest=BASE/'data/assets'/pid/(aid+src.suffix)
 dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
 a={'id':aid,'projectId':pid,'name':name,'kind':kind,'mime':'video/mp4' if kind=='video' else 'image/png' if src.suffix=='.png' else 'image/jpeg',
    'url':f'/api/files/{pid}/{dest.name}','createdAt':int(time.time()*1000)}
 c.execute('insert into assets values(?,?,?,?,?,?,?,?)',(aid,pid,name,kind,a['mime'],a['url'],json.dumps({'source':'built-in imagegen' if src==GENERATED else 'user-reference'}),a['createdAt']))
 return a

def setup():
 OUT.mkdir(parents=True,exist_ok=True)
 if MANIFEST.exists(): return json.loads(MANIFEST.read_text(encoding='utf8'))
 pid='prj_'+uuid.uuid4().hex[:12];now=int(time.time()*1000)
 with db() as c:
  c.execute('insert into projects values(?,?,NULL,?,?)',(pid,'Chiếu mây lót đệm · Bản thử 20s',now,now))
  ref=asset(c,pid,pathlib.Path('C:/Users/Chen Qianyu/AppData/Local/Temp/codex-clipboard-0322e519-03a1-477b-a3b1-6ea8c3337ae1.png'),'Nhân vật gốc')
  product=asset(c,pid,OUT/'product-front.jpg','Chiếu thật · từ video mẫu')
  photo=asset(c,pid,GENERATED,'Nhân vật áo xanh · ảnh tạo trong chat')
  shutil.copy2(GENERATED,OUT/'nhan-vat-cam-chieu.png')
  nodes=[];edges=[]
  for nid,a,x,y in [('character',ref,0,0),('product',product,0,440),('photo',photo,350,0)]:
   nodes.append({'id':nid,'type':'image','position':{'x':x,'y':y},'data':{'name':a['name'],'imageUrl':a['url'],'result':a,'status':'done','aspect':'9:16'}})
  for i,(nid,name,prompt) in enumerate(SHOTS):
   nodes.append({'id':nid,'type':'video','position':{'x':720,'y':i*440},'data':{'name':name,'prompt':prompt,'modelId':MODEL,'duration':10,'aspect':'9:16','resolution':'720p','status':'idle'}})
   edges.append({'id':'e-photo-'+nid,'source':'photo','target':nid,'sourceHandle':'out','targetHandle':'in','data':{}})
  nodes.append({'id':'script','type':'text','position':{'x':350,'y':500},'data':{'name':'Kịch bản bản thử · 20s','text':'0–10s: Cầm chiếu giới thiệu hai mặt, chun góc, giá từ 280.000đ.\n10–20s: Đưa gần, vuốt bề mặt cói và chỉ đường viền.\nBản đầy đủ dự kiến 90s; chưa tạo phần tiếp theo.','status':'done'}})
  graph={'nodes':nodes,'edges':edges,'viewport':{'x':70,'y':45,'zoom':0.68}}
  c.execute('insert into graphs values(?,?,?)',(pid,json.dumps(graph,ensure_ascii=False),now))
  c.execute('update projects set thumbnail=? where id=?',(photo['url'],pid))
 plan={'projectId':pid,'image':photo,'modelId':MODEL,'maxSubmissions':2,'listedTotalCny':1.6,'shots':[]}
 for nid,name,prompt in SHOTS:
  plan['shots'].append({'nodeId':nid,'name':name,'requestId':uuid.uuid4().hex,'prompt':prompt})
 save(MANIFEST,plan); print('CREATED',pid,flush=True);return plan

def graph_result(plan,shot,result):
 with db() as c:
  g=json.loads(c.execute('select data from graphs where project_id=?',(plan['projectId'],)).fetchone()[0])
  for n in g['nodes']:
   if n['id']==shot['nodeId']:
    n['data'].update({'status':'done' if result.get('output') else 'error','error':result.get('error')})
    if result.get('output'): n['data'].update({'result':result['output'],'videoUrl':result['output']['url']})
  c.execute('update graphs set data=?,updated_at=? where project_id=?',(json.dumps(g,ensure_ascii=False),int(time.time()*1000),plan['projectId']))

def run(plan):
 for shot in plan['shots']:
  path=OUT/(shot['nodeId']+'-response.json')
  key=f"{plan['projectId']}:{shot['nodeId']}:{shot['requestId']}"
  with db() as c: old=c.execute('select id,status from jobs where request_key=?',(key,)).fetchone()
  if path.exists() or old:
   print('NOT RESUBMITTING',shot['nodeId'],old,flush=True);continue
  token=uuid.uuid4().hex
  approval={'token':token,'remaining':1,'expiresAt':int(time.time()*1000)+300000,'modelId':MODEL,'projectId':plan['projectId'],'nodeId':shot['nodeId']}
  with db() as c:
   c.execute("insert into settings values('generation_approval',?) on conflict(key) do update set value=excluded.value",(json.dumps(approval),))
  payload={'modelId':MODEL,'projectId':plan['projectId'],'nodeId':shot['nodeId'],'requestId':shot['requestId'],'name':shot['name'],'kind':'video',
    'vars':{'prompt':shot['prompt'],'duration':10,'seconds':'10','aspect':'9:16','resolution':'720p','images':[plan.get('publicImageUrl') or plan['image']['url']]}}
  save(OUT/(shot['nodeId']+'-input.json'),payload)
  print('SUBMIT ONCE',shot['nodeId'],flush=True)
  try:
   req=urllib.request.Request('http://127.0.0.1:3210/api/run',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','x-generation-approval':token})
   try:
    with urllib.request.urlopen(req,timeout=2800) as r: result=json.load(r)
   except urllib.error.HTTPError as e: result=json.load(e)
   save(path,result);graph_result(plan,shot,result)
   print(json.dumps({'node':shot['nodeId'],'jobId':result.get('jobId'),'success':bool(result.get('output')),'error':result.get('error')},ensure_ascii=False),flush=True)
   if not result.get('output'):
    print('STOP: no extra paid calls after error.',flush=True);return
  finally:
   with db() as c:
    r=c.execute("select value from settings where key='generation_approval'").fetchone()
    if r and json.loads(r[0]).get('token')==token:c.execute("delete from settings where key='generation_approval'")
 assemble(plan)

def assemble(plan):
 clips=[]
 for s in plan['shots']:
  p=OUT/(s['nodeId']+'-response.json')
  if not p.exists():return
  a=json.loads(p.read_text(encoding='utf8')).get('output')
  if not a:return
  src=BASE/'data/assets'/plan['projectId']/a['url'].split('/')[-1]
  info=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-of','json',str(src)]))
  hasaudio=any(x['codec_type']=='audio' for x in info['streams'])
  print('MEDIA',s['nodeId'],'audio',hasaudio,flush=True)
  norm=OUT/(s['nodeId']+'-normalized.mp4')
  cmd=['ffmpeg','-y','-i',str(src)]
  if not hasaudio:cmd+=['-f','lavfi','-i','anullsrc=r=48000:cl=stereo']
  cmd+=['-t','10','-vf','scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,fps=24','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2',str(norm)]
  subprocess.run(cmd,check=True,capture_output=True);clips.append(norm)
 listing=OUT/'concat.txt';listing.write_text(''.join("file '"+str(p).replace('\\','/')+"'\n" for p in clips),encoding='utf8')
 final=OUT/'Chieu-may-ban-thu-20s.mp4'
 subprocess.run(['ffmpeg','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(final)],check=True,capture_output=True)
 with db() as c:
  a=asset(c,plan['projectId'],final,'Chiếu mây · Bản xem trước 20s','video')
  g=json.loads(c.execute('select data from graphs where project_id=?',(plan['projectId'],)).fetchone()[0])
  g['nodes']=[n for n in g['nodes'] if n['id']!='preview-final']
  g['nodes'].append({'id':'preview-final','type':'result','position':{'x':1100,'y':170},'data':{'name':'BẢN XEM TRƯỚC · 20 GIÂY','result':a,'videoUrl':a['url'],'status':'done'}})
  c.execute('update graphs set data=?,updated_at=? where project_id=?',(json.dumps(g,ensure_ascii=False),int(time.time()*1000),plan['projectId']))
 save(OUT/'final-asset.json',a);print('FINISHED',str(final),flush=True)

if __name__=='__main__':
 p=setup()
 if '--run' in sys.argv:run(p)
 elif '--assemble' in sys.argv:assemble(p)
