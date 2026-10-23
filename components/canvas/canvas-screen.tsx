"use client";

import { withBasePath } from "@/lib/base-path";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StudioCanvas } from "@/components/canvas/studio-canvas";
import { api } from "@/lib/api-client";
import { useStudio } from "@/lib/studio-store";
import { useUi } from "@/lib/ui-store";
import type { ProjectSummary } from "@/lib/types";

const LAST_PROJECT_KEY = "hinton:last-project-id";

export function CanvasScreen({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { tr } = useUi();
  const setProject = useStudio((s) => s.setProject);
  const [project, setLocalProject] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigating = useRef(false);

  useEffect(() => {
    if (!projectId) {
      if (navigating.current) return;
      navigating.current = true;

      const lastId = typeof window !== "undefined" ? localStorage.getItem(LAST_PROJECT_KEY) : null;
      const studioPrj = useStudio.getState().project;
      const candidateId = lastId || studioPrj?.id;

      api.projects
        .list()
        .then((list) => {
          if (candidateId) {
            const found = list.find((p) => p.id === candidateId);
            if (found) {
              setLocalProject(found);
              setProject(found);
              router.replace(`/canvas/${found.id}`);
              return;
            }
          }
          if (list.length > 0) {
            const latest = list[0];
            setLocalProject(latest);
            setProject(latest);
            router.replace(`/canvas/${latest.id}`);
            return;
          }
          // Only create new if database is completely empty
          return api.projects.create("Không gian mới").then((created) => {
            setLocalProject(created);
            setProject(created);
            if (typeof window !== "undefined") {
              localStorage.setItem(LAST_PROJECT_KEY, created.id);
            }
            router.replace(`/canvas/${created.id}`);
          });
        })
        .catch((err: Error) => {
          navigating.current = false;
          setError(err.message);
        });
      return;
    }

    fetch(withBasePath(`/api/projects/${projectId}`))
      .then(async (res) => {
        if (!res.ok) throw new Error("Không tìm thấy dự án");
        return (await res.json()) as ProjectSummary;
      })
      .then((data) => {
        setLocalProject(data);
        setProject(data);
        if (typeof window !== "undefined") {
          localStorage.setItem(LAST_PROJECT_KEY, data.id);
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [projectId, router, setProject]);

  if (error) {
    return (
      <div className="grid h-full place-items-center">
        <div className="text-center">
          <p className="text-[14px] text-ink-300">{error}</p>
          <a href={withBasePath("/")} className="mt-3 inline-block text-[12.5px] text-brass-400 hover:underline">
            ← {tr("nav.projects")}
          </a>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[13px] text-ink-500">
        <span className="spin-slow inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" />
        {tr("common.loading")}
      </div>
    );
  }

  return <StudioCanvas project={project} />;
}
