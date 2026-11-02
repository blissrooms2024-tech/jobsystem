"use server";

import { signOut } from "@/auth";

// Navigation back to /login is done by the client with a full page load (see
// SignOutButton). A server-side redirect("/login") here re-renders /login
// using the request's *old* session cookie, so the proxy bounces it back to
// "/" and the client gets an unexpected response.
export async function signOutAction() {
  await signOut({ redirect: false });
}
