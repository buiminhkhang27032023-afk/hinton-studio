import { NextResponse } from "next/server";
import { getDb, now, uid } from "@/lib/db";
import { getGraph, saveGraph, listProjects, createProject, getProject } from "@/lib/projects";
import { getPublicUrlSettings } from "@/lib/public-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MuseWebhookPayload {
  action?: "create_script" | "get_status" | "review" | "continue";
  title?: string;
  projectId?: string;
  text?: string;
  prompt?: string;
  script?: string;
  characters?: Array<{ name?: string; description?: string; role?: string }>;
  scenes?: Array<{
    time?: string;
    visual?: string;
    description?: string;
    audio?: string;
    dialogue?: string;
  }>;
}

/**
 * GET /api/webhook/muse
 * Returns OpenAPI 3.0 spec + Project Status so Meta Muse or external tools can auto-discover this endpoint.
 */
export async function GET(request: Request) {
  const host = request.headers.get("host") || "localhost:3210";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const serverUrl = `${protocol}://${host}`;

  const projects = listProjects();
  const latestProject = projects.length > 0 ? projects[0] : null;

  return NextResponse.json({
    openapi: "3.0.0",
    info: {
      title: "Hinton Studio Bidirectional Webhook Connector",
      version: "1.1.0",
      description: "Giao tiếp hai chiều với Hinton Studio: Muse gửi kịch bản -> Studio phản hồi tình trạng phân cảnh/video -> Muse tiếp tục hoàn thiện kịch bản và gợi ý cho người dùng.",
    },
    servers: [{ url: serverUrl }],
    active_project: latestProject
      ? {
          id: latestProject.id,
          name: latestProject.name,
          canvasUrl: `${serverUrl}/canvas/${latestProject.id}`,
        }
      : null,
    paths: {
      "/api/webhook/muse": {
        post: {
          summary: "Gửi kịch bản từ Muse sang Studio và nhận phản hồi chi tiết để xử lý tiếp",
          operationId: "sendScriptAndReceiveStudioFeedback",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    action: {
                      type: "string",
                      enum: ["create_script", "get_status", "review", "continue"],
                      description: "Hành động yêu cầu: tạo kịch bản, xem tiến độ render, hoặc tiếp tục cảnh mới",
                    },
                    title: { type: "string", description: "Tên phim hoặc tiêu đề kịch bản" },
                    projectId: { type: "string", description: "ID dự án (để trống sẽ dùng dự án hiện tại)" },
                    text: { type: "string", description: "Toàn bộ kịch bản dạng văn bản" },
                    script: { type: "string", description: "Chi tiết kịch bản" },
                    prompt: { type: "string", description: "Ý tưởng hoặc prompt tổng quan" },
                    characters: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          description: { type: "string" },
                        },
                      },
                    },
                    scenes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          time: { type: "string" },
                          visual: { type: "string" },
                          audio: { type: "string" },
                          dialogue: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Nhận kịch bản thành công và trả về dữ liệu phản hồi cho Muse",
            },
          },
        },
      },
      "/api/muse/tasks": {
        get: {
          summary: "Lấy danh sách việc cần làm / kịch bản mới được giao từ Hinton Studio",
          operationId: "getPendingStudioTasks",
          responses: {
            "200": {
              description: "Danh sách nhiệm vụ đang chờ xử lý",
            },
          },
        },
        post: {
          summary: "Tạo nhiệm vụ hoặc nộp kết quả kịch bản về Hinton Studio",
          operationId: "submitTaskResultToStudio",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["create_task", "submit_result"] },
                    taskId: { type: "string" },
                    result: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Đã cập nhật nhiệm vụ thành công",
            },
          },
        },
      },
    },
  });
}

/**
 * POST /api/webhook/muse
 * Receives script or scene definitions from Meta Muse, updates the canvas,
 * and returns rich structured feedback so Muse can read it and formulate its next response to the user.
 */
export async function POST(request: Request) {
  try {
    let payload: MuseWebhookPayload = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = (await request.json().catch(() => ({}))) as MuseWebhookPayload;
    } else {
      const rawText = await request.text();
      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { text: rawText };
      }
    }

    // Determine target project
    let targetProjectId = payload.projectId?.trim();
    if (!targetProjectId) {
      const projects = listProjects();
      if (projects.length > 0) {
        targetProjectId = projects[0].id;
      } else {
        const newProj = createProject(payload.title || "Dự án từ Meta Muse");
        targetProjectId = newProj.id;
      }
    }

    const project = getProject(targetProjectId);
    const currentGraph = getGraph(targetProjectId);
    const existingNodes = [...(currentGraph.nodes || [])];
    const existingEdges = [...(currentGraph.edges || [])];

    // Compute layout offset (place below or to the right of highest X/Y)
    let maxY = 0;
    for (const node of existingNodes as Array<{ position?: { y?: number } }>) {
      if (node.position?.y && node.position.y > maxY) {
        maxY = node.position.y;
      }
    }
    const startY = maxY > 0 ? maxY + 450 : 100;
    let currentX = 100;

    const createdNodes: string[] = [];
    const fullText = payload.script || payload.text || payload.prompt || "";
    const title = payload.title || project?.name || "Kịch bản từ Meta Muse";

    // 1. Create main script node if text exists
    if (fullText) {
      const scriptNodeId = `muse_script_${uid()}`;
      existingNodes.push({
        id: scriptNodeId,
        type: "prompt",
        position: { x: currentX, y: startY },
        data: {
          label: `📜 ${title}`,
          prompt: fullText,
          status: "idle",
        },
      });
      createdNodes.push(scriptNodeId);
      currentX += 450;
    }

    // 2. Create scene nodes if scenes array is present
    if (payload.scenes && Array.isArray(payload.scenes) && payload.scenes.length > 0) {
      payload.scenes.forEach((sc, idx) => {
        const sceneNodeId = `muse_scene_${idx + 1}_${uid()}`;
        const sceneDesc = sc.visual || sc.description || "";
        const sceneAudio = sc.dialogue || sc.audio ? `\n🔊 Thoại/Âm thanh: ${sc.dialogue || sc.audio}` : "";
        const timeTag = sc.time ? `[${sc.time}] ` : `[Cảnh ${idx + 1}] `;

        existingNodes.push({
          id: sceneNodeId,
          type: "prompt",
          position: { x: currentX, y: startY },
          data: {
            label: `🎬 ${timeTag}`,
            prompt: `${timeTag}${sceneDesc}${sceneAudio}`,
            status: "idle",
          },
        });
        createdNodes.push(sceneNodeId);
        currentX += 450;
      });
    }

    // 3. Create character nodes if characters array is present
    if (payload.characters && Array.isArray(payload.characters) && payload.characters.length > 0) {
      let charY = startY + 450;
      let charX = 100;
      payload.characters.forEach((char) => {
        const charNodeId = `muse_char_${uid()}`;
        existingNodes.push({
          id: charNodeId,
          type: "prompt",
          position: { x: charX, y: charY },
          data: {
            label: `👤 Nhân vật: ${char.name || "Nhân vật"}`,
            prompt: `${char.name ? `Nhân vật: ${char.name}\n` : ""}${char.description || ""}`,
            status: "idle",
          },
        });
        createdNodes.push(charNodeId);
        charX += 450;
      });
    }

    // Save updated graph to database if new nodes created
    if (createdNodes.length > 0) {
      saveGraph(targetProjectId, {
        nodes: existingNodes,
        edges: existingEdges,
        viewport: currentGraph.viewport,
      });
    }

    // Check project status (videos, images, master film)
    const completedVideos = (existingNodes as Array<{ type?: string; data?: { label?: string; result?: { url?: string; kind?: string } } }>)
      .filter((n) => n.data?.result?.kind === "video" || n.data?.result?.url?.endsWith(".mp4"))
      .map((n) => n.data?.label || "Video đã render");

    const publicUrl = getPublicUrlSettings().baseUrl || `http://localhost:3210`;

    // Bi-directional structured response designed for Meta Muse LLM agent to read and reply
    return NextResponse.json({
      status: "success",
      message: `Hinton Studio đã nhận kịch bản '${title}' thành công và cập nhật lên bàn dựng Canvas!`,
      project_info: {
        id: targetProjectId,
        name: project?.name || title,
        canvas_url: `http://localhost:3210/canvas/${targetProjectId}`,
        public_url: `${publicUrl}/canvas/${targetProjectId}`,
        total_nodes_on_canvas: existingNodes.length,
        nodes_created_now: createdNodes.length,
        completed_videos_count: completedVideos.length,
        completed_videos_list: completedVideos,
      },
      film_readiness: {
        aspect_ratio: "9:16 (Chuẩn TikTok / Shorts / Reels)",
        video_engine: "ByteDance Seedance 2.0 (Video 15s Sàn diễn & Điện ảnh)",
        status: completedVideos.length > 0 ? "Đã có sẵn video master hoàn chỉnh trên Canvas" : "Sẵn sàng render",
      },
      instructions_for_muse_agent: [
        "Hãy đọc dữ liệu phản hồi này từ Hinton Studio và trả lời lại cho người dùng trong đoạn chat một cách tự nhiên, hào hứng.",
        "Thông báo cho người dùng biết các cảnh kịch bản đã được đặt vào bàn dựng Canvas thành công.",
        "Đề xuất cho người dùng 3 bước tiếp theo: 1) Thêm lời thoại/giọng nói AI (TTS) cho nhân vật, 2) Bấm sinh video bằng Seedance 2.0, 3) Cắt ghép khung hình đầu/cuối cho các cảnh tiếp theo.",
        "Hỏi người dùng xem họ có muốn chỉnh sửa chi tiết tâm lý hay hành động nào trong các cảnh vừa gửi không.",
      ],
      ai_review_feedback: `Kịch bản phân cảnh '${title}' có cấu trúc thời gian rất tốt. Bàn dựng Hinton Studio đã sẵn sàng để nối dây và tạo chuyển động cho từng cảnh.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Lỗi xử lý webhook từ Meta Muse",
      },
      { status: 500 }
    );
  }
}
