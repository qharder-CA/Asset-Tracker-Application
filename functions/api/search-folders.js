import { getSession, getAccessToken, json } from "../_utils.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "not_signed_in" }, 401);

  const url = new URL(request.url);
  const parentId = url.searchParams.get("parentId") || "root";
  const driveId = url.searchParams.get("driveId") || "";
  const term = url.searchParams.get("term") || "";
  const pageToken = url.searchParams.get("pageToken") || "";

  let accessToken;
  try {
    accessToken = await getAccessToken(env, session);
  } catch (e) {
    return json({ error: "reauth_required" }, 401);
  }

  const safeParentId = parentId.replace(/[\\']/g, "\\$&");
  let q = "mimeType='application/vnd.google-apps.folder' and trashed=false and '" + safeParentId + "' in parents";
  if (term.trim()) {
    q += " and name contains '" + term.trim().replace(/[\\']/g, "\\$&") + "'";
  }

  const params = new URLSearchParams({
    q,
    fields: "nextPageToken, files(id, name, modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "25",
    supportsAllDrives: "true",
  });
  if (driveId) {
    params.set("includeItemsFromAllDrives", "true");
    params.set("corpora", "drive");
    params.set("driveId", driveId);
  }
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch("https://www.googleapis.com/drive/v3/files?" + params.toString(), {
    headers: { Authorization: "Bearer " + accessToken },
  });
  if (!res.ok) return json({ error: "drive_error", detail: await res.text() }, res.status);
  return json(await res.json());
}
