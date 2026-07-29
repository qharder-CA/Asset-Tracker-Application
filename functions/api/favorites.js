import { getSession, getUserFavorites, saveUserFavorites, json } from "../_utils.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ error: "not_signed_in" }, 401);
  const favorites = await getUserFavorites(env, session.email);
  return json({ favorites });
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
  const id = body.id;
  if (!id) return json({ error: "missing_id" }, 400);

  let favorites = await getUserFavorites(env, session.email);
  if (favorites.includes(id)) {
    favorites = favorites.filter((f) => f !== id);
  } else {
    favorites.push(id);
  }
  await saveUserFavorites(env, session.email, favorites);
  return json({ favorites });
}
