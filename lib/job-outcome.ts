/** A client timeout is not evidence that a generation was rejected or refunded. */
export function jobErrorStatus(phase: string, message: string): "pending" | "failed" {
  if (phase === "preparing") return "failed";
  if (/domain_retired|upstream_error|invalid|4\d\d|thất bại|failed|không đủ số dư/i.test(message)) return "failed";
  if (phase === "downloading") return "pending";
  if (/^Tác vụ (?:RunningHub )?thất bại/.test(message)) return "failed";
  if (phase === "submitting" && /^API trả về 4\d\d:/.test(message) && !/^API trả về (408|409):/.test(message)) return "failed";
  if (phase === "submitting" && /^RunningHub báo lỗi/.test(message)) return "failed";
  return "pending";
}
