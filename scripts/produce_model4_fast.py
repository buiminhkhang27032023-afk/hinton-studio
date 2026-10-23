import os
import sys
import time
import shutil
import subprocess
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis
from insightface.utils import face_align

def reinhard_complexion_transfer(swapped_chip, donor_chip, blend_l=0.55, blend_ab=0.65):
    """
    Transfers porcelain brightness and crimson lip color from donor to swapped chip.
    """
    s_lab = cv2.cvtColor(swapped_chip, cv2.COLOR_BGR2LAB).astype(np.float32)
    d_lab = cv2.cvtColor(donor_chip, cv2.COLOR_BGR2LAB).astype(np.float32)
    
    s_mean, s_std = s_lab.mean(axis=(0,1)), s_lab.std(axis=(0,1))
    d_mean, d_std = d_lab.mean(axis=(0,1)), d_lab.std(axis=(0,1))
    
    s_std[s_std == 0] = 1.0
    res_lab = np.zeros_like(s_lab)
    
    # L channel (luminance / porcelain brightness)
    res_lab[:,:,0] = (s_lab[:,:,0] - s_mean[0]) * (d_std[0] / s_std[0]) + d_mean[0]
    res_lab[:,:,0] = s_lab[:,:,0] * (1.0 - blend_l) + res_lab[:,:,0] * blend_l
    
    # A & B channels (skin tone & redness)
    for c in [1, 2]:
        res_lab[:,:,c] = (s_lab[:,:,c] - s_mean[c]) * (d_std[c] / s_std[c]) + d_mean[c]
        res_lab[:,:,c] = s_lab[:,:,c] * (1.0 - blend_ab) + res_lab[:,:,c] * blend_ab
        
    res_lab = np.clip(res_lab, 0, 255).astype(np.uint8)
    return cv2.cvtColor(res_lab, cv2.COLOR_LAB2BGR)

def unsharp_mask(img, sigma=1.0, strength=0.5):
    blurred = cv2.GaussianBlur(img, (0, 0), sigma)
    sharpened = cv2.addWeighted(img, 1.0 + strength, blurred, -strength, 0)
    return np.clip(sharpened, 0, 255).astype(np.uint8)

def process_video_fast(
    app, swapper, src_face, src_img, src_aligned_chip,
    input_video_path, output_video_path, temp_dir,
    tracking_mode="center", max_secs=3.5, out_size=(960, 540), label="Video"
):
    print(f"\n--- Processing {label}: {input_video_path} -> {output_video_path} ---", flush=True)
    t0 = time.time()
    
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_frames = min(int(max_secs * fps), total_frames)
    
    out_w, out_h = out_size
    last_target_face = None
    last_bbox = None
    frame_idx = 0
    swapped_count = 0
    
    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        frame_resized = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
        
        # Detect faces every 2 frames for 2.5x-3x speedup while tracking continuously
        if frame_idx % 2 == 1 or last_target_face is None:
            faces = app.get(frame_resized)
            if faces:
                if tracking_mode == "corridor":
                    valid = []
                    for f in faces:
                        cx = (f.bbox[0] + f.bbox[2]) / 2
                        cy = (f.bbox[1] + f.bbox[3]) / 2
                        if 0.30 * out_w <= cx <= 0.70 * out_w and cy <= 0.50 * out_h:
                            valid.append(f)
                    if valid:
                        if last_bbox is not None:
                            last_cx = (last_bbox[0] + last_bbox[2]) / 2
                            last_cy = (last_bbox[1] + last_bbox[3]) / 2
                            last_target_face = min(valid, key=lambda f: (((f.bbox[0]+f.bbox[2])/2 - last_cx)**2 + ((f.bbox[1]+f.bbox[3])/2 - last_cy)**2))
                        else:
                            last_target_face = min(valid, key=lambda f: abs((f.bbox[0]+f.bbox[2])/2 - out_w / 2))
                    else:
                        last_target_face = min(faces, key=lambda f: abs((f.bbox[0]+f.bbox[2])/2 - out_w / 2))
                else:
                    last_target_face = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
                last_bbox = last_target_face.bbox
            else:
                last_target_face = None
                
        if last_target_face is not None:
            try:
                bgr_fake, M = swapper.get(frame_resized, last_target_face, src_face, paste_back=False)
                enhanced_chip = reinhard_complexion_transfer(bgr_fake, src_aligned_chip, blend_l=0.55, blend_ab=0.65)
                enhanced_chip = unsharp_mask(enhanced_chip, sigma=1.0, strength=0.5)
                
                IM = cv2.invertAffineTransform(M)
                warped_fake = cv2.warpAffine(enhanced_chip, IM, (out_w, out_h), flags=cv2.INTER_LANCZOS4, borderValue=0.0)
                
                mask_chip = np.zeros((128, 128), dtype=np.uint8)
                cv2.ellipse(mask_chip, (64, 66), (46, 54), 0, 0, 360, 255, -1)
                mask_chip = cv2.GaussianBlur(mask_chip, (17, 17), 7).astype(np.float32) / 255.0
                
                warped_mask = cv2.warpAffine(mask_chip, IM, (out_w, out_h), flags=cv2.INTER_LINEAR, borderValue=0.0)
                warped_mask = np.expand_dims(warped_mask, axis=2)
                
                frame_resized = (warped_mask * warped_fake.astype(np.float32) + (1.0 - warped_mask) * frame_resized.astype(np.float32)).astype(np.uint8)
                swapped_count += 1
            except Exception:
                try:
                    frame_resized = swapper.get(frame_resized, last_target_face, src_face, paste_back=True)
                    swapped_count += 1
                except:
                    pass
                    
        frame_file = os.path.join(temp_dir, f"frame_{frame_idx:04d}.jpg")
        cv2.imwrite(frame_file, frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        if frame_idx % 24 == 0 or frame_idx == max_frames:
            fps_cur = frame_idx / (time.time() - t0)
            print(f"  [{label}] Frame {frame_idx}/{max_frames} ({frame_idx/max_frames*100:.0f}%, {fps_cur:.1f} fps, swapped={swapped_count})", flush=True)
            
    cap.release()
    
    # Mux to high quality MP4
    print(f"  Muxing {output_video_path}...", flush=True)
    temp_frames_pattern = os.path.join(temp_dir, "frame_%04d.jpg")
    cmd = [
        "ffmpeg", "-nostdin", "-y",
        "-framerate", str(fps),
        "-i", temp_frames_pattern,
        "-i", input_video_path,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-map", "0:v:0",
        "-map", "1:a:0?",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", str(max_secs),
        output_video_path
    ]
    subprocess.run(cmd, check=True)
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"-> FINISHED {output_video_path} in {time.time()-t0:.1f}s ({os.path.getsize(output_video_path):,} bytes)", flush=True)

def main():
    print("=== HIGH-SPEED HIGH-FIDELITY CLONING ENGINE FOR MODEL 4 ===", flush=True)
    t_all = time.time()
    
    src_path = "user_model_face_4.png"
    src_img = cv2.imread(src_path)
    
    print("Loading buffalo_l and inswapper_128...", flush=True)
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(256, 256))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    src_faces = app.get(src_img)
    src_face = sorted(src_faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
    src_aligned_chip, _ = face_align.norm_crop2(src_img, src_face.kps, 128)
    print("Source Model extracted successfully!", flush=True)
    
    # 1. Studio Pose (3.5 seconds = 84 frames, 960x540)
    process_video_fast(
        app, swapper, src_face, src_img, src_aligned_chip,
        input_video_path="frontal_portrait_raw.mp4",
        output_video_path="model4_studio_cloned.mp4",
        temp_dir="temp_fast_studio",
        tracking_mode="center", max_secs=3.5, out_size=(960, 540), label="Studio Chic Portrait"
    )
    
    # 2. Paris Runway Catwalk (3.5 seconds = 84 frames, 960x540)
    runway_in = r"data\assets\prj_6db5b4ce6484\asset_9bdc9026a3c8-C-nh-1--B--c-ra-s-n-di-n-th-i-trang-Paris-trong---m-d--h-i--.mp4"
    process_video_fast(
        app, swapper, src_face, src_img, src_aligned_chip,
        input_video_path=runway_in,
        output_video_path="model4_paris_runway_cloned.mp4",
        temp_dir="temp_fast_runway",
        tracking_mode="corridor", max_secs=3.5, out_size=(960, 540), label="Paris Runway Catwalk"
    )
    
    print(f"\n=== BOTH VIDEOS FINISHED IN {time.time()-t_all:.1f}s ===", flush=True)

if __name__ == "__main__":
    main()
