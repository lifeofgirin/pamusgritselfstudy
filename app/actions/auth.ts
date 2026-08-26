"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!loginId || !password) return { error: "아이디와 비밀번호를 입력해주세요." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, auth_email, role")
    .eq("login_id", loginId)
    .maybeSingle();

  if (!profile) return { error: "아이디 또는 비밀번호를 확인해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.auth_email,
    password,
  });

  if (error) return { error: "아이디 또는 비밀번호를 확인해주세요." };
  redirect(profile.role === "admin" ? "/admin" : "/student");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
