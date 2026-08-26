"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GRADE_SEQUENCE } from "@/lib/grade";

function slugId(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function lines(raw: string) {
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function pipeRows(raw: string) {
  return lines(raw).map((line) => line.split("|").map((value) => value.trim()));
}

function csvTags(raw: string) {
  return [...new Set(raw.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

function clampDifficulty(raw: FormDataEntryValue | null) {
  const value = Number(raw ?? 3);
  if (!Number.isFinite(value)) return 3;
  return Math.min(10, Math.max(1, Math.round(value)));
}

export async function createStudent(formData: FormData) {
  await requireRole("admin");
  const name = text(formData, "name");
  const grade = text(formData, "grade");
  const loginId = slugId(text(formData, "loginId"));
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
  const name = text(formData, "className");
  if (!name) return;
  const admin = createAdminClient();
  const { error } = await admin.from("classes").insert({ name });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function addStudentToClass(formData: FormData) {
  await requireRole("admin");
  const classId = text(formData, "classId");
  const studentId = text(formData, "studentId");
  if (!classId || !studentId) return;
  const admin = createAdminClient();
  const { error } = await admin.from("class_members").upsert({ class_id: classId, student_id: studentId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createTextbook(formData: FormData) {
  await requireRole("admin");
  const title = text(formData, "title");
  const publisher = text(formData, "publisher");
  if (!title) return;
  const admin = createAdminClient();
  const { error } = await admin.from("textbooks").insert({ title, publisher: publisher || null });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createUnit(formData: FormData) {
  await requireRole("admin");
  const textbookId = text(formData, "textbookId");
  const unitNo = Number(formData.get("unitNo") ?? 0);
  const title = text(formData, "unitTitle");
  if (!textbookId || !unitNo || !title) return;
  const admin = createAdminClient();
  const { error } = await admin.from("units").insert({ textbook_id: textbookId, unit_no: unitNo, title });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function connectTextbookToClass(formData: FormData) {
  await requireRole("admin");
  const classId = text(formData, "classId");
  const textbookId = text(formData, "textbookId");
  if (!classId || !textbookId) return;
  const admin = createAdminClient();
  const { error } = await admin.from("class_textbooks").upsert({ class_id: classId, textbook_id: textbookId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function enableUnitForClass(formData: FormData) {
  await requireRole("admin");
  const classId = text(formData, "classId");
  const unitId = text(formData, "unitId");
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
  const unitId = text(formData, "unitId");
  const type = text(formData, "type");
  const title = text(formData, "contentTitle");
  const majorTopic = text(formData, "majorTopic");
  const subTopic = text(formData, "subTopic");
  const difficultyLevel = clampDifficulty(formData.get("difficultyLevel"));
  const baseTags = csvTags(text(formData, "tags"));
  const allowed = ["vocabulary", "grammar", "dialogue", "passage"];

  if (!unitId || !allowed.includes(type) || !title) return;

  let contentText = "";
  let metadata: Record<string, unknown> = {};
  const autoTags: string[] = [];

  if (type === "vocabulary") {
    const raw = text(formData, "vocabularyText");
    const items = pipeRows(raw).map(([word = "", meaning = "", partOfSpeech = "", example = "", exampleKo = ""]) => ({
      word,
      meaning,
      part_of_speech: partOfSpeech,
      example,
      example_ko: exampleKo,
    })).filter((item) => item.word && item.meaning);

    if (!items.length) throw new Error("어휘는 최소 1개 이상 입력해주세요.");
    contentText = raw;
    metadata = { items, item_count: items.length };
    autoTags.push("어휘");
  }

  if (type === "grammar") {
    const explanation = text(formData, "grammarExplanation");
    if (!majorTopic || !subTopic || !explanation) throw new Error("문법 대분류, 세부 개념, 개념 설명을 입력해주세요.");
    const examples = lines(text(formData, "grammarExamples"));
    const teacherNote = text(formData, "teacherNote");
    contentText = explanation;
    metadata = { examples, teacher_note: teacherNote };
    autoTags.push("문법", majorTopic, subTopic);
  }

  if (type === "dialogue") {
    const raw = text(formData, "dialogueText");
    if (!raw || !majorTopic) throw new Error("대화 상황과 영어 대화문을 입력해주세요.");
    const dialogueLines = lines(raw).map((line, index) => {
      const match = line.match(/^([^:：]{1,20})[:：]\s*(.*)$/);
      return match
        ? { line_no: index + 1, speaker: match[1].trim(), text: match[2].trim() }
        : { line_no: index + 1, speaker: "", text: line };
    });
    const translationLines = lines(text(formData, "translationText"));
    const keyExpressions = pipeRows(text(formData, "keyExpressions"))
      .map(([expression = "", meaning = ""]) => ({ expression, meaning }))
      .filter((item) => item.expression);
    contentText = raw;
    metadata = { situation: majorTopic, lines: dialogueLines, translation_lines: translationLines, key_expressions: keyExpressions };
    autoTags.push("대화문", majorTopic);
  }

  if (type === "passage") {
    const raw = text(formData, "passageText");
    if (!raw) throw new Error("영어 본문을 입력해주세요.");
    const translation = text(formData, "translationText");
    const grammarPoints = lines(text(formData, "grammarPoints"));
    const vocabulary = pipeRows(text(formData, "passageVocabulary"))
      .map(([word = "", meaning = ""]) => ({ word, meaning }))
      .filter((item) => item.word);
    contentText = raw;
    metadata = { translation, grammar_points: grammarPoints, vocabulary };
    autoTags.push("본문", ...grammarPoints);
  }

  const tags = [...new Set([...baseTags, ...autoTags].map((tag) => tag.trim()).filter(Boolean))];
  const admin = createAdminClient();
  const { error } = await admin.from("learning_contents").insert({
    unit_id: unitId,
    type,
    title,
    content_text: contentText,
    major_topic: majorTopic || null,
    sub_topic: subTopic || null,
    difficulty_level: difficultyLevel,
    tags,
    metadata,
    created_by: profile.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/student");
}
