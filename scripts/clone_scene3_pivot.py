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
    s_lab = cv2.cvtColor(swapped_chip, cv2.COLOR_BGR2LAB).astype(np.float32)
    d_lab = cv2.cvtColor(donor_chip, cv2.COLOR_BGR2LAB).astype(np.float32)
    
    s_mean, s_std = s_lab.mean(axis=(0,1)), s_lab.std(axis=(0,1))
    d_mean, d_std = d_lab.mean(axis=(0,1)), d_lab.std(axis=(0,1))
    
    s_std[s_std == 0] = 1.0
    res_lab = np.zeros_like(s_lab)
    
    res_lab[:,:,0] = (s_lab[:,:,0] - s_mean[0]) * (d_std[0] / s_std[0]) + d_mean[0]
    res_lab[:,:,0] = s_lab[:,:,0] * (1.0 - blend_l) + res_lab[:,:,0] * blend_l
    
    for c in [1, 2]:
        res_lab[:,:,c] = (s_lab[:,:,c] - s_mean[c]) * (d_std[c] / s_std[c]) + d_mean[c]
        res_lab[:,:,c] = s_lab[:,:,c] * (1.0 - blend_ab) + res_lab[:,:,c] * blend_ab
        
    res_lab = np.clip(res_lab, 0, 255).astype(np.uint8)
    return cv2.cvtColor(res_lab, cv2.COLOR_LAB2BGR)

def unsharp_mask(img, sigma=1.0, strength=0.5):
    blurred = cv2.GaussianBlur(img, (0, 0), sigma)
    sharpened = cv2.addWeighted(img, 1.0 + strength, blurred, -strength, 0)
    return np.clip(sharpened, 0, 255).astype(np.uint8)

def main():
    print("=== CLONING MODEL 4 INTO SCENE 3 (PIVOT TURN & FINALE) ===", flush=True)
    t0 = time.time()
    
    src_path = "user_model_face_4.png"
    src_img = cv2.imread(src_path)
    
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(256, 256))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    src_faces = app.get(src_img)
    src_face = sorted(src_faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
    src_aligned_chip, _ = face_align.norm_crop2(src_img, src_face.kps, 128)
    
    input_path = r"data\assets\prj_6db5b4ce6484\asset_361dbde1a829-C-nh-3--T-o-d-ng-th-n-th-i---u-s-n-catwalk---C--xoay-ng--i-k.mp4"
    output_path = "model4_scene3_pivot_cloned.mp4"
    temp_dir = "temp_fast_s3"
    
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    max_frames = 60 # 2.5 seconds
    out_w, out_h = 960, 540
    
    last_target_face = None
    last_bbox = None
    frame_idx = 0
    swapped_count = 0
    
    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret: break
        frame_idx += 1
        
        frame_resized = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
        
        if frame_idx % 2 == 1 or last_target_face is None:
            faces = app.get(frame_resized)
            if faces:
                valid = []
                for f in faces:
                    cx = (f.bbox[0] + f.bbox[2]) / 2
                    cy = (f.bbox[1] + f.bbox[3]) / 2
                    if 0.35 * out_w <= cx <= 0.65 * out_w and cy <= 0.50 * out_h:
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
                except: pass
                
        cv2.imwrite(os.path.join(temp_dir, f"frame_{frame_idx:04d}.jpg"), frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if frame_idx % 20 == 0 or frame_idx == max_frames:
            print(f"  Frame {frame_idx}/{max_frames} ({frame_idx/max_frames*100:.0f}%, swapped={swapped_count})", flush=True)
            
    cap.release()
    
    temp_frames_pattern = os.path.join(temp_dir, "frame_%04d.jpg")
    cmd = [
        "ffmpeg", "-nostdin", "-y",
        "-framerate", str(fps),
        "-i", temp_frames_pattern,
        "-i", input_path,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-map", "0:v:0",
        "-map", "1:a:0?",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", "2.5",
        output_path
    ]
    subprocess.run(cmd, check=True)
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"-> SUCCESS Scene 3: {output_path} ({os.path.getsize(output_path):,} bytes, elapsed: {time.time()-t0:.1f}s)", flush=True)

if __name__ == "__main__":
    main()
