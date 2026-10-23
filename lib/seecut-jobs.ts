import type { Asset } from "@/lib/types";

export interface SeeCutJob {
  id: string;
  status: "queued" | "running" | "done" | "error";
  startedAt: number;
  endedAt?: number;
  log: string[];
  error?: string | null;
  inputName: string;
  inputUrl: string;
  resultUrl?: string;
  asset?: Asset | null;
  plan?: Record<string, unknown> | null;
  workdir: string;
  outputPath: string;
}

const globalJobs = globalThis as unknown as { __seecutJobs?: Map<string, SeeCutJob> };
if (!globalJobs.__seecutJobs) {
  globalJobs.__seecutJobs = new Map<string, SeeCutJob>();
}

export const jobsMap = globalJobs.__seecutJobs;
