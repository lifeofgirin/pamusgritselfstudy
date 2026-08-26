"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GRADE_SEQUENCE } from "@/lib/grade";

function slugId(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export async function createStudent(formData: FormData) {
  await requireRole("admin");
  const name = String(formData.get("name") ?? "").trim();
  const grade = String(formData.get("grade") ?? "");
  const loginId = slugId(String(formData.get("loginId") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!name || !GRADE_SEQUENCE.includes(grade as any) || !loginId || password.length < 6) return;

  const admin = createAdminClient();
  const authEmail = `${loginId}.${crypto.randomUUID().slice(0, 8)}@auth.pamusgrit.app`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { role: "student", name },
  });
  if (error || !created.user) throw new Error(error?.message ?? "학생 계정 생성 실패");

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    login_id: loginId,
    auth_email: authEmail,
    role: "student",
    name,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError.message);
  }

  const { error: studentError } = await admin.from("students").insert({
    user_id: created.user.id,
    name,
    grade_code: grade,
    grade_base_year: new Date().getFullYear(),
  });
  if (studentError) {
    await admin.from("profiles").delete().eq("id", created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    throw new Error(studentError.message);
  }
  revalidatePath("/admin");
}

export async function createClass(formData: FormData) {
  await requireRole("admin");
  const name = String(formData.get("className") ?? "").trim();
  if (!name) return;
  const admin = createAdminClient();
  const { error } = await admin.from("classes").insert({ name });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function addStudentToClass(formData: FormData) {
  await requireRole("admin");
  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  if (!classId || !studentId) return;
  const admin = createAdminClient();
  const { error } = await admin.from("class_members").upsert({ class_id: classId, student_id: studentId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createTextbook(formData: FormData) {
  await requireRole("admin");
  const title = String(formData.get("title") ?? "").trim();
  const publisher = String(formData.get("publisher") ?? "").trim();
  if (!title) return;
  const admin = createAdminClient();
  const { error } = await admin.from("textbooks").insert({ title, publisher: publisher || null });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createUnit(formData: FormData) {
  await requireRole("admin");
  const textbookId = String(formData.get("textbookId") ?? "");
  const unitNo = Number(formData.get("unitNo") ?? 0);
  const title = String(formData.get("unitTitle") ?? "").trim();
  if (!textbookId || !unitNo || !title) return;
  const admin = createAdminClient();
  const { error } = await admin.from("units").insert({ textbook_id: textbookId, unit_no: unitNo, title });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function connectTextbookToClass(formData: FormData) {
  await requireRole("admin");
  const classId = String(formData.get("classId") ?? "");
  const textbookId = String(formData.get("textbookId") ?? "");
  if (!classId || !textbookId) return;
  const admin = createAdminClient();
  const { error } = await admin.from("class_textbooks").upsert({ class_id: classId, textbook_id: textbookId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function enableUnitForClass(formData: FormData) {
  await requireRole("admin");
  const classId = String(formData.get("classId") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  if (!classId || !unitId) return;
  const admin = createAdminClient();
  const { data: unit } = await admin.from("units").select("textbook_id").eq("id", unitId).single();
  if (!unit) throw new Error("유닛을 찾을 수 없습니다.");
  const { error: bookError } = await admin.from("class_textbooks").upsert({ class_id: classId, textbook_id: unit.textbook_id });
  if (bookError) throw new Error(bookError.message);
  const { error } = await admin.from("class_units").upsert({ class_id: classId, unit_id: unitId, enabled: true });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createLearningContent(formData: FormData) {
  const profile = await requireRole("admin");
  const unitId = String(formData.get("unitId") ?? "");
  const type = String(formData.get("type") ?? "");
  const title = String(formData.get("contentTitle") ?? "").trim();
  const contentText = String(formData.get("contentText") ?? "").trim();
  const allowed = ["vocabulary", "grammar", "dialogue", "passage"];
  if (!unitId || !allowed.includes(type) || !title || !contentText) return;
  const admin = createAdminClient();
  const { error } = await admin.from("learning_contents").insert({
    unit_id: unitId,
    type,
    title,
    content_text: contentText,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
