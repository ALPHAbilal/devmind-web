import crypto from "node:crypto";

/**
 * HMAC signer for Vercel → Fly calls. Algorithm is locked by
 * spec/ROUTES_AND_CHANNELS.md §1: HMAC-SHA256(secret, `${ts}\n${user_id}\n${body}`).
 * Exported separately so the test file can verify the digest against a known
 * input without standing up a real fetch.
 */
export function signForFly(
  userId: string,
  body: string,
  secret: string,
  timestamp?: string,
): { ts: string; sig: string } {
  const ts = timestamp ?? Math.floor(Date.now() / 1000).toString();
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${ts}\n${userId}\n${body}`)
    .digest("hex");
  return { ts, sig };
}

export interface FlyResponse<T> {
  status: number;
  data: T | { error: { code: string; message: string; details?: unknown } };
}

export async function postToFly<T>(
  path: string,
  userId: string,
  body: unknown,
): Promise<FlyResponse<T>> {
  const baseUrl = process.env.FLY_BACKEND_URL;
  const secret = process.env.FLY_BACKEND_INTERNAL_TOKEN;
  if (!baseUrl || !secret) {
    throw new Error(
      "FLY_BACKEND_URL and FLY_BACKEND_INTERNAL_TOKEN must be set on the server",
    );
  }

  const payload = JSON.stringify(body ?? {});
  const { ts, sig } = signForFly(userId, payload, secret);

  const upstream = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-DevMind-Signature": sig,
      "X-DevMind-Timestamp": ts,
      "X-DevMind-User-Id": userId,
    },
    body: payload,
  });

  const text = await upstream.text();
  let data: FlyResponse<T>["data"];
  try {
    data = text ? JSON.parse(text) : ({} as T);
  } catch {
    data = {
      error: {
        code: "upstream_error",
        message: "Non-JSON response from Fly backend",
        details: { raw: text.slice(0, 500) },
      },
    };
  }
  return { status: upstream.status, data };
}
