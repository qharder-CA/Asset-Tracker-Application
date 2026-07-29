import { saveSession, sessionCookieHeader } from "../_utils.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const redirectUri = env.APP_BASE_URL + "/auth/callback";

  if (error) {
    return Response.redirect(env.APP_BASE_URL + "/?auth_error=" + encodeURIComponent(error), 302);
  }
  if (!code) {
    return Response.redirect(env.APP_BASE_URL + "/?auth_error=missing_code", 302);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return Response.redirect(env.APP_BASE_URL + "/?auth_error=token_exchange_failed", 302);
  }
  const tokenData = await tokenRes.json();
  if (!tokenData.refresh_token) {
    return Response.redirect(env.APP_BASE_URL + "/?auth_error=no_refresh_token", 302);
  }

  let email = null;
  try {
    const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: "Bearer " + tokenData.access_token },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      email = me.email || null;
    }
  } catch (e) {
    /* not fatal — just won't show an email in the header */
  }

  const sid = crypto.randomUUID();
  await saveSession(env, sid, {
    refreshToken: tokenData.refresh_token,
    email,
    createdAt: Date.now(),
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: env.APP_BASE_URL + "/",
      "Set-Cookie": sessionCookieHeader(sid, 60 * 60 * 24 * 180),
    },
  });
}
