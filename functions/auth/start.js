export async function onRequestGet({ env }) {
  const redirectUri = env.APP_BASE_URL + "/auth/callback";
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
  });
  return Response.redirect(
    "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString(),
    302
  );
}
