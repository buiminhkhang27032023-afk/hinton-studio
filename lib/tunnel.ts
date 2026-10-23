import { spawn, type ChildProcess } from "node:child_process";
import { getSetting, setSetting } from "./db";
import { getPublicUrlSettings, isPubliclyReachable, savePublicUrlSettings } from "./public-url";

/**
 * Cloudflare Quick Tunnel: gives the local server a public https:// URL with no
 * account needed. Providers like IOOAI and PiAPI refuse localhost references,
 * so this is what makes reference images usable with them.
 *
 * The tunnel only runs while the user has it switched on; it is spawned as a
 * child process and its URL is parsed from stderr.
 */

let child: ChildProcess | null = null;
let starting: Promise<string> | null = null;

const CLOUDFLARED_CANDIDATES = [
  "cloudflared",
  "cloudflared.exe",
  "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
  "C:\\Program Files\\cloudflared\\cloudflared.exe",
];

function parseUrl(text: string): string | null {
  const match = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.exec(text);
  return match ? match[0] : null;
}

export function tunnelStatus(): { running: boolean; url: string; enabled: boolean } {
  const settings = getPublicUrlSettings();
  return { running: Boolean(child), url: settings.baseUrl, enabled: settings.enabled };
}

/** Start a quick tunnel pointing at the local server and remember its URL. */
export async function startTunnel(port: number): Promise<string> {
  if (child && getPublicUrlSettings().baseUrl) return getPublicUrlSettings().baseUrl;
  if (starting) return starting;

  starting = new Promise<string>((resolve, reject) => {
    let settled = false;
    let lastError = "";

    const attempt = (index: number) => {
      if (index >= CLOUDFLARED_CANDIDATES.length) {
        starting = null;
        reject(new Error(lastError || "Không tìm thấy cloudflared. Cài bằng: winget install Cloudflare.cloudflared"));
        return;
      }
      const bin = CLOUDFLARED_CANDIDATES[index];
      const proc = spawn(bin, ["tunnel", "--url", `http://localhost:${port}`, "--no-autoupdate"], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      const timer = setTimeout(() => {
        if (settled) return;
        proc.kill();
        lastError = "cloudflared không trả về URL sau 40 giây.";
        attempt(index + 1);
      }, 40_000);

      const onData = (chunk: Buffer) => {
        const text = chunk.toString();
        const url = parseUrl(text);
        if (url && !settled) {
          settled = true;
          clearTimeout(timer);
          child = proc;
          savePublicUrlSettings({ baseUrl: url, enabled: true });
          // Keep the process alive after the URL is found.
          proc.stderr?.on("data", () => {});
          resolve(url);
        }
      };

      proc.stdout?.on("data", onData);
      proc.stderr?.on("data", onData);
      proc.on("error", () => {
        if (settled) return;
        clearTimeout(timer);
        lastError = `Không chạy được ${bin}.`;
        attempt(index + 1);
      });
      proc.on("close", () => {
        if (settled) return;
        clearTimeout(timer);
        lastError = "cloudflared thoát trước khi có URL.";
        attempt(index + 1);
      });
    };

    attempt(0);
  });

  return starting;
}

export function stopTunnel(): void {
  if (child) {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
    child = null;
  }
  starting = null;
  const settings = getPublicUrlSettings();
  savePublicUrlSettings({ baseUrl: settings.baseUrl, enabled: false });
}

/** Verify the tunnel URL actually resolves before trusting it. */
export async function verifyTunnel(url: string): Promise<boolean> {
  if (!isPubliclyReachable(url)) return false;
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

export function rememberTunnelUrl(url: string): void {
  savePublicUrlSettings({ baseUrl: url, enabled: true });
}

export function forgetTunnel(): void {
  stopTunnel();
  setSetting("public_url", { baseUrl: "", enabled: false });
}