// Shared helpers used by every /functions route. Files starting with "_"
// are not treated as routes by Cloudflare Pages Functions — this one is
// imported by the others, never served directly.

export const SESSION_COOKIE = "atk_sess";

export function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function sessionCookieHeader(value, maxAgeSeconds) {
  const parts = [
    SESSION_COOKIE + "=" + encodeURIComponent(value),
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ];
  if (maxAgeSeconds != null) parts.push("Max-Age=" + maxAgeSeconds);
  return parts.join("; ");
}

export function clearSessionCookieHeader() {
  return SESSION_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

// Session records live in Cloudflare KV, keyed by a random session id that
// only ever exists inside an httpOnly cookie — client-side JS can never
// read it, so there's nothing for a compromised page to steal.
export async function getSession(env, request) {
  const sid = getCookie(request, SESSION_COOKIE);
  if (!sid) return null;
  const raw = await env.SESSIONS.get("session:" + sid);
  if (!raw) return null;
  try {
    return { id: sid, ...JSON.parse(raw) };
  } catch (e) {
    return null;
  }
}

export async function saveSession(env, sid, data) {
  await env.SESSIONS.put("session:" + sid, JSON.stringify(data));
}

export async function deleteSession(env, sid) {
  await env.SESSIONS.delete("session:" + sid);
}

// Projects and favorites live in the same KV namespace as sessions, just
// under different key prefixes — one less piece of Cloudflare config to
// set up. Shared projects are one single list everyone reads from;
// personal projects and favorites are one list per person, keyed by email
// so they follow someone across every device they sign into.
const SHARED_PROJECTS_KEY = "shared_projects";

export async function getSharedProjects(env) {
  const raw = await env.SESSIONS.get(SHARED_PROJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}
export async function saveSharedProjects(env, list) {
  await env.SESSIONS.put(SHARED_PROJECTS_KEY, JSON.stringify(list));
}
export async function getUserProjects(env, email) {
  if (!email) return [];
  const raw = await env.SESSIONS.get("user_projects:" + email);
  return raw ? JSON.parse(raw) : [];
}
export async function saveUserProjects(env, email, list) {
  await env.SESSIONS.put("user_projects:" + email, JSON.stringify(list));
}
export async function getUserFavorites(env, email) {
  if (!email) return [];
  const raw = await env.SESSIONS.get("user_favorites:" + email);
  return raw ? JSON.parse(raw) : [];
}
export async function saveUserFavorites(env, email, list) {
  await env.SESSIONS.put("user_favorites:" + email, JSON.stringify(list));
}

// Google refresh tokens don't expire on their own use (barring revocation,
// or the 7-day limit Google applies while an OAuth app is unverified) — so
// this trade happens on effectively every API call, and the browser never
// needs to know or care that it happened.
export async function getAccessToken(env, session) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: session.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error("refresh_failed:" + res.status);
  }
  const data = await res.json();
  return data.access_token;
}

export function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}
