import { getSession, getAccessToken, json } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "not_signed_in" }, 401);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }
  const { name, parentId, driveId } = body;
  if (!name) return json({ error: "missing_name" }, 400);

  let accessToken;
  try {
    accessToken = await getAccessToken(env, session);
  } catch (e) {
    return json({ error: "reauth_required" }, 401);
  }

  const params = new URLSearchParams({ supportsAllDrives: "true" });
  if (driveId) params.set("includeItemsFromAllDrives", "true");

  const res = await fetch("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId || "root"],
    }),
  });
  if (!res.ok) return json({ error: "drive_error", detail: await res.text() }, res.status);
  return json(await res.json());
}
