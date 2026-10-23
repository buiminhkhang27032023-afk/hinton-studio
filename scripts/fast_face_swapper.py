import os
import sys
import time
import cv2
import insightface
from insightface.app import FaceAnalysis

def swap_video(src_img_path, input_video_path, output_video_path):
    print(f"=== FAST VIDEO FACE SWAP: {os.path.basename(input_video_path)} ===", flush=True)
    t0 = time.time()
    
    # Init insightface
    print("Loading models (buffalo_l + inswapper_128)...", flush=True)
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(256, 256))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    # Read source face
    print(f"Reading source face from {src_img_path}...", flush=True)
    src_img = cv2.imread(src_img_path)
    src_faces = app.get(src_img)
    if not src_faces:
        raise ValueError("No face detected in source image!")
    src_face = sorted(src_faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
    print(f"Source face detected successfully: bbox={src_face.bbox}", flush=True)
    
    # Open input video
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Input video: {width}x{height} @ {fps}fps, {total_frames} total frames (~{total_frames/fps:.1f}s)", flush=True)
    
    temp_raw_out = output_video_path + ".temp.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_raw_out, fourcc, fps, (width, height))
    
    last_target_face = None
    frame_idx = 0
    swapped_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        # Detect every 2 frames
        if frame_idx % 2 == 1 or last_target_face is None:
            faces = app.get(frame)
            if faces:
                last_target_face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
            else:
                last_target_face = None
        
        if last_target_face is not None:
            try:
                frame = swapper.get(frame, last_target_face, src_face, paste_back=True)
                swapped_count += 1
            except Exception:
                pass
                
        out.write(frame)
        if frame_idx % 24 == 0 or frame_idx == total_frames:
            elapsed = time.time() - t0
            fps_proc = frame_idx / elapsed if elapsed > 0 else 0
            rem = (total_frames - frame_idx) / fps_proc if fps_proc > 0 else 0
            print(f"[{frame_idx}/{total_frames}] {frame_idx/total_frames*100:.1f}% ({fps_proc:.1f} fps, ~{rem:.0f}s left, swapped={swapped_count})", flush=True)
            
    cap.release()
    out.release()
    
    # Mux audio from original video with ffmpeg
    print("Muxing audio and finalizing H.264...", flush=True)
    os.system(f'ffmpeg -y -i "{temp_raw_out}" -i "{input_video_path}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -map 0:v:0 -map 1:a:0? -c:a aac -b:a 192k "{output_video_path}"')
    if os.path.exists(temp_raw_out):
        try:
            os.remove(temp_raw_out)
        except Exception:
            pass
        
    print(f"=== COMPLETED in {time.time()-t0:.1f}s: {output_video_path} (swapped {swapped_count} frames) ===", flush=True)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python fast_face_swapper.py <src_img> <input_video> <output_video>")
        sys.exit(1)
    swap_video(sys.argv[1], sys.argv[2], sys.argv[3])
