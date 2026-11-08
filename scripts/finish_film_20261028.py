"""One authorized four-scene batch. POSTs only new request IDs, never retries."""
import concurrent.futures
import json
import pathlib
import sqlite3
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = pathlib.Path(__file__).resolve().parent.parent
OUT = BASE / 'outputs' / 'film-final-20261028'
PROJECT = 'prj_1507511d78c4'
MODEL = 'iooai:seedance20-line2'
PLAN = OUT / 'approved-batch.json'

COMMON = (
    'Phim ngắn tình cảm Việt Nam, người thật, dọc 9:16, 15 giây. '
    '@图1 là khung hình chính của cảnh: bám đúng bố cục, trang phục, ánh sáng và đạo cụ. '
    '@图2 là ảnh gốc của LINH; @图3 là ảnh gốc của NAM. Các góc trong cùng ảnh ghép là cùng một người, không phải nhiều người. '
    'Giữ nguyên khuôn mặt, kiểu tóc, màu da và vóc dáng từng nhân vật. Linh có mái thưa, tóc nâu dài gợn sóng; '
    'mặc cardigan kem, áo trắng, váy midi xanh nhạt, giày bệt kem, túi vải be. '
    'Nam giữ đúng gương mặt ảnh gốc, tóc ngắn đen, sơ mi xanh nhạt xắn tay, quần tây xám, giày đen và đồng hồ bạc. '
    'Không đổi diễn viên hoặc làm đẹp lại mặt. Quán cà phê cũ cạnh trạm xe buýt Hà Nội, mái hiên xanh, chiều mưa, '
    'đèn quán vàng ấm, mặt đường phản chiếu ánh đèn. Chiếc ô navy có duy nhất một miếng vá nhỏ màu be hình đám mây. '
    'Máy quay ổn định, chuyển động nhẹ, không đảo góc vô cớ; giữ hướng vị trí hai người nhất quán. '
    'Lời thoại tiếng Việt giọng miền Bắc, tự nhiên, khẩu hình khớp người nói; chỉ một người nói mỗi lượt. '
    'Tiếng mưa đều và âm thanh môi trường. Không nhạc nền, no music, no background score, do not generate music. '
    'Không phụ đề, không chữ, không logo, không thêm người ở tiền cảnh. '
)
SCENES = [
    ('video-1', 'Mái hiên và chiếc ô',
     '0–5s: Linh đứng dưới mái hiên như @图1, mở túi vải, nhìn cuốn sách bên trong rồi khẽ thở dài. Xe buýt tiến tới ở hậu cảnh. '
     '5–10s: Nam từ mép phải khung hình bước đến, mở chiếc ô navy bên cạnh cô, đứng cách cô một bước và đưa cán ô về phía cô. '
     'Nam nói nhỏ: "Ô của em." '
     '10–15s: Linh quay nhìn Nam rồi ngước lên miếng vá đám mây trên ô, ánh mắt nhận ra kỷ niệm. Không ô thứ hai, không thêm người.'),
    ('video-2', 'Miếng vá và tấm vé',
     '0–4s: Bắt đầu đúng @图1, Linh chạm miếng vá trên tán ô rồi từ từ hạ tay. Nam giữ ô vững. '
     'Linh khẽ nói: "Em tưởng anh bỏ rồi." Nam đáp: "Nó chỉ rách một chút." '
     '4–9s: Hai người nhìn nhau, im lặng ngắn; Nam lấy một tấm vé tàu cũ gấp đôi từ túi áo. '
     '9–15s: Nam nhìn tấm vé rồi nhìn Linh và nói trầm: "Hôm đó anh đã đi." Ngừng một nhịp. '
     'Nam nói tiếp: "Nhưng lẽ ra anh phải nói với em." Diễn xuất kìm nén, không khóc hoặc cười lớn.'),
    ('video-3', 'Lời xin lỗi',
     '0–5s: Bắt đầu theo @图1, Nam đưa tấm vé nhưng Linh không nhận. Linh nhìn về xe buýt bên kia đường và nói: "Em đã chờ một cuộc gọi." '
     'Nam đáp nhỏ: "Anh biết. Anh xin lỗi." '
     '5–10s: Nam cất tấm vé lại túi áo, lùi nửa bước. Xe buýt đóng cửa và từ từ rời trạm ở hậu cảnh. '
     '10–15s: Linh bước một bước tới mép hiên. Nam đưa cán ô cho cô và nói: "Em cầm đi. Anh đợi tạnh." '
     'Linh nhận ô rồi dừng lại, chưa rời đi. Tay trao ô phải hợp lý, chỉ duy nhất một chiếc ô.'),
    ('video-4', 'Mời vào quán',
     '0–5s: Bắt đầu đúng @图1: Linh đã cầm ô, mở tay hướng về cửa quán và nhìn Nam. '
     'Linh nhẹ nhàng nói: "Quán còn mở." Ngừng một nhịp rồi nói: "Anh có muốn nói cho hết không?" '
     '5–10s: Nam gật đầu nhẹ, cùng Linh bước về cửa quán dưới một chiếc ô. Hai người chưa nắm tay. '
     '10–15s: Họ thu ô khi vào quán. Tiếng chuông cửa leng keng. Qua cửa kính mờ hơi nước thấy Linh kéo chiếc ghế đối diện, Nam ngồi xuống. '
     'Kết thúc bằng không khí ấm áp, ánh đèn vàng và tiếng mưa ngoài cửa, không thêm nhạc.'),
]


def connect():
    db = sqlite3.connect(BASE / 'data' / 'studio.db', timeout=30)
    db.row_factory = sqlite3.Row
    return db


def saved_job(request_id):
    with connect() as db:
        row = db.execute('select id,status,provider_job,error,output from jobs where request_key=?', (request_id,)).fetchone()
    return dict(row) if row else None


def submit(scene):
    key = f"{PROJECT}:{scene['nodeId']}:{scene['requestId']}"
    existing = saved_job(key)
    if existing:
        return {'nodeId': scene['nodeId'], 'existing': True, 'jobId': existing['id'], 'status': existing['status']}
    req = urllib.request.Request('http://127.0.0.1:3210/api/run', data=json.dumps(scene['payload']).encode(),
                                headers={'Content-Type': 'application/json', 'x-generation-approval': scene['token']}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=2800) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        result = json.load(error)
    except Exception as error:
        result = {'error': str(error), 'note': 'Request uncertain; do not resubmit.'}
    (OUT / f"{scene['nodeId']}-response.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf8')
    asset = result.get('output') or {}
    summary = {'nodeId': scene['nodeId'], 'jobId': result.get('jobId'), 'status': 'succeeded' if asset else result.get('status'),
               'url': asset.get('url'), 'error': result.get('error')}
    print(json.dumps(summary, ensure_ascii=False), flush=True)
    return summary


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if '--submit-approved' not in sys.argv:
        print('No submission. This batch requires explicit --submit-approved.')
        return
    if PLAN.exists():
        raise SystemExit('Approved batch already started. Inspect existing tasks; do not submit again.')
    keyframes = json.loads((OUT / 'keyframes.json').read_text(encoding='utf8'))
    plan = {'projectId': PROJECT, 'modelId': MODEL, 'maxSubmissions': 4, 'listedPriceCny': 1.8,
            'approvedMaxListedCny': 7.2, 'userAuthorization': 'Tạo lại đủ 4 cảnh — 7,20 tệ, đồng bộ nhân vật', 'scenes': []}
    for i, (node, name, prompt) in enumerate(SCENES):
        rid = uuid.uuid4().hex
        payload = {'modelId': MODEL, 'kind': 'video', 'projectId': PROJECT, 'nodeId': node, 'requestId': rid,
                   'name': f'Phim nhan vat goc - Canh {i+1} - 15s', 'vars': {
                       'prompt': COMMON + '\n\n' + prompt, 'duration': 15, 'seconds': '15', 'aspect': '9:16',
                       'images': [keyframes[i]['url'], f'/api/files/{PROJECT}/linh-tham-chieu.png', f'/api/files/{PROJECT}/nam-tham-chieu.png']}}
        plan['scenes'].append({'nodeId': node, 'name': name, 'requestId': rid, 'payload': payload})
    PLAN.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding='utf8')
    futures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for scene in plan['scenes']:
            scene = dict(scene, token=uuid.uuid4().hex)
            approval = {'token': scene['token'], 'remaining': 1, 'expiresAt': int(time.time()*1000)+300000,
                        'modelId': MODEL, 'projectId': PROJECT, 'nodeId': scene['nodeId']}
            with connect() as db:
                db.execute("insert into settings(key,value) values('generation_approval',?) on conflict(key) do update set value=excluded.value", (json.dumps(approval),))
            futures.append(pool.submit(submit, scene))
            # Hand off one ticket at a time; never overwrite an unconsumed ticket.
            consumed = False
            for _ in range(120):
                time.sleep(.5)
                with connect() as db:
                    row = db.execute("select value from settings where key='generation_approval'").fetchone()
                if row and json.loads(row[0]).get('remaining') == 0:
                    consumed = True
                    break
            if not consumed:
                print('Approval was not consumed; stopping remaining submissions.', flush=True)
                break
            print('Authorized request dispatched once: ' + scene['nodeId'], flush=True)
        results = [future.result() for future in futures]
    with connect() as db:
        db.execute("delete from settings where key='generation_approval'")
    (OUT / 'batch-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf8')
    print('Batch ended. No automatic retries.', flush=True)


if __name__ == '__main__':
    main()
