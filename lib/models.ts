import { getDb, now } from "./db";
import type { ModelConfig, ModelKind, ModelRecord } from "./types";

/**
 * Built-in presets. Synchronized with all providers (IOOAI, RunningHub, Alibaba Bailian, AutoDL, SiliconFlow, Kling, 302.AI, etc.).
 */
const PRESETS: Array<Omit<ModelRecord, "createdAt" | "builtin">> = [
  {
    "id": "302ai:kling-v1.5",
    "label": "302.AI · Kling 1.5 Video (Hỗ trợ 5s & 10s)",
    "kind": "video",
    "provider": "302ai",
    "description": "Kling AI video qua cổng 302.AI nạp tiền bằng USD hoặc WeChat/Alipay.",
    "config": {
      "endpoint": "/302/submit/kling-v1-5",
      "method": "POST",
      "body": {
        "prompt": "{{prompt}}",
        "image_url": "{{image}}",
        "duration": "{{duration}}"
      },
      "jobPath": "id",
      "pollEndpoint": "/302/status/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "output_url",
      "timeout": 900
    }
  },
  {
    "id": "302ai:live-portrait",
    "label": "302.AI · LivePortrait API (Nhái biểu cảm khuôn mặt 0.1 PTC)",
    "kind": "video",
    "provider": "302ai",
    "description": "API LivePortrait đóng gói sẵn trả tiền theo lượt (Pay-as-you-go).",
    "config": {
      "endpoint": "/302/submit/live-portrait",
      "method": "POST",
      "body": {
        "image_url": "{{image}}",
        "video_url": "{{video}}"
      },
      "jobPath": "id",
      "pollEndpoint": "/302/status/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "output_url",
      "timeout": 600
    }
  },
  {
    "id": "autodl:liveportrait",
    "label": "AutoDL · LivePortrait 表情驱动 (Biểu cảm mặt cực nét)",
    "kind": "video",
    "provider": "autodl",
    "description": "Chạy LivePortrait trên GPU riêng RTX 4090, render biểu cảm mặt thời gian thực cực nhanh.",
    "config": {
      "endpoint": "/prompt",
      "method": "POST",
      "body": {
        "image": "{{image}}",
        "video": "{{video}}"
      },
      "jobPath": "prompt_id",
      "pollEndpoint": "/history/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 600
    }
  },
  {
    "id": "autodl:mimicmotion",
    "label": "AutoDL · MimicMotion 动作迁移 (GPU Riêng 0s Chờ)",
    "kind": "video",
    "provider": "autodl",
    "description": "Chạy mô hình MimicMotion trực tiếp trên máy chủ RTX 4090 riêng của bạn trên AutoDL. Tái tạo 100% vũ đạo, 0 giây xếp hàng, chi phí chỉ ~150đ/video.",
    "config": {
      "endpoint": "/prompt",
      "method": "POST",
      "body": {
        "image": "{{image}}",
        "video": "{{video}}"
      },
      "jobPath": "prompt_id",
      "pollEndpoint": "/history/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 900
    }
  },
  {
    "id": "bailian:animate-anyone-gen2",
    "label": "Alibaba Bailian · AnimateAnyone Gen2 (Tái tạo điệu nhảy & Chuyển động)",
    "kind": "video",
    "provider": "bailian",
    "description": "Mô hình chuyên tái tạo điệu nhảy từ video sang ảnh nhân vật tĩnh của Alibaba Cloud (DashScope). Tự động trích xuất khung xương DWPose và sao chép 100% vũ đạo.",
    "config": {
      "endpoint": "/services/aigc/image2video/video-synthesis/",
      "method": "POST",
      "headers": {
        "X-DashScope-Async": "enable"
      },
      "body": {
        "model": "animate-anyone-gen2",
        "input": {
          "image_url": "{{image}}",
          "template_id": "{{video}}"
        },
        "parameters": {
          "fps": 24
        }
      },
      "jobPath": "output.task_id",
      "pollEndpoint": "/tasks/{{job}}",
      "statusPath": "output.task_status",
      "doneValues": [
        "succeeded",
        "success"
      ],
      "failedValues": [
        "failed",
        "canceled",
        "error"
      ],
      "resultPath": "output.video_url",
      "timeout": 900
    }
  },
  {
    "id": "bailian:outfitanyone",
    "label": "Alibaba Bailian · OutfitAnyone (Thử đồ thời trang chính hãng Alibaba)",
    "kind": "image",
    "provider": "bailian",
    "description": "Mô hình thử đồ thời trang độ nét cao của viện nghiên cứu Alibaba, ghép trang phục lên người mẫu tự nhiên.",
    "config": {
      "endpoint": "/services/aigc/image-generation/generation",
      "method": "POST",
      "body": {
        "model": "outfitanyone",
        "input": {
          "model_image": "{{image}}",
          "garment_image": "{{garment}}",
          "prompt": "{{prompt}}"
        }
      },
      "jobPath": "output.task_id",
      "pollEndpoint": "/tasks/{{job}}",
      "statusPath": "output.task_status",
      "doneValues": [
        "succeeded",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "output.image_url",
      "timeout": 300
    }
  },
  {
    "id": "bailian:wan-animate-mix",
    "label": "Alibaba Bailian · Wan 2.2 Animate Mix (Thay thế nhân vật trong video nhảy)",
    "kind": "video",
    "provider": "bailian",
    "description": "Thay thế vũ công trong video bằng người mẫu trong ảnh nhưng giữ nguyên 100% bối cảnh và động tác nhảy.",
    "config": {
      "endpoint": "/services/aigc/image2video/video-synthesis/",
      "method": "POST",
      "headers": {
        "X-DashScope-Async": "enable"
      },
      "body": {
        "model": "wan2.2-animate-mix",
        "input": {
          "image_url": "{{image}}",
          "video_url": "{{video}}"
        }
      },
      "jobPath": "output.task_id",
      "pollEndpoint": "/tasks/{{job}}",
      "statusPath": "output.task_status",
      "doneValues": [
        "succeeded",
        "success"
      ],
      "failedValues": [
        "failed",
        "canceled",
        "error"
      ],
      "resultPath": "output.video_url",
      "timeout": 900
    }
  },
  {
    "id": "bailian:wan-animate-move",
    "label": "Alibaba Bailian · Wan 2.2 Animate Move (Truyền động tác từ video sang ảnh)",
    "kind": "video",
    "provider": "bailian",
    "description": "Mô hình Wan của Alibaba truyền chuyển động toàn thân, bước nhảy và biểu cảm từ video mẫu sang ảnh nhân vật.",
    "config": {
      "endpoint": "/services/aigc/image2video/video-synthesis/",
      "method": "POST",
      "headers": {
        "X-DashScope-Async": "enable"
      },
      "body": {
        "model": "wan2.2-animate-move",
        "input": {
          "image_url": "{{image}}",
          "video_url": "{{video}}"
        },
        "parameters": {
          "mode": "wan-std"
        }
      },
      "jobPath": "output.task_id",
      "pollEndpoint": "/tasks/{{job}}",
      "statusPath": "output.task_status",
      "doneValues": [
        "succeeded",
        "success"
      ],
      "failedValues": [
        "failed",
        "canceled",
        "error"
      ],
      "resultPath": "output.video_url",
      "timeout": 900
    }
  },
  {
    "id": "bailian:wan2.1-i2v-plus",
    "label": "Alibaba Bailian · Wan 2.1 I2V Plus (Ảnh sang Video Wan 2.1)",
    "kind": "video",
    "provider": "bailian",
    "description": "Mô hình nền tảng Wan 2.1 Image-to-Video chính chủ Alibaba.",
    "config": {
      "endpoint": "/services/aigc/video-generation/video-synthesis",
      "method": "POST",
      "body": {
        "model": "wan2.1-i2v-plus",
        "input": {
          "img_url": "{{image}}",
          "prompt": "{{prompt}}"
        }
      },
      "jobPath": "output.task_id",
      "pollEndpoint": "/tasks/{{job}}",
      "statusPath": "output.task_status",
      "doneValues": [
        "succeeded",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "output.video_url",
      "timeout": 900
    }
  },
  {
    "id": "duomiapi:image",
    "label": "DuomiAPI · Tạo ảnh Midjourney / Flux",
    "kind": "image",
    "provider": "duomiapi",
    "description": "Sinh ảnh độ nét cao qua cổng DuomiAPI.",
    "config": {
      "endpoint": "/images/generations",
      "method": "POST",
      "body": {
        "model": "flux-schnell",
        "prompt": "{{prompt}}",
        "n": 1,
        "size": "{{size}}"
      },
      "resultPath": "data.0.url",
      "timeout": 300
    }
  },
  {
    "id": "duomiapi:kling_video",
    "label": "DuomiAPI · Kling Video AI",
    "kind": "video",
    "provider": "duomiapi",
    "description": "Tạo video chất lượng điện ảnh thông qua cổng DuomiAPI (多米API).",
    "config": {
      "endpoint": "/videos",
      "method": "POST",
      "body": {
        "model": "kling-v1",
        "prompt": "{{prompt}}",
        "seconds": "{{duration}}",
        "input_reference": "{{image}}"
      },
      "jobPath": "id",
      "pollEndpoint": "/videos/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "succeeded",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "data.0.url",
      "timeout": 900
    }
  },
  {
    "id": "duomiapi:seedance2",
    "label": "DuomiAPI · ByteDance Seedance 2.0 Standard",
    "kind": "video",
    "provider": "duomiapi",
    "description": "Seedance 2.0 Standard chất lượng điện ảnh cao cấp nhất của ByteDance. Giữ khuôn mặt nhân vật cực chuẩn.",
    "config": {
      "endpoint": "/api/v3/contents/generations/tasks",
      "method": "POST",
      "body": {
        "model": "doubao-seedance-2-0-260128",
        "content": [
          {
            "type": "text",
            "text": "{{prompt}}"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "{{image}}"
            }
          }
        ]
      },
      "jobPath": "data.task_id",
      "pollEndpoint": "/api/v3/contents/generations/tasks/{{job}}",
      "statusPath": "data.status",
      "doneValues": [
        "succeeded",
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "cancelled",
        "error"
      ],
      "resultPath": "data.content.0.video_url",
      "timeout": 900
    }
  },
  {
    "id": "duomiapi:seedance2_fast",
    "label": "DuomiAPI · ByteDance Seedance 2.0 Fast",
    "kind": "video",
    "provider": "duomiapi",
    "description": "Seedance 2.0 Fast của ByteDance qua DuomiAPI. Hỗ trợ nhận diện giữ mặt người, sinh video 5–10s mượt mà.",
    "config": {
      "endpoint": "/api/v3/contents/generations/tasks",
      "method": "POST",
      "body": {
        "model": "doubao-seedance-2-0-fast-260128",
        "content": [
          {
            "type": "text",
            "text": "{{prompt}}"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "{{image}}"
            }
          }
        ]
      },
      "jobPath": "data.task_id",
      "pollEndpoint": "/api/v3/contents/generations/tasks/{{job}}",
      "statusPath": "data.status",
      "doneValues": [
        "succeeded",
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "cancelled",
        "error"
      ],
      "resultPath": "data.content.0.video_url",
      "timeout": 900
    }
  },
  {
    "id": "iooai:MiniMax H3",
    "label": "IOOAI · MiniMax H3 / Hailuo Video (Chuyển động chân thực)",
    "kind": "video",
    "provider": "iooai",
    "description": "Mô hình video Hailuo H3 của MiniMax, chuyên cảnh điện ảnh và chuyển động tự nhiên.",
    "config": {
      "endpoint": "/videos",
      "method": "POST",
      "body": {
        "model": "MiniMax H3",
        "prompt": "{{prompt}}",
        "seconds": "{{duration}}",
        "input_reference": "{{image}}"
      },
      "jobPath": "id",
      "pollEndpoint": "/videos/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "video_url",
      "timeout": 900
    }
  },
  {
    "id": "iooai:MiniMax H3 1080p",
    "label": "IOOAI · MiniMax H3 1080p (Full HD Điện ảnh)",
    "kind": "video",
    "provider": "iooai",
    "description": "MiniMax H3 xuất thẳng độ phân giải Full HD 1080p sắc nét.",
    "config": {
      "endpoint": "/videos",
      "method": "POST",
      "body": {
        "model": "MiniMax H3 1080p",
        "prompt": "{{prompt}}",
        "seconds": "{{duration}}",
        "input_reference": "{{image}}"
      },
      "jobPath": "id",
      "pollEndpoint": "/videos/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "video_url",
      "timeout": 900
    }
  },
  {
    "id": "iooai:gpt-image-2-4k",
    "label": "IOOAI · GPT Image 2 (Tạo ảnh siêu nét 4K)",
    "kind": "image",
    "provider": "iooai",
    "description": "Tạo ảnh độ phân giải 4K chi tiết cao cho người mẫu và trang phục.",
    "config": {
      "endpoint": "/images/generations",
      "method": "POST",
      "body": {
        "model": "gpt-image-2-4k",
        "prompt": "{{prompt}}",
        "size": "1024x1024"
      },
      "resultPath": "data.0.url",
      "timeout": 300
    }
  },
  {
    "id": "iooai:omni_flash_10s",
    "label": "IOOAI · Omni Flash 10s (Video 10 giây nhanh)",
    "kind": "video",
    "provider": "iooai",
    "description": "Omni video 10 giây tốc độ cao.",
    "config": {
      "endpoint": "/videos",
      "method": "POST",
      "body": {
        "model": "omni_flash_10s",
        "prompt": "{{prompt}}",
        "seconds": "{{seconds}}",
        "ratio": "{{aspect}}",
        "resolution": "{{resolution}}",
        "images": "{{images}}"
      },
      "jobPath": "id",
      "pollEndpoint": "/videos/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "video_url",
      "timeout": 900
    }
  },
  {
    "id": "iooai:seedance 2.0 fast",
    "label": "IOOAI · Seedance 2.0 Fast (Tạo Video Siêu Tốc)",
    "kind": "video",
    "provider": "iooai",
    "description": "Tạo video nhanh trong 30-40 giây với chi phí siêu rẻ.",
    "config": {
      "endpoint": "/videos",
      "method": "POST",
      "body": {
        "model": "seedance 2.0 fast",
        "prompt": "{{prompt}}",
        "seconds": "{{duration}}",
        "images": [
          "{{image}}"
        ]
      },
      "jobPath": "id",
      "pollEndpoint": "/videos/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "video_url",
      "timeout": 900
    }
  },
  {
    "id": "iooai:seedance 2.0 满血",
    "label": "IOOAI · Seedance 2.0 满血 (Bản Đầy Đủ Cao Cấp)",
    "kind": "video",
    "provider": "iooai",
    "description": "Bản Full-blood của Seedance 2.0, chuyển động mượt mà và biểu cảm nét.",
    "config": {
      "endpoint": "/videos",
      "method": "POST",
      "body": {
        "model": "seedance 2.0 满血",
        "prompt": "{{prompt}}",
        "seconds": "{{duration}}",
        "images": [
          "{{image}}"
        ]
      },
      "jobPath": "id",
      "pollEndpoint": "/videos/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "video_url",
      "timeout": 900
    }
  },
  {
    "id": "iooai:seedance2.5 LW",
    "label": "IOOAI · Seedance 2.5 LW (Video ByteDance Cao cấp)",
    "kind": "video",
    "provider": "iooai",
    "description": "Seedance 2.5 bản LW chất lượng chi tiết cao cho hoạt cảnh và thời trang.",
    "config": {
      "endpoint": "/videos",
      "method": "POST",
      "body": {
        "model": "seedance2.5 LW",
        "prompt": "{{prompt}}",
        "seconds": "{{duration}}",
        "images": [
          "{{image}}"
        ]
      },
      "jobPath": "id",
      "pollEndpoint": "/videos/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "video_url",
      "timeout": 900
    }
  },
  {
    "id": "iooai:seedance2.5 快速版",
    "label": "IOOAI · Seedance 2.5 快速版 (Video 15s Sàn diễn & Điện ảnh)",
    "kind": "video",
    "provider": "iooai",
    "description": "Mô hình video thế hệ mới của ByteDance qua IOOAI. Hỗ trợ đa ảnh tham chiếu, tạo video thời trang/runway 15 giây liên tục.",
    "config": {
      "endpoint": "/videos",
      "method": "POST",
      "body": {
        "model": "seedance2.5 快速版",
        "prompt": "{{prompt}}",
        "seconds": "{{duration}}",
        "resolution": "{{resolution}}",
        "ratio": "{{aspect}}",
        "images": "{{images}}"
      },
      "jobPath": "id",
      "pollEndpoint": "/videos/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "succeeded",
        "success"
      ],
      "failedValues": [
        "failed",
        "error"
      ],
      "resultPath": "video_url",
      "timeout": 900
    }
  },
  {
    "id": "kling:v1.5-pro",
    "label": "Kling AI · Kling 1.5 Pro Video (Điện ảnh & Vật lý chân thực)",
    "kind": "video",
    "provider": "kling",
    "description": "Mô hình Kling 1.5 Pro chính hãng từ Kuaishou, hỗ trợ 5s và 10s độ nét cao.",
    "config": {
      "endpoint": "/kling/v1/videos/image2video",
      "method": "POST",
      "body": {
        "model": "kling-v1-5",
        "prompt": "{{prompt}}",
        "image": "{{image}}",
        "duration": "{{duration}}"
      },
      "jobPath": "data.task_id",
      "pollEndpoint": "/kling/v1/videos/image2video/{{job}}",
      "statusPath": "data.task_status",
      "doneValues": [
        "succeed",
        "completed"
      ],
      "failedValues": [
        "failed"
      ],
      "resultPath": "data.task_result.videos.0.url",
      "timeout": 900
    }
  },
  {
    "id": "kling:virtual-tryon",
    "label": "Kling AI · Virtual Try-On (Thử đồ thời trang chính hãng Kling)",
    "kind": "image",
    "provider": "kling",
    "description": "API thử đồ thời trang chính thức của Kling AI.",
    "config": {
      "endpoint": "/kling/v1/images/kolors-virtual-try-on",
      "method": "POST",
      "body": {
        "model_input": "{{image}}",
        "dress_input": "{{garment}}"
      },
      "jobPath": "data.task_id",
      "pollEndpoint": "/kling/v1/images/kolors-virtual-try-on/{{job}}",
      "statusPath": "data.task_status",
      "doneValues": [
        "succeed",
        "completed"
      ],
      "failedValues": [
        "failed"
      ],
      "resultPath": "data.task_result.images.0.url",
      "timeout": 300
    }
  },
  {
    "id": "seed:chat:vision",
    "label": "Mô tả / phân tích ảnh",
    "kind": "chat",
    "provider": "openai-compatible",
    "description": "Dùng để viết prompt từ ảnh tham chiếu hoặc gợi ý thông số.",
    "config": {
      "endpoint": "/chat/completions",
      "body": {
        "model": "{{model}}",
        "messages": [
          {
            "role": "user",
            "content": [
              {
                "type": "text",
                "text": "{{prompt}}"
              },
              {
                "type": "image_url",
                "image_url": {
                  "url": "{{image}}"
                }
              }
            ]
          }
        ]
      },
      "resultPath": "choices.0.message.content",
      "timeout": 120
    }
  },
  {
    "id": "seed:image:chat-image",
    "label": "Tạo ảnh — qua Chat Completions",
    "kind": "image",
    "provider": "openai-compatible",
    "description": "Cho gateway trả ảnh trong nội dung chat (markdown hoặc base64).",
    "config": {
      "endpoint": "/chat/completions",
      "body": {
        "model": "{{model}}",
        "messages": [
          {
            "role": "user",
            "content": "{{prompt}}"
          }
        ]
      },
      "resultPath": "choices.0.message.images.0.url",
      "timeout": 300
    }
  },
  {
    "id": "seed:image:fashion-tryon",
    "label": "Thử Đồ AI — giữ đúng người mẫu (dự phòng, qua gpt-image-2)",
    "kind": "image",
    "provider": "openai-compatible",
    "description": "/images/edits chỉ nhận 1 ảnh mỗi lần gọi (đã kiểm chứng: field reference_image/ref_image chỉ là alias, không phải ảnh thứ 2). Dùng ẢNH NGƯỜI MẪU làm ảnh gốc để giữ đúng mặt/dáng — trang phục được mô tả bằng chữ (lib/execute.ts tự gọi vision model đọc ảnh đồ trước).",
    "config": {
      "endpoint": "/images/edits",
      "body": {
        "model": "req/gpt-image-2",
        "prompt": "{{prompt}}",
        "image": "{{image}}",
        "size": "{{size}}",
        "n": 1
      },
      "resultPath": "data.0.url",
      "timeout": 300
    }
  },
  {
    "id": "req/gemini-3.0-pro-image",
    "label": "Gemini 3.0 Image · Tạo ảnh tham chiếu (Đa ảnh / Lookbook / Thử đồ)",
    "kind": "image",
    "provider": "openai-compatible",
    "description": "Model thị giác nhận diện đa ảnh: giữ trọn vẹn người mẫu, kiểu tóc, dáng đứng và trang phục từ các ảnh nối vào, tạo bố cục Lookbook, Chibi, ảnh sản phẩm hoặc thử đồ.",
    "config": {
      "endpoint": "/chat/completions",
      "body": {
        "model": "req/gemini-3.0-pro-image",
        "messages": "{{messages}}"
      },
      "resultPath": "choices.0.message.content",
      "timeout": 480
    }
  },
  {
    "id": "seed:image:gemini-compose",
    "label": "Gemini Ghép ảnh · Thử Đồ & Lookbook (khuyến nghị)",
    "kind": "image",
    "provider": "openai-compatible",
    "description": "Ghép đa ảnh qua Gemini 3.0: giữ đúng người mẫu, trang phục và bố cục theo ảnh tham chiếu.",
    "config": {
      "endpoint": "/chat/completions",
      "body": {
        "model": "req/gemini-3.0-pro-image",
        "messages": "{{messages}}"
      },
      "resultPath": "choices.0.message.content",
      "timeout": 480
    }
  },
  {
    "id": "seed:image:gpt-image",
    "label": "Tạo ảnh — Images API",
    "kind": "image",
    "provider": "openai-compatible",
    "description": "Chuẩn /images/generations. Gateway có thể trả URL hoặc base64.",
    "config": {
      "endpoint": "/images/generations",
      "body": {
        "model": "{{model}}",
        "prompt": "{{prompt}}",
        "n": 1,
        "size": "{{size}}",
        "response_format": "url"
      },
      "resultPath": "data.0.url",
      "timeout": 300
    }
  },
  {
    "id": "seed:train:lora",
    "label": "Train LoRA / model riêng",
    "kind": "train",
    "provider": "openai-compatible",
    "description": "Gửi bộ ảnh mẫu để tạo model riêng. Cấu hình theo tài liệu gateway của bạn.",
    "config": {
      "endpoint": "/fine_tuning/jobs",
      "body": {
        "model": "{{model}}",
        "dataset": "{{dataset}}",
        "name": "{{name}}",
        "steps": "{{steps}}"
      },
      "jobPath": "id",
      "pollEndpoint": "/fine_tuning/jobs/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "succeeded",
        "completed",
        "success",
        "done"
      ],
      "failedValues": [
        "failed",
        "error",
        "cancelled"
      ],
      "resultPath": "fine_tuned_model",
      "timeout": 3600
    }
  },
  {
    "id": "seed:upscale:generic",
    "label": "Upscale ảnh",
    "kind": "upscale",
    "provider": "openai-compatible",
    "description": "Gửi ảnh nguồn + hệ số phóng đại, nhận ảnh đã làm nét.",
    "config": {
      "endpoint": "/images/upscale",
      "body": {
        "model": "{{model}}",
        "image": "{{image}}",
        "scale": "{{scale}}"
      },
      "resultPath": "data.0.url",
      "timeout": 300
    }
  },
  {
    "id": "seed:video:generic",
    "label": "Tạo video — hàng đợi bất đồng bộ",
    "kind": "video",
    "provider": "openai-compatible",
    "description": "POST /videos → job id → hỏi trạng thái → tải file qua /content.",
    "config": {
      "endpoint": "/videos",
      "method": "POST",
      "body": {
        "model": "{{model}}",
        "prompt": "{{prompt}}",
        "seconds": "{{duration}}",
        "size": "{{size}}",
        "input_reference": "{{image}}"
      },
      "jobPath": "id",
      "pollEndpoint": "/videos/{{job}}",
      "statusPath": "status",
      "doneValues": [
        "completed",
        "succeeded",
        "success",
        "done"
      ],
      "failedValues": [
        "failed",
        "error",
        "cancelled"
      ],
      "contentEndpoint": "/videos/{{job}}/content",
      "resultPath": "data.0.url",
      "timeout": 900
    }
  },
  {
    "id": "seed:video:sync",
    "label": "Tạo video — trả kết quả ngay",
    "kind": "video",
    "provider": "openai-compatible",
    "description": "Dùng khi gateway chờ và trả thẳng URL video trong một request.",
    "config": {
      "endpoint": "/videos",
      "body": {
        "model": "{{model}}",
        "prompt": "{{prompt}}",
        "image": "{{image}}",
        "seconds": "{{duration}}"
      },
      "resultPath": "data.0.url",
      "timeout": 900
    }
  },
  {
    "id": "seed:video:piapi-omni-reference",
    "label": "Omni Reference · Seedance 2 Mini · 4–15s",
    "kind": "video",
    "provider": "piapi",
    "description": "Tham chiếu 1–9 ảnh, chế độ omni_reference cố định. Seedance 2 Mini qua PiAPI, thời lượng 4–15 giây, mặc định 480p. Cần ảnh URL công khai và API key PiAPI riêng; không dùng key IOOAI.",
    "config": {
      "endpoint": "/task",
      "body": {
        "model": "seedance",
        "task_type": "seedance-2-mini-less-restriction",
        "input": {
          "prompt": "{{prompt}}",
          "mode": "omni_reference",
          "duration": "{{piapiDuration}}",
          "aspect_ratio": "{{piapiAspect}}",
          "resolution": "{{resolution}}",
          "image_urls": "{{imageUrls}}"
        }
      },
      "jobPath": "data.task_id",
      "pollEndpoint": "/task/{{job}}",
      "statusPath": "data.status",
      "doneValues": [
        "completed"
      ],
      "failedValues": [
        "failed"
      ],
      "resultPath": "data.output.video",
      "timeout": 600
    }
  },
  {
    "id": "seed:video:piapi-seedance",
    "label": "Tạo video — PiAPI Seedance (bản tiêu chuẩn, 480p, tiết kiệm chi phí)",
    "kind": "video",
    "provider": "piapi",
    "description": "Gọi thẳng PiAPI (model \"seedance\", task_type \"seedance-2-fast-less-restriction\" — vẫn là tier tiêu chuẩn/fast của PiAPI, không phải bản pro, chỉ khác là tier \"less restriction\" chính PiAPI bán công khai trong dashboard của họ, kiểm duyệt nới hơn cho ảnh→video có khuôn mặt người — đã kiểm chứng: tier thường (seedance-2-fast) chặn ảnh→video có mặt người thật với lỗi content moderation, còn tier less-restriction thì chạy được). Độ phân giải mặc định 480p để tiết kiệm chi phí. Không có ảnh nối vào → chữ thành video (text_to_video). Có ảnh nối vào VÀ ảnh đó là URL công khai (http/https, không phải file lưu local trên máy bạn) → tự chuyển sang ảnh thành video (first_last_frames, tối đa 2 ảnh). Nhập API key PiAPI ở Cài đặt → mục PiAPI — không cần bấm kiểm tra kết nối, cứ lưu key là dùng được ngay.",
    "config": {
      "endpoint": "/task",
      "body": {
        "model": "seedance",
        "task_type": "seedance-2-fast-less-restriction",
        "input": {
          "prompt": "{{prompt}}",
          "mode": "{{piapiMode}}",
          "duration": "{{piapiDuration}}",
          "aspect_ratio": "{{piapiAspect}}",
          "resolution": "{{resolution}}",
          "image_urls": "{{imageUrls}}"
        }
      },
      "jobPath": "data.task_id",
      "pollEndpoint": "/task/{{job}}",
      "statusPath": "data.status",
      "doneValues": [
        "completed"
      ],
      "failedValues": [
        "failed"
      ],
      "resultPath": "data.output.video",
      "timeout": 600
    }
  },
  {
    "id": "runninghub:wan-2.7",
    "label": "RunningHub · Alibaba Wan 2.7 Video (Ảnh sang Video)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Alibaba Wan 2.7 qua RunningHub OpenAPI v2: Tạo video người mẫu, phom dáng chuyển động mượt mà và sắc nét.",
    "config": {
      "endpoint": "/alibaba/wan-2.7/image-to-video",
      "method": "POST",
      "body": {
        "prompt": "{{prompt}}",
        "firstImageUrl": "{{firstImageUrl}}",
        "resolution": "{{resolution}}",
        "duration": "{{duration}}"
      },
      "jobPath": "taskId",
      "pollEndpoint": "/query",
      "pollMethod": "POST",
      "statusPath": "status",
      "doneValues": ["SUCCESS", "success", "completed"],
      "failedValues": ["FAILED", "failed", "error"],
      "resultPath": "results.0.url",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:wan-2.7-t2v",
    "label": "RunningHub · Alibaba Wan 2.7 Video (Chữ sang Video)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Alibaba Wan 2.7 Text-to-Video qua RunningHub OpenAPI v2.",
    "config": {
      "endpoint": "/alibaba/wan-2.7/text-to-video",
      "method": "POST",
      "body": {
        "prompt": "{{prompt}}",
        "resolution": "{{resolution}}",
        "duration": "{{duration}}",
        "aspectRatio": "{{aspectRatio}}"
      },
      "jobPath": "taskId",
      "pollEndpoint": "/query",
      "pollMethod": "POST",
      "statusPath": "status",
      "doneValues": ["SUCCESS", "success", "completed"],
      "failedValues": ["FAILED", "failed", "error"],
      "resultPath": "results.0.url",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:kling-2.6-pro",
    "label": "RunningHub · Kling 2.6 Pro Video (Vũ đạo & Chuyển động người mẫu)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Kling 2.6 Pro qua RunningHub OpenAPI v2: Chuyển động người thật xuất sắc, camera điện ảnh.",
    "config": {
      "endpoint": "/kling-v2.6-pro/image-to-video",
      "method": "POST",
      "body": {
        "prompt": "{{prompt}}",
        "imageUrl": "{{imageUrl}}",
        "duration": "{{duration}}",
        "sound": "false"
      },
      "jobPath": "taskId",
      "pollEndpoint": "/query",
      "pollMethod": "POST",
      "statusPath": "status",
      "doneValues": ["SUCCESS", "success", "completed"],
      "failedValues": ["FAILED", "failed", "error"],
      "resultPath": "results.0.url",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:kling-3.0-pro",
    "label": "RunningHub · Kling 3.0 Pro Video (Thế hệ mới)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Kling 3.0 Pro qua RunningHub OpenAPI v2: Đỉnh cao video thế hệ mới của Kuaishou.",
    "config": {
      "endpoint": "/kling-v3.0-pro/image-to-video",
      "method": "POST",
      "body": {
        "prompt": "{{prompt}}",
        "firstImageUrl": "{{firstImageUrl}}",
        "duration": "{{duration}}",
        "sound": "false"
      },
      "jobPath": "taskId",
      "pollEndpoint": "/query",
      "pollMethod": "POST",
      "statusPath": "status",
      "doneValues": ["SUCCESS", "success", "completed"],
      "failedValues": ["FAILED", "failed", "error"],
      "resultPath": "results.0.url",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:vidu-q2-pro",
    "label": "RunningHub · Vidu Q2 Pro Video (Ảnh sang Video)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Vidu Q2 Pro qua RunningHub OpenAPI v2: Góc máy năng động, biểu cảm sống động.",
    "config": {
      "endpoint": "/vidu/image-to-video-q2-pro",
      "method": "POST",
      "body": {
        "prompt": "{{prompt}}",
        "imageUrl": "{{imageUrl}}",
        "resolution": "{{resolution}}",
        "duration": "{{duration}}",
        "movementAmplitude": "{{movementAmplitude}}",
        "bgm": "{{bgm}}"
      },
      "jobPath": "taskId",
      "pollEndpoint": "/query",
      "pollMethod": "POST",
      "statusPath": "status",
      "doneValues": ["SUCCESS", "success", "completed"],
      "failedValues": ["FAILED", "failed", "error"],
      "resultPath": "results.0.url",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:seedance-2.5",
    "label": "RunningHub · ByteDance Seedance 2.5 Video",
    "kind": "video",
    "provider": "runninghub",
    "description": "ByteDance Seedance 2.5 Token qua RunningHub OpenAPI v2.",
    "config": {
      "endpoint": "/bytedance/seedance-2.5-token/image-to-video",
      "method": "POST",
      "body": {
        "prompt": "{{prompt}}",
        "firstFrameUrl": "{{firstFrameUrl}}",
        "resolution": "{{resolution}}",
        "duration": "{{duration}}"
      },
      "jobPath": "taskId",
      "pollEndpoint": "/query",
      "pollMethod": "POST",
      "statusPath": "status",
      "doneValues": ["SUCCESS", "success", "completed"],
      "failedValues": ["FAILED", "failed", "error"],
      "resultPath": "results.0.url",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:rhart-image-g-2",
    "label": "RunningHub · GPT-Image 2.0 HD (Tạo ảnh & Poster)",
    "kind": "image",
    "provider": "runninghub",
    "description": "RunningHub GPT-Image 2.0 tạo ảnh thời trang, poster sắc nét qua OpenAPI v2.",
    "config": {
      "endpoint": "/rhart-image-g-2/text-to-image",
      "method": "POST",
      "body": {
        "prompt": "{{prompt}}",
        "aspectRatio": "{{aspectRatio}}",
        "resolution": "1k"
      },
      "jobPath": "taskId",
      "pollEndpoint": "/query",
      "pollMethod": "POST",
      "statusPath": "status",
      "doneValues": ["SUCCESS", "success", "completed"],
      "failedValues": ["FAILED", "failed", "error"],
      "resultPath": "results.0.url",
      "timeout": 300
    }
  },
  {
    "id": "runninghub:animate-anyone",
    "label": "RunningHub · AnimateAnyone (Cần Workflow ID riêng)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Workflow ComfyUI AnimateAnyone trên RunningHub (cần workflowId cá nhân). Khuyên dùng Kling 2.6 Pro hoặc Wan 2.7 để tạo video người mẫu ngay.",
    "config": {
      "endpoint": "/task/openapi/create",
      "method": "POST",
      "body": {
        "workflowId": "{{workflowId}}",
        "nodeInputs": {
          "image": "{{image}}",
          "video": "{{video}}"
        }
      },
      "jobPath": "data.taskId",
      "pollEndpoint": "/task/openapi/status",
      "pollMethod": "POST",
      "statusPath": "data.status",
      "doneValues": [
        "SUCCESS",
        "completed"
      ],
      "failedValues": [
        "FAILED",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:champ",
    "label": "RunningHub · Champ 3D Human (Xoay người 3D không dị dạng)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Mô hình Champ của ByteDance dùng khung hình thể 3D SMPL để xoay vòng nhân vật.",
    "config": {
      "endpoint": "/task/openapi/create",
      "method": "POST",
      "body": {
        "workflowId": "champ_3d_workflow",
        "nodeInputs": {
          "image": "{{image}}",
          "video": "{{video}}"
        }
      },
      "jobPath": "data.taskId",
      "pollEndpoint": "/task/openapi/status",
      "pollMethod": "POST",
      "statusPath": "data.status",
      "doneValues": [
        "SUCCESS",
        "completed"
      ],
      "failedValues": [
        "FAILED",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:image-flux",
    "label": "RunningHub · Flux / SD Image Task",
    "kind": "image",
    "provider": "runninghub",
    "description": "Sinh ảnh qua ComfyUI Flux / SD workflow trên RunningHub",
    "config": {
      "endpoint": "/task/openapi/create",
      "method": "POST",
      "body": {
        "workflowId": "default_image_flux",
        "apiKey": "{{apiKey}}",
        "nodeInputs": {
          "prompt": "{{prompt}}"
        }
      },
      "jobPath": "data.taskId",
      "pollEndpoint": "/task/openapi/status",
      "pollMethod": "POST",
      "statusPath": "data.status",
      "doneValues": [
        "SUCCESS",
        "completed"
      ],
      "failedValues": [
        "FAILED",
        "failed",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 300
    }
  },
  {
    "id": "runninghub:kling-1.5",
    "label": "RunningHub · Kling 1.5 (Chuyển động người thật & Cận chiến)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Kling AI qua RunningHub ComfyUI: Xuất sắc về mô phỏng động tác võ thuật, đấm đá mượt mà và camera dolly/pan điện ảnh.",
    "config": {
      "endpoint": "/task/openapi/create",
      "method": "POST",
      "body": {
        "workflowId": "kling_1_5_video_workflow",
        "apiKey": "{{apiKey}}",
        "nodeInputs": {
          "prompt": "{{prompt}}",
          "image": "{{image}}"
        }
      },
      "jobPath": "data.taskId",
      "pollEndpoint": "/task/openapi/status",
      "pollMethod": "POST",
      "statusPath": "data.status",
      "doneValues": [
        "SUCCESS",
        "completed"
      ],
      "failedValues": [
        "FAILED",
        "failed",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:kolors-tryon",
    "label": "RunningHub · Kolors Virtual Try-On (Thử đồ thời trang Kolors)",
    "kind": "image",
    "provider": "runninghub",
    "description": "Thử đồ thời trang bằng mô hình Kolors TryOn từ Kuaishou trên ComfyUI Cloud.",
    "config": {
      "endpoint": "/task/openapi/create",
      "method": "POST",
      "body": {
        "workflowId": "kolors_tryon_workflow",
        "nodeInputs": {
          "person": "{{image}}",
          "garment": "{{garment}}"
        }
      },
      "jobPath": "data.taskId",
      "pollEndpoint": "/task/openapi/status",
      "pollMethod": "POST",
      "statusPath": "data.status",
      "doneValues": [
        "SUCCESS",
        "completed"
      ],
      "failedValues": [
        "FAILED",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 300
    }
  },
  {
    "id": "runninghub:liveportrait",
    "label": "RunningHub · LivePortrait (Nhái biểu cảm khuôn mặt & cử động đầu)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Chuyển động chớp mắt, khẩu hình và nụ cười từ video mẫu sang chân dung tĩnh.",
    "config": {
      "endpoint": "/task/openapi/create",
      "method": "POST",
      "body": {
        "workflowId": "liveportrait_face_workflow",
        "nodeInputs": {
          "image": "{{image}}",
          "video": "{{video}}"
        }
      },
      "jobPath": "data.taskId",
      "pollEndpoint": "/task/openapi/status",
      "pollMethod": "POST",
      "statusPath": "data.status",
      "doneValues": [
        "SUCCESS",
        "completed"
      ],
      "failedValues": [
        "FAILED",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 600
    }
  },
  {
    "id": "runninghub:mimicmotion",
    "label": "RunningHub · MimicMotion 一键跳舞 (Cần Workflow ID riêng)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Workflow ComfyUI MimicMotion trên RunningHub (cần workflowId cá nhân). Khuyên dùng Kling 2.6 Pro hoặc Wan 2.7 để tạo video người mẫu ngay.",
    "config": {
      "endpoint": "/task/openapi/create",
      "method": "POST",
      "body": {
        "workflowId": "{{workflowId}}",
        "apiKey": "{{apiKey}}",
        "nodeInputs": {
          "image": "{{image}}",
          "video": "{{video}}"
        }
      },
      "jobPath": "data.taskId",
      "pollEndpoint": "/task/openapi/status",
      "pollMethod": "POST",
      "statusPath": "data.status",
      "doneValues": [
        "SUCCESS",
        "completed"
      ],
      "failedValues": [
        "FAILED",
        "failed",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:video-comfyui",
    "label": "RunningHub · Video ComfyUI Task",
    "kind": "video",
    "provider": "runninghub",
    "description": "Chạy quy trình sinh video ComfyUI / Kling qua RunningHub OpenAPI",
    "config": {
      "endpoint": "/task/openapi/create",
      "method": "POST",
      "body": {
        "workflowId": "default_video_workflow",
        "apiKey": "{{apiKey}}",
        "nodeInputs": {
          "prompt": "{{prompt}}",
          "image": "{{image}}"
        }
      },
      "jobPath": "data.taskId",
      "pollEndpoint": "/task/openapi/status",
      "pollMethod": "POST",
      "statusPath": "data.status",
      "doneValues": [
        "SUCCESS",
        "completed"
      ],
      "failedValues": [
        "FAILED",
        "failed",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:wan-2.1",
    "label": "RunningHub · Wan 2.1 (Võ thuật & Siêu năng lực)",
    "kind": "video",
    "provider": "runninghub",
    "description": "Alibaba Wan 2.1 qua RunningHub ComfyUI: Đỉnh cao thế giới về hiệu ứng đánh nhau, sóng xung kích, sét lửa và góc máy 3D xoay quanh điểm nổ.",
    "config": {
      "endpoint": "/task/openapi/create",
      "method": "POST",
      "body": {
        "workflowId": "wan_2_1_video_workflow",
        "apiKey": "{{apiKey}}",
        "nodeInputs": {
          "prompt": "{{prompt}}",
          "image": "{{image}}"
        }
      },
      "jobPath": "data.taskId",
      "pollEndpoint": "/task/openapi/status",
      "pollMethod": "POST",
      "statusPath": "data.status",
      "doneValues": [
        "SUCCESS",
        "completed"
      ],
      "failedValues": [
        "FAILED",
        "failed",
        "error"
      ],
      "resultPath": "data.outputUrl",
      "timeout": 900
    }
  },
  {
    "id": "runninghub:gemini-3.8-flash",
    "label": "RunningHub · Gemini 3.8 Flash (LLM)",
    "kind": "chat",
    "provider": "runninghub-llm",
    "description": "Gemini 3.8 Flash qua RunningHub LLM Gateway",
    "config": {
      "endpoint": "/chat/completions",
      "body": {
        "model": "google/gemini-3.8-flash",
        "messages": [
          {
            "role": "user",
            "content": "{{prompt}}"
          }
        ]
      },
      "resultPath": "choices.0.message.content"
    }
  },
  {
    "id": "runninghub:gpt-6.1-sol",
    "label": "RunningHub · GPT 6.1 Sol (LLM)",
    "kind": "chat",
    "provider": "runninghub-llm",
    "description": "OpenAI-compatible LLM Gateway qua RunningHub",
    "config": {
      "endpoint": "/chat/completions",
      "body": {
        "model": "openai/gpt-6.1-sol",
        "messages": [
          {
            "role": "user",
            "content": "{{prompt}}"
          }
        ]
      },
      "resultPath": "choices.0.message.content"
    }
  },
  {
    "id": "siliconflow:flux-schnell",
    "label": "SiliconFlow · FLUX.1 Schnell (Tạo ảnh siêu tốc)",
    "kind": "image",
    "provider": "siliconflow",
    "description": "Mô hình FLUX.1 Schnell 4 bước tạo ảnh siêu nhanh trên SiliconFlow.",
    "config": {
      "endpoint": "/v1/images/generations",
      "method": "POST",
      "body": {
        "model": "black-forest-labs/FLUX.1-schnell",
        "prompt": "{{prompt}}",
        "image_size": "1024x1024"
      },
      "resultPath": "images.0.url",
      "timeout": 120
    }
  },
  {
    "id": "siliconflow:kolors",
    "label": "SiliconFlow · Kolors (Kuaishou Tạo ảnh phong cách Châu Á)",
    "kind": "image",
    "provider": "siliconflow",
    "description": "Mô hình Kolors của Kuaishou, hiểu tiếng Trung và tạo chân dung người mẫu Châu Á cực đẹp.",
    "config": {
      "endpoint": "/v1/images/generations",
      "method": "POST",
      "body": {
        "model": "Kwai-Kolors/Kolors",
        "prompt": "{{prompt}}",
        "image_size": "1024x1024"
      },
      "resultPath": "images.0.url",
      "timeout": 180
    }
  },
  {
    "id": "siliconflow:wan2.1-i2v-14b",
    "label": "SiliconFlow · Wan 2.1 I2V 14B (Ảnh sang Video 720p)",
    "kind": "video",
    "provider": "siliconflow",
    "description": "Mô hình Wan 2.1 14B Image-to-Video trên SiliconFlow.",
    "config": {
      "endpoint": "/v1/video/submit",
      "method": "POST",
      "body": {
        "model": "Wan-AI/Wan2.1-I2V-14B-720P",
        "prompt": "{{prompt}}",
        "image": "{{image}}"
      },
      "jobPath": "requestId",
      "pollEndpoint": "/v1/video/status",
      "statusPath": "status",
      "doneValues": [
        "Succeed",
        "success"
      ],
      "failedValues": [
        "Failed",
        "error"
      ],
      "resultPath": "results.videos.0.url",
      "timeout": 900
    }
  },
  {
    "id": "siliconflow:wan2.1-t2v-14b",
    "label": "SiliconFlow · Wan 2.1 T2V 14B (Chữ sang Video 720p)",
    "kind": "video",
    "provider": "siliconflow",
    "description": "Mô hình Wan 2.1 14B Text-to-Video trên SiliconFlow Cloud.",
    "config": {
      "endpoint": "/v1/video/submit",
      "method": "POST",
      "body": {
        "model": "Wan-AI/Wan2.1-T2V-14B-720P",
        "prompt": "{{prompt}}"
      },
      "jobPath": "requestId",
      "pollEndpoint": "/v1/video/status",
      "statusPath": "status",
      "doneValues": [
        "Succeed",
        "success"
      ],
      "failedValues": [
        "Failed",
        "error"
      ],
      "resultPath": "results.videos.0.url",
      "timeout": 900
    }
  },
  {
    "id": "siliconflow:wan2.2-i2v-a14b",
    "label": "SiliconFlow · Wan 2.2 I2V A14B (Thế hệ Wan 2.2 Mới nhất)",
    "kind": "video",
    "provider": "siliconflow",
    "description": "Wan 2.2 I2V A14B tối ưu cho chuyển động camera và nhân vật mượt mà.",
    "config": {
      "endpoint": "/v1/video/submit",
      "method": "POST",
      "body": {
        "model": "Wan-AI/Wan2.2-I2V-A14B",
        "prompt": "{{prompt}}",
        "image": "{{image}}"
      },
      "jobPath": "requestId",
      "pollEndpoint": "/v1/video/status",
      "statusPath": "status",
      "doneValues": [
        "Succeed",
        "success"
      ],
      "failedValues": [
        "Failed",
        "error"
      ],
      "resultPath": "results.videos.0.url",
      "timeout": 900
    }
  }
];

/** Bump when a preset's shape changes so existing installs pick it up. */
const PRESET_VERSION = 19;

export function seedModels(): void {
  const db = getDb();
  const stored = db
    .prepare("SELECT value FROM settings WHERE key = 'preset_version'")
    .get() as { value: string } | undefined;
  const version = stored ? Number(JSON.parse(stored.value)) : 0;

  const upsert = db.prepare(
    `INSERT INTO models(id, label, kind, provider, description, config, builtin, created_at)
     VALUES(?, ?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       kind = excluded.kind,
       provider = excluded.provider,
       description = excluded.description,
       config = excluded.config
     WHERE models.builtin = 1`,
  );

  if (version < PRESET_VERSION) {
    for (const preset of PRESETS) {
      upsert.run(
        preset.id,
        preset.label,
        preset.kind,
        preset.provider,
        preset.description ?? null,
        JSON.stringify(preset.config),
        now(),
      );
    }
    db.prepare(
      "INSERT INTO settings(key, value) VALUES('preset_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(JSON.stringify(PRESET_VERSION));
    return;
  }

  // First run on a fresh install: create any missing presets.
  const count = db.prepare("SELECT COUNT(*) AS n FROM models WHERE builtin = 1").get() as { n: number };
  if (count.n === 0) {
    for (const preset of PRESETS) {
      upsert.run(
        preset.id,
        preset.label,
        preset.kind,
        preset.provider,
        preset.description ?? null,
        JSON.stringify(preset.config),
        now(),
      );
    }
  }
}

export function listModels(kind?: ModelKind): ModelRecord[] {
  seedModels();
  const rows = kind
    ? getDb().prepare("SELECT * FROM models WHERE kind = ? ORDER BY builtin DESC, created_at ASC").all(kind)
    : getDb().prepare("SELECT * FROM models ORDER BY builtin DESC, created_at ASC").all();
  return (rows as Record<string, unknown>[]).map(rowToModel);
}

export function getModel(id: string): ModelRecord | null {
  seedModels();
  const row = getDb().prepare("SELECT * FROM models WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToModel(row) : null;
}

export function rowToModel(row: Record<string, unknown>): ModelRecord {
  return {
    id: String(row.id),
    label: String(row.label),
    kind: row.kind as ModelKind,
    provider: String(row.provider),
    description: row.description ? String(row.description) : undefined,
    config: JSON.parse(String(row.config)) as ModelConfig,
    builtin: Boolean(row.builtin),
    createdAt: Number(row.created_at),
  };
}

export function upsertModel(input: {
  id?: string;
  label: string;
  kind: ModelKind;
  provider?: string;
  description?: string;
  config: ModelConfig;
}): ModelRecord {
  const db = getDb();
  const id = input.id ?? `model_${crypto.randomUUID().slice(0, 8)}`;
  const existing = getModel(id);
  if (existing?.builtin && input.id) {
    // Built-ins are templates: editing one creates a copy so the preset stays intact.
    return upsertModel({ ...input, id: `model_${crypto.randomUUID().slice(0, 8)}` });
  }
  db.prepare(
    `INSERT INTO models(id, label, kind, provider, description, config, builtin, created_at)
     VALUES(?, ?, ?, ?, ?, ?, 0, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       kind = excluded.kind,
       provider = excluded.provider,
       description = excluded.description,
       config = excluded.config`,
  ).run(
    id,
    input.label,
    input.kind,
    input.provider ?? "openai-compatible",
    input.description ?? null,
    JSON.stringify(input.config),
    now(),
  );
  return getModel(id)!;
}

export function deleteModel(id: string): void {
  getDb().prepare("DELETE FROM models WHERE id = ? AND builtin = 0").run(id);
}
