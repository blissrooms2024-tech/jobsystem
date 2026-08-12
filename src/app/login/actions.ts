"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function signInWithCredentials(formData: FormData) {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: { zh: "用户名或密码不正确", en: "Invalid username or password" } };
    }
    throw err;
  }
}
