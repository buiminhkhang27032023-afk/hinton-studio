/** Keep persisted asset URLs relative; prefix only browser requests/rendered media. */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

export function withBasePath(url: string | null | undefined): string {
  if (!url) return "";
  if (!BASE_PATH || !url.startsWith("/") || url.startsWith("//") || url === BASE_PATH || url.startsWith(`${BASE_PATH}/`)) return url;
  return `${BASE_PATH}${url}`;
}

export function withoutBasePath(url: string): string {
  return BASE_PATH && url.startsWith(`${BASE_PATH}/`) ? url.slice(BASE_PATH.length) : url;
}
