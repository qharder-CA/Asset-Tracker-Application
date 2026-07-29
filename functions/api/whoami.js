import { getSession, json } from "../_utils.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(env, request);
  if (!session) return json({ signedIn: false });
  return json({ signedIn: true, email: session.email || null });
}
