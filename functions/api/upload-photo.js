import { getSession, getAccessToken, json } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "not_signed_in" }, 401);

  const form = await request.formData();
  const file = form.get("file");
  const fileName = form.get("fileName");
  const folderId = form.get("folderId");
  if (!file || !fileName || !folderId) return json({ error: "missing_fields" }, 400);

  let accessToken;
  try {
    accessToken = await getAccessToken(env, session);
  } catch (e) {
    return json({ error: "reauth_required" }, 401);
  }

  const boundary = "assettracker" + crypto.randomUUID().replace(/-/g, "");
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const fileBuffer = await file.arrayBuffer();

  const encoder = new TextEncoder();
  const head = encoder.encode(
    "--" + boundary + "\r\n" +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    metadata + "\r\n" +
    "--" + boundary + "\r\n" +
    "Content-Type: " + (file.type || "image/jpeg") + "\r\n\r\n"
  );
  const tail = encoder.encode("\r\n--" + boundary + "--");
  const body = new Blob([head, fileBuffer, tail]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "multipart/related; boundary=" + boundary,
      },
      body,
    }
  );
  if (!res.ok) return json({ error: "drive_error", detail: await res.text() }, res.status);
  return json(await res.json());
}
