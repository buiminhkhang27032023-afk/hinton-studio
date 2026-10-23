import os
import sys
import time
import cv2
import insightface
from insightface.app import FaceAnalysis

def swap_video(src_img_path, input_video_path, output_video_path):
    print("=== STARTING VIDEO FACE SWAP ===")
    t0 = time.time()
    
    # Init insightface
    print("Loading buffalo_l and inswapper_128...")
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(640, 640))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    # Read source face
    print(f"Reading source face from {src_img_path}...")
    src_img = cv2.imread(src_img_path)
    src_faces = app.get(src_img)
    if not src_faces:
        raise ValueError("No face detected in source image!")
    src_face = sorted(src_faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
    print("Source face detected successfully.")
    
    # Open input video
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Input video: {width}x{height} @ {fps}fps, {total_frames} total frames (~{total_frames/fps:.1f}s)")
    
    temp_raw_out = output_video_path + ".temp.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_raw_out, fourcc, fps, (width, height))
    
    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        # Detect faces in target frame
        tgt_faces = app.get(frame)
        if tgt_faces:
            # Pick largest/central face
            main_face = sorted(tgt_faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
            frame = swapper.get(frame, main_face, src_face, paste_back=True)
            
        out.write(frame)
        if frame_idx % 24 == 0 or frame_idx == total_frames:
            elapsed = time.time() - t0
            fps_proc = frame_idx / elapsed
            rem = (total_frames - frame_idx) / fps_proc if fps_proc > 0 else 0
            print(f"[{frame_idx}/{total_frames}] {frame_idx/total_frames*100:.1f}% ({fps_proc:.1f} fps, ~{rem:.0f}s remaining)")
            
    cap.release()
    out.release()
    
    # Use ffmpeg to copy audio and re-encode to clean H.264
    print("Adding audio and encoding to final H.264...")
    os.system(f'ffmpeg -y -i "{temp_raw_out}" -i "{input_video_path}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -map 0:v:0 -map 1:a:0? -c:a aac -b:a 192k "{output_video_path}"')
    if os.path.exists(temp_raw_out):
        os.remove(temp_raw_out)
        
    print(f"Done in {time.time()-t0:.1f}s! Saved: {output_video_path}")

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\Chen Qianyu\.gemini\antigravity\brain\4149a5ae-666d-4654-a6f8-20a00b1b99a6\.user_uploaded\media_1792492490295_655176d1.jpg"
    inp = sys.argv[2] if len(sys.argv) > 2 else r"d:\phim ai thời trang\temp_render_100_male\trimmed_scene_1.mp4"
    out = sys.argv[3] if len(sys.argv) > 3 else r"d:\phim ai thời trang\swapped_scene_1.mp4"
    swap_video(src, inp, out)
