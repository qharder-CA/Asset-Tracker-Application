import { getSession, getSharedProjects, saveSharedProjects, getUserProjects, saveUserProjects, json } from "../_utils.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "not_signed_in" }, 401);
  const [shared, personal] = await Promise.all([
    getSharedProjects(env),
    getUserProjects(env, session.email),
  ]);
  return json({ shared, personal });
}

export async function onRequestPost({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "not_signed_in" }, 401);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }
  const { name, parentId, useSharedDrive, driveId, shared } = body;
  if (!name) return json({ error: "missing_name" }, 400);

  // The id prefix is what later tells us which list a project lives in —
  // see functions/api/projects/[id].js.
  const project = {
    id: (shared ? "shared_" : "proj_") + crypto.randomUUID(),
    name,
    parentId: parentId || "",
    useSharedDrive: !!useSharedDrive,
    driveId: driveId || "",
    createdBy: session.email || null,
    createdAt: Date.now(),
  };

  if (shared) {
    const list = await getSharedProjects(env);
    list.push(project);
    await saveSharedProjects(env, list);
  } else {
    const list = await getUserProjects(env, session.email);
    list.push(project);
    await saveUserProjects(env, session.email, list);
  }
  return json({ project });
}
