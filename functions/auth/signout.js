import { getCookie, deleteSession, clearSessionCookieHeader, SESSION_COOKIE } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const sid = getCookie(request, SESSION_COOKIE);
  if (sid) await deleteSession(env, sid);
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearSessionCookieHeader() },
  });
}
