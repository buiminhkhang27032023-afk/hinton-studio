import urllib.request, urllib.error, json, wave, io

buf = io.BytesIO()
with wave.open(buf, 'wb') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(16000)
    wf.writeframes(b'\x00\x00' * 16000)
wav_data = buf.getvalue()

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = bytearray()
body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\nTestVoice\r\n'.encode('utf-8'))
body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="files"; filename="sample.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode('utf-8'))
body.extend(wav_data)
body.extend(f'\r\n--{boundary}--\r\n'.encode('utf-8'))

req = urllib.request.Request(
    'https://api.elevenlabs.io/v1/voices/add',
    data=bytes(body),
    headers={
        'xi-api-key': 'YOUR_ELEVENLABS_KEY',
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        print('Success:', resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP Error', e.code, e.read().decode('utf-8'))
