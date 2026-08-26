import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

function loadEnv(path = ".env.local") {
  if (!fs.existsSync(path)) return;
  const text = fs.readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0,i).trim();
    const value = line.slice(i+1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const loginId = process.env.ADMIN_LOGIN_ID || "admin";
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "관리자";
if (!url || !key || !password) throw new Error(".env.local의 Supabase 값과 ADMIN_PASSWORD를 확인하세요.");

const supabase = createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false } });
const { data: exists } = await supabase.from("profiles").select("id").eq("login_id", loginId).maybeSingle();
if (exists) {
  console.log(`관리자 '${loginId}'가 이미 존재합니다.`);
  process.exit(0);
}

const email = `${loginId}.${crypto.randomUUID().slice(0,8)}@auth.pamusgrit.app`;
const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm:true, user_metadata:{role:"admin",name} });
if (error || !data.user) throw error ?? new Error("관리자 생성 실패");
const { error: pError } = await supabase.from("profiles").insert({ id:data.user.id, login_id:loginId, auth_email:email, role:"admin", name });
if (pError) throw pError;
console.log(`관리자 생성 완료: ${loginId}`);
