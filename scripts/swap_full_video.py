import os
import cv2
import insightface
from insightface.app import FaceAnalysis
import subprocess
import time

def main():
    start_time = time.time()
    source_path = 'd:/phim ai thời trang/data/assets/prj_001a730361db/asset_crop_portrait_dance-crop_portrait.png'
    video_path = 'd:/phim ai thời trang/data/assets/prj_001a730361db/asset_dc616bd22ea8-snaptik.vn_7682726307867692308.mp4.mp4'
    temp_video = 'd:/phim ai thời trang/data/assets/prj_001a730361db/temp_swapped.mp4'
    final_video = 'd:/phim ai thời trang/data/assets/prj_001a730361db/asset_nhan_vat_thay_the_nhay_theo_mau.mp4'

    print("Initializing FaceAnalysis...")
    app = FaceAnalysis(name='buffalo_l')
    app.prepare(ctx_id=0, det_size=(640, 640))

    print("Loading inswapper model...")
    swapper = insightface.model_zoo.get_model('d:/phim ai thời trang/models/inswapper_128.onnx', download=False)

    print("Detecting source face...")
    source_img = cv2.imread(source_path)
    source_faces = app.get(source_img)
    if not source_faces:
        print("ERROR: No source face found!")
        return
    source_face = source_faces[0]
    print("Source face detected successfully.")

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Video info: {width}x{height}, {fps} fps, {total_frames} frames")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_video, fourcc, fps, (width, height))

    frame_idx = 0
    last_target_face = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        target_faces = app.get(frame)
        if target_faces:
            # Sort by area to get largest face (main dancer)
            target_faces.sort(key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
            chosen_face = target_faces[0]
            last_target_face = chosen_face
            frame = swapper.get(frame, chosen_face, source_face, paste_back=True)
        elif last_target_face is not None:
            # Fallback if detection missed on a single motion blur frame
            pass

        out.write(frame)
        if frame_idx % 30 == 0 or frame_idx == total_frames:
            print(f"Processed frame {frame_idx}/{total_frames} ({(frame_idx/total_frames)*100:.1f}%)")

    cap.release()
    out.release()
    print("Video frames processed. Muxing original audio...")

    cmd = [
        'ffmpeg', '-y',
        '-i', temp_video,
        '-i', video_path,
        '-c:v', 'libx264', '-crf', '18', '-preset', 'fast',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        final_video
    ]
    subprocess.run(cmd, check=True)

    if os.path.exists(temp_video):
        os.remove(temp_video)

    print(f"DONE in {time.time() - start_time:.1f}s! Final output saved to: {final_video}")

if __name__ == '__main__':
    main()
