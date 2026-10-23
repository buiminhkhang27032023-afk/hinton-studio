import os
import sys
import time
import shutil
import subprocess
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis

def reinhard_complexion_transfer(swapped_chip, donor_chip, blend_l=0.55, blend_ab=0.65):
    """
    Transfers the radiant porcelain skin tone and vibrant lip color from the donor photo
    to the swapped face chip while maintaining the 3D lighting geometry of the target video.
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
    
    # A & B channels (rosy skin tone & crimson lips)
    for c in [1, 2]:
        res_lab[:,:,c] = (s_lab[:,:,c] - s_mean[c]) * (d_std[c] / s_std[c]) + d_mean[c]
        res_lab[:,:,c] = s_lab[:,:,c] * (1.0 - blend_ab) + res_lab[:,:,c] * blend_ab
        
    res_lab = np.clip(res_lab, 0, 255).astype(np.uint8)
    return cv2.cvtColor(res_lab, cv2.COLOR_LAB2BGR)

def unsharp_mask(img, sigma=1.0, strength=0.5):
    """Enhance high-frequency details (eyes, eyelashes, lips) to eliminate blur."""
    blurred = cv2.GaussianBlur(img, (0, 0), sigma)
    sharpened = cv2.addWeighted(img, 1.0 + strength, blurred, -strength, 0)
    return np.clip(sharpened, 0, 255).astype(np.uint8)

def process_high_fidelity_video(
    app, swapper, src_face, src_img, src_aligned_chip,
    input_video_path, output_video_path, temp_dir,
    tracking_mode="center", max_secs=4.0, out_size=(1280, 720), label="Fashion Video"
):
    print(f"\n=======================================================", flush=True)
    print(f"CLONING MODEL 4: {label}", flush=True)
    print(f"Source: {input_video_path} -> Destination: {output_video_path}", flush=True)
    print(f"=======================================================", flush=True)
    t0 = time.time()
    
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_frames = min(int(max_secs * fps), total_frames)
    
    out_w, out_h = out_size
    last_bbox = None
    frame_idx = 0
    swapped_count = 0
    
    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        frame_resized = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
        faces = app.get(frame_resized)
        
        target_face = None
        if faces:
            if tracking_mode == "corridor":
                # Strict runway center corridor tracking (prevent audience swaps)
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
                        target_face = min(valid, key=lambda f: (((f.bbox[0]+f.bbox[2])/2 - last_cx)**2 + ((f.bbox[1]+f.bbox[3])/2 - last_cy)**2))
                    else:
                        target_face = min(valid, key=lambda f: abs((f.bbox[0]+f.bbox[2])/2 - out_w / 2))
                else:
                    target_face = min(faces, key=lambda f: abs((f.bbox[0]+f.bbox[2])/2 - out_w / 2))
            else:
                # Studio mode: pick primary centered model
                target_face = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
                
            last_bbox = target_face.bbox
            
        if target_face is not None:
            try:
                # 1. Swapper generates 128x128 face chip and affine matrix
                bgr_fake, M = swapper.get(frame_resized, target_face, src_face, paste_back=False)
                
                # 2. Color & Complexion restoration from source photo
                enhanced_chip = reinhard_complexion_transfer(bgr_fake, src_aligned_chip, blend_l=0.55, blend_ab=0.65)
                
                # 3. High-frequency detail sharpening
                enhanced_chip = unsharp_mask(enhanced_chip, sigma=1.0, strength=0.5)
                
                # 4. Warp back with high-order Lanczos interpolation
                IM = cv2.invertAffineTransform(M)
                warped_fake = cv2.warpAffine(enhanced_chip, IM, (out_w, out_h), flags=cv2.INTER_LANCZOS4, borderValue=0.0)
                
                # 5. Smooth feathered ellipse mask for seamless edge blending
                mask_chip = np.zeros((128, 128), dtype=np.uint8)
                cv2.ellipse(mask_chip, (64, 66), (46, 54), 0, 0, 360, 255, -1)
                mask_chip = cv2.GaussianBlur(mask_chip, (17, 17), 7).astype(np.float32) / 255.0
                
                warped_mask = cv2.warpAffine(mask_chip, IM, (out_w, out_h), flags=cv2.INTER_LINEAR, borderValue=0.0)
                warped_mask = np.expand_dims(warped_mask, axis=2)
                
                # 6. Alpha merge
                frame_resized = (warped_mask * warped_fake.astype(np.float32) + (1.0 - warped_mask) * frame_resized.astype(np.float32)).astype(np.uint8)
                swapped_count += 1
            except Exception as e:
                # Fallback to standard swap if matrix error
                try:
                    frame_resized = swapper.get(frame_resized, target_face, src_face, paste_back=True)
                    swapped_count += 1
                except:
                    pass
                    
        frame_file = os.path.join(temp_dir, f"frame_{frame_idx:04d}.jpg")
        cv2.imwrite(frame_file, frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        if frame_idx % 24 == 0 or frame_idx == max_frames:
            fps_cur = frame_idx / (time.time() - t0)
            print(f"  Frame {frame_idx}/{max_frames} ({frame_idx/max_frames*100:.0f}%, {fps_cur:.1f} fps, swapped={swapped_count})", flush=True)
            
    cap.release()
    
    # Mux to high quality MP4
    print(f"  Muxing {output_video_path} with FFmpeg...", flush=True)
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
    print(f"-> SUCCESS: {output_video_path} ({os.path.getsize(output_video_path):,} bytes, elapsed: {time.time()-t0:.1f}s)", flush=True)

def main():
    print("=== INITIALIZING HIGH-FIDELITY CLONING ENGINE FOR MODEL 4 ===", flush=True)
    src_path = "user_model_face_4.png"
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Missing {src_path}")
        
    src_img = cv2.imread(src_path)
    
    print("Loading buffalo_l and inswapper_128...", flush=True)
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(320, 320))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    # Source face detection
    src_faces = app.get(src_img)
    if not src_faces:
        raise ValueError("No face detected in source model!")
    src_face = sorted(src_faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
    
    from insightface.utils import face_align
    src_aligned_chip, _ = face_align.norm_crop2(src_img, src_face.kps, 128)
    print(f"Source Model detected: bbox={src_face.bbox.astype(int)}, chip ready (128x128)", flush=True)
    
    # 1. Produce Studio Pose Video (5.0 seconds, 120 frames)
    studio_in = "frontal_portrait_raw.mp4"
    studio_out = "model4_studio_cloned.mp4"
    process_high_fidelity_video(
        app, swapper, src_face, src_img, src_aligned_chip,
        studio_in, studio_out, "temp_model4_studio_frames",
        tracking_mode="center", max_secs=5.0, out_size=(1280, 720), label="Studio Chic Portrait"
    )
    
    # 2. Produce Paris Runway Video (4.0 seconds, 96 frames)
    runway_in = r"data\assets\prj_6db5b4ce6484\asset_9bdc9026a3c8-C-nh-1--B--c-ra-s-n-di-n-th-i-trang-Paris-trong---m-d--h-i--.mp4"
    runway_out = "model4_paris_runway_cloned.mp4"
    process_high_fidelity_video(
        app, swapper, src_face, src_img, src_aligned_chip,
        runway_in, runway_out, "temp_model4_runway_frames",
        tracking_mode="corridor", max_secs=4.0, out_size=(960, 540), label="Paris Runway Haute Couture"
    )
    
    print("\n=== BOTH CLONED VIDEOS PRODUCED SUCCESSFULLY ===", flush=True)

if __name__ == "__main__":
    main()
