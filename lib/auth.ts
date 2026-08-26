import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Role = "admin" | "student";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, login_id, role, name")
    .eq("id", user.id)
    .maybeSingle();

  return profile ?? null;
}

export async function requireRole(role: Role) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");
  if (profile.role !== role) redirect(profile.role === "admin" ? "/admin" : "/student");
  return profile;
}
