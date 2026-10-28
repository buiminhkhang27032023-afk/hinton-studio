import cv2
import insightface
from insightface.app import FaceAnalysis

app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0, det_size=(640, 640))

swapper = insightface.model_zoo.get_model('d:/phim ai thời trang/models/inswapper_128.onnx', download=False)

source_img = cv2.imread('d:/phim ai thời trang/data/assets/prj_001a730361db/asset_crop_portrait_dance-crop_portrait.png')
source_faces = app.get(source_img)
print('Source faces found:', len(source_faces))

target_img = cv2.imread('C:/Users/Chen Qianyu/.gemini/antigravity/brain/bdbd603a-d0a7-4176-a196-329393979b65/ref_dance_2s.jpg')
target_faces = app.get(target_img)
print('Target faces found:', len(target_faces))

if source_faces and target_faces:
    res = swapper.get(target_img, target_faces[0], source_faces[0], paste_back=True)
    cv2.imwrite('C:/Users/Chen Qianyu/.gemini/antigravity/brain/bdbd603a-d0a7-4176-a196-329393979b65/test_swapped_2s.jpg', res)
    print('Swapped frame saved successfully!')
