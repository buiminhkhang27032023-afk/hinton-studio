import { NextResponse } from "next/server";
import { getDb, now, uid } from "@/lib/db";
import { getPublicUrlSettings } from "@/lib/public-url";
import { getGraph, saveGraph, listProjects } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TaskItem {
  id: string;
  projectId?: string;
  title?: string;
  prompt: string;
  media?: Record<string, string>;
  status: "pending" | "processing" | "completed";
  createdAt: number;
  result?: unknown;
}

/**
 * GET /api/muse/tasks
 * Muse calls this to fetch any pending tasks/prompts created by the user from Hinton Studio.
 */
export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM muse_tasks ORDER BY created_at DESC").all() as Array<{
      id: string;
      project_id: string | null;
      title: string | null;
      prompt: string;
      media: string | null;
      status: string;
      result: string | null;
      created_at: number;
    }>;

    const tasks: TaskItem[] = rows.map((r) => ({
      id: r.id,
      projectId: r.project_id ?? undefined,
      title: r.title ?? undefined,
      prompt: r.prompt,
      media: r.media ? JSON.parse(r.media) : undefined,
      status: r.status as "pending" | "processing" | "completed",
      createdAt: r.created_at,
      result: r.result ? JSON.parse(r.result) : undefined,
    }));

    const pending = tasks.filter((t) => t.status === "pending");

    return NextResponse.json({
      ok: true,
      pendingCount: pending.length,
      tasks: pending,
      allTasksCount: tasks.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi đọc tasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/muse/tasks
 * Can be called either by Studio UI (to create a task for Muse)
 * or by Muse (to submit a completed result back to Studio).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: "create_task" | "submit_result";
      taskId?: string;
      prompt?: string;
      title?: string;
      projectId?: string;
      media?: Record<string, string>;
      result?: {
        title?: string;
        script?: string;
        scenes?: Array<{ time?: string; visual?: string; audio?: string }>;
        characters?: Array<{ name?: string; description?: string }>;
        reply?: string;
      };
    };

    const db = getDb();

    // 1. Studio creates a task for Muse
    if (body.action === "create_task" || body.prompt) {
      const taskId = body.taskId || uid("task");
      const createdAt = now();
      const mediaStr = body.media ? JSON.stringify(body.media) : null;

      db.prepare(
        "INSERT INTO muse_tasks(id, project_id, title, prompt, media, status, result, created_at) VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?)"
      ).run(taskId, body.projectId ?? null, body.title ?? null, body.prompt ?? "", mediaStr, createdAt);

      return NextResponse.json({
        ok: true,
        message: "Đã tạo nhiệm vụ cho Meta Muse trong hàng đợi!",
        task: {
          id: taskId,
          projectId: body.projectId,
          title: body.title,
          prompt: body.prompt || "",
          media: body.media,
          status: "pending",
          createdAt,
        },
      });
    }

    // 2. Muse submits result back to Studio
    if (body.action === "submit_result" || body.result) {
      const taskId = body.taskId;
      if (taskId) {
        db.prepare("UPDATE muse_tasks SET status = 'completed', result = ? WHERE id = ?").run(
          JSON.stringify(body.result),
          taskId
        );
      }

      // If Muse provided script or scenes, automatically inject onto Canvas
      const projects = listProjects();
      const targetProjectId = body.projectId || (projects.length > 0 ? projects[0].id : "");

      if (targetProjectId && body.result) {
        const currentGraph = getGraph(targetProjectId);
        const existingNodes = [...(currentGraph.nodes || [])];
        const existingEdges = [...(currentGraph.edges || [])];

        let maxY = 0;
        for (const node of existingNodes as Array<{ position?: { y?: number } }>) {
          if (node.position?.y && node.position.y > maxY) maxY = node.position.y;
        }
        const startY = maxY > 0 ? maxY + 450 : 100;
        let currentX = 100;

        const res = body.result;
        if (res.script || res.reply) {
          existingNodes.push({
            id: `muse_reply_${uid()}`,
            type: "prompt",
            position: { x: currentX, y: startY },
            data: {
              label: `💬 Phản hồi từ Meta Muse: ${res.title || "Kịch bản"}`,
              prompt: res.script || res.reply,
              status: "idle",
            },
          });
          currentX += 450;
        }

        if (res.scenes && Array.isArray(res.scenes)) {
          res.scenes.forEach((sc, i) => {
            existingNodes.push({
              id: `muse_scene_${uid()}`,
              type: "prompt",
              position: { x: currentX, y: startY },
              data: {
                label: `🎬 [${sc.time || `Cảnh ${i + 1}`}]`,
                prompt: `${sc.visual || ""}${sc.audio ? `\n🔊 ${sc.audio}` : ""}`,
                status: "idle",
              },
            });
            currentX += 450;
          });
        }

        saveGraph(targetProjectId, {
          nodes: existingNodes,
          edges: existingEdges,
          viewport: currentGraph.viewport,
        });
      }

      return NextResponse.json({
        ok: true,
        message: "Đã nhận kết quả từ Meta Muse và cập nhật lên Canvas thành công!",
        taskId,
        projectId: targetProjectId,
      });
    }

    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi xử lý task queue" },
      { status: 500 }
    );
  }
}
