"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function login(
  _: LoginState,
  formData: FormData
): Promise<LoginState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!loginId || !password) {
    return { error: "아이디와 비밀번호를 입력해주세요. [DEBUG-V2]" };
  }

  let destination = "/";

  try {
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, auth_email, role")
      .eq("login_id", loginId)
      .maybeSingle();

    if (profileError) {
      return {
        error: `프로필 조회 오류 [DEBUG-V2]: ${profileError.message}`,
      };
    }

    if (!profile) {
      return {
        error: `등록된 아이디(${loginId})를 찾을 수 없습니다. [DEBUG-V2]`,
      };
    }

    const supabase = await createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: profile.auth_email,
      password,
    });

    if (authError) {
      return {
        error: `Supabase 로그인 오류 [DEBUG-V2]: ${authError.message}`,
      };
    }

    destination = profile.role === "admin" ? "/admin" : "/student";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    return {
      error: `로그인 처리 오류 [DEBUG-V2]: ${message}`,
    };
  }

  redirect(destination);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
