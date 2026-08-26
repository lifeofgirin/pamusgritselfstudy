import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getCurrentProfile } from "@/lib/auth";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (profile) redirect(profile.role === "admin" ? "/admin" : "/student");

  return (
    <main className="login-wrap">
      <section className="login-card">
        <div className="login-logo">Pamus Grit <span>Study</span></div>
        <div className="login-sub">학생 맞춤형 내신 학습 플랫폼</div>
        <LoginForm />
        <p className="muted" style={{fontSize:12, marginTop:18}}>로그인 상태는 브라우저에 안전한 세션 쿠키로 유지됩니다.</p>
      </section>
    </main>
  );
}
