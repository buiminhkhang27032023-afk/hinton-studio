"""Local-only assembly. Requires exactly the four authorized new outputs."""
import json
import pathlib
import shutil
import sqlite3
import subprocess
import time
import uuid

BASE = pathlib.Path(__file__).resolve().parent.parent
OUT = BASE / 'outputs' / 'film-final-20261028'


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))


def main():
    plan = json.loads((OUT / 'approved-batch.json').read_text(encoding='utf8'))
    project = plan['projectId']
    db = sqlite3.connect(BASE / 'data' / 'studio.db', timeout=30)
    db.row_factory = sqlite3.Row
    previous = OUT / 'final-asset.json'
    if previous.exists():
        print(previous.read_text(encoding='utf8'))
        return
    clips = []
    for scene in plan['scenes']:
        key = f"{project}:{scene['nodeId']}:{scene['requestId']}"
        row = db.execute('select id,status,output,error from jobs where request_key=?', (key,)).fetchone()
        if not row or row['status'] != 'succeeded' or not row['output']:
            raise SystemExit(f"Not ready: {scene['nodeId']}: {dict(row) if row else 'missing'}. No generation request sent.")
        asset = json.loads(row['output'])
        path = BASE / 'data' / 'assets' / project / pathlib.Path(asset['url']).name
        info = probe(path)
        if float(info['format']['duration']) < 14:
            raise SystemExit(f"Unexpected short output: {scene['nodeId']}; refusing to substitute an old clip.")
        clips.append((scene, asset, path, info))
    command = ['ffmpeg', '-hide_banner', '-loglevel', 'warning', '-y']
    for _, _, path, _ in clips:
        command += ['-i', str(path)]
    filters = []
    for i, (_, _, _, info) in enumerate(clips):
        filters.append(f'[{i}:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,fps=24,tpad=stop_mode=clone:stop_duration=1,trim=duration=15,setpts=PTS-STARTPTS[v{i}]')
        audio = f'[{i}:a]' if any(s['codec_type'] == 'audio' for s in info['streams']) else 'anullsrc=r=48000:cl=stereo,'
        filters.append(f'{audio}aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=duration=15,asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st=14.95:d=0.05[a{i}]')
    filters.append(''.join(f'[v{i}][a{i}]' for i in range(4)) + 'concat=n=4:v=1:a=1[v][a]')
    filters.append('[a]loudnorm=I=-16:TP=-1.5:LRA=11[normalized]')
    master = OUT / 'Chiec-O-De-Quen-60s.mp4'
    command += ['-filter_complex', ';'.join(filters), '-map', '[v]', '-map', '[normalized]', '-c:v', 'libx264', '-preset', 'fast',
                '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', str(master)]
    subprocess.run(command, check=True)
    info = probe(master)
    duration = float(info['format']['duration'])
    if abs(duration - 60) > .15:
        raise SystemExit(f'Unexpected master length: {duration}; no project changes made.')
    aid = 'asset_' + uuid.uuid4().hex[:12]
    filename = aid + '-chiec-o-de-quen-60s-final.mp4'
    shutil.copy2(master, BASE / 'data' / 'assets' / project / filename)
    now = int(time.time()*1000)
    meta = {'source': 'local:ffmpeg', 'duration': duration, 'scenes': [a['id'] for _, a, _, _ in clips], 'new_identity_keyframes': True}
    asset = {'id': aid, 'projectId': project, 'name': 'Chiếc Ô Để Quên — bản hoàn chỉnh 60s', 'kind': 'video', 'mime': 'video/mp4',
             'url': f'/api/files/{project}/{filename}', 'size': master.stat().st_size, 'duration': duration, 'meta': meta, 'createdAt': now}
    db.execute('insert into assets(id,project_id,name,kind,mime,url,meta,created_at) values(?,?,?,?,?,?,?,?)',
               (aid, project, asset['name'], 'video', 'video/mp4', asset['url'], json.dumps(meta), now))
    graph = json.loads(db.execute('select data from graphs where project_id=?', (project,)).fetchone()[0])
    for i, (scene, clip, _, _) in enumerate(clips, 1):
        for node in graph['nodes']:
            if node['id'] in [scene['nodeId'], f'result-{i}']:
                node['data'].update({'status': 'done', 'error': None, 'result': clip, 'videoUrl': clip['url'], 'identityNeedsReview': False})
    final = next((node for node in graph['nodes'] if node['id'] == 'movie-final-60s'), None)
    if not final:
        final = {'id': 'movie-final-60s', 'type': 'result', 'position': {'x': 2240, 'y': 520}, 'data': {}}
        graph['nodes'].append(final)
    final['data'].update({'name': 'Phim hoàn chỉnh · 60 giây', 'status': 'done', 'result': asset, 'videoUrl': asset['url'], 'error': None})
    for i in range(1, 5):
        edge_id = f'e-final-movie-{i}'
        if not any(e['id'] == edge_id for e in graph.get('edges', [])):
            graph.setdefault('edges', []).append({'id': edge_id, 'source': f'video-{i}', 'target': final['id'], 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {}})
    for node in graph['nodes']:
        if node['id'] == 'verify_low_cost_20261028':
            node['data']['name'] = 'Kiểm thử cũ · không dùng trong phim'
    db.execute('update graphs set data=?,updated_at=? where project_id=?', (json.dumps(graph, ensure_ascii=False), now, project))
    db.execute('update projects set updated_at=? where id=?', (now, project))
    db.execute("delete from settings where key='generation_approval'")
    db.commit()
    previous.write_text(json.dumps(asset, ensure_ascii=False, indent=2), encoding='utf8')
    print(json.dumps({'url': asset['url'], 'duration': duration, 'path': str(master)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
