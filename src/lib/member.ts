import "server-only";
import { createHash } from "node:crypto";

// Fullmatik membership: the page sends the member's session token (`m`); we never trust the browser and ask the
// CRM ourselves (POST /api/internal/fullmatik-verify with a shared secret). Answers are cached briefly, so a
// deleted or blocked member drops out within a few minutes. Without FULLMATIK_INTERNAL_TOKEN nothing is checked
// in development; in production a missing secret closes the gate.

const VERIFY_URL = process.env.FULLMATIK_VERIFY_URL || "https://bsgkg4wwk0g8oko8g04w4ggw.mavrosai.site/api/internal/fullmatik-verify";
const TTL = 5 * 60 * 1000;

type Code = "login_required" | "member_unavailable";
export type MemberCheck = { ok: true; leadId: string | null } | { ok: false; code: Code };

const MESSAGES: Record<Code, string> = {
  login_required: "Önce Fullmatik hesabınla giriş yap.",
  member_unavailable: "Girişin şu an doğrulanamadı. Biraz sonra tekrar dene.",
};

const cache = new Map<string, { until: number; result: MemberCheck }>();

export async function verifyMember(m: unknown): Promise<MemberCheck> {
  const secret = process.env.FULLMATIK_INTERNAL_TOKEN;
  // A production deploy without the secret must not silently open the gate.
  if (!secret) return process.env.NODE_ENV === "production" ? { ok: false, code: "member_unavailable" } : { ok: true, leadId: null };
  const token = typeof m === "string" ? m.trim() : "";
  if (!token || token.length > 2048) return { ok: false, code: "login_required" };
  const key = createHash("sha256").update(token).digest("hex");
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.result;

  let res: Response;
  try {
    res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "member_unavailable" };
  }
  const json = (await res.json().catch(() => null)) as { ok?: boolean; lead_id?: unknown; code?: string } | null;
  let result: MemberCheck;
  if (res.status === 200 && json?.ok && typeof json.lead_id === "string") result = { ok: true, leadId: json.lead_id };
  else if (res.status === 401 && json?.code === "invalid_session") result = { ok: false, code: "login_required" };
  else return { ok: false, code: "member_unavailable" }; // the CRM's own trouble (wrong secret included): not cached

  if (cache.size > 5000) cache.clear();
  cache.set(key, { until: Date.now() + (result.ok ? TTL : 30_000), result });
  return result;
}

export function memberFail(code: Code) {
  return Response.json({ error: MESSAGES[code], code }, { status: code === "login_required" ? 401 : 503 });
}
