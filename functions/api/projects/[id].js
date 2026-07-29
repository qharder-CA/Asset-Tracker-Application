import { getSession, getSharedProjects, saveSharedProjects, getUserProjects, saveUserProjects, json } from "../../_utils.js";

export async function onRequestPut({ request, env, params }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "not_signed_in" }, 401);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }

  const id = params.id;
  const isShared = id.startsWith("shared_");
  const list = isShared ? await getSharedProjects(env) : await getUserProjects(env, session.email);
  const proj = list.find((p) => p.id === id);
  if (!proj) return json({ error: "not_found" }, 404);

  if (body.name != null) proj.name = body.name;
  if (body.parentId != null) proj.parentId = body.parentId;
  if (body.useSharedDrive != null) proj.useSharedDrive = !!body.useSharedDrive;
  if (body.driveId != null) proj.driveId = body.driveId;

  if (isShared) await saveSharedProjects(env, list);
  else await saveUserProjects(env, session.email, list);

  return json({ project: proj });
}

export async function onRequestDelete({ request, env, params }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "not_signed_in" }, 401);

  const id = params.id;
  const isShared = id.startsWith("shared_");
  let list = isShared ? await getSharedProjects(env) : await getUserProjects(env, session.email);
  list = list.filter((p) => p.id !== id);

  if (isShared) await saveSharedProjects(env, list);
  else await saveUserProjects(env, session.email, list);

  return json({ ok: true });
}
