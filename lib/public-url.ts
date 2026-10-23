import { getSetting, setSetting } from "./db";

/**
 * Some providers (IOOAI, PiAPI) refuse to fetch images from localhost — they
 * require a public HTTPS URL with a real domain. This helper turns a local
 * asset URL into one those providers accept, using whichever public base URL
 * the user configured (a tunnel, a reverse proxy, a CDN, …).
 */

export interface PublicUrlSettings {
  /** e.g. https://abc123.trycloudflare.com — no trailing slash. */
  baseUrl: string;
  /** Set to false to keep everything local. */
  enabled: boolean;
}

export function getPublicUrlSettings(): PublicUrlSettings {
  return getSetting<PublicUrlSettings>("public_url", { baseUrl: "", enabled: false });
}

export function savePublicUrlSettings(value: PublicUrlSettings): void {
  setSetting("public_url", {
    baseUrl: value.baseUrl.trim().replace(/\/+$/, ""),
    enabled: value.enabled,
  });
}

/** True when a URL can be handed to a provider that demands a public host. */
export function isPubliclyReachable(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    return !(
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.16.") ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export function hasPublicBase(): boolean {
  const settings = getPublicUrlSettings();
  return settings.enabled && settings.baseUrl.length > 0 && isPubliclyReachable(settings.baseUrl);
}

/**
 * Rewrite a local /api/files/... path onto the public base URL, so the provider
 * can download it. Public URLs pass through untouched.
 */
export function toProviderUrl(localUrl: string): string {
  if (!localUrl) return localUrl;
  if (/^https?:\/\//i.test(localUrl)) return localUrl;
  if (!hasPublicBase()) return localUrl;
  const base = getPublicUrlSettings().baseUrl;
  return `${base}${localUrl.startsWith("/") ? localUrl : `/${localUrl}`}`;
}