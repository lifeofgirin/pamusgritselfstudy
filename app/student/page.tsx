import { logout } from "@/app/actions/auth";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentGrade } from "@/lib/grade";

export default async function StudentPage() {
  const profile = await requireRole("student");
  const db = createAdminClient();
  const { data: student } = await db.from("students").select("id,name,grade_code,grade_base_year").eq("user_id", profile.id).single();
  if (!student) return null;

  const { data: memberships } = await db.from("class_members").select("class_id").eq("student_id", student.id);
  const classIds = (memberships ?? []).map(m=>m.class_id);
  const { data: classes } = classIds.length ? await db.from("classes").select("id,name").in("id", classIds) : { data: [] as any[] };
  const { data: openUnits } = classIds.length ? await db.from("class_units").select("class_id,unit_id,enabled").in("class_id", classIds).eq("enabled", true) : { data: [] as any[] };
  const unitIds = [...new Set((openUnits ?? []).map(x=>x.unit_id))];
  const { data: units } = unitIds.length ? await db.from("units").select("id,textbook_id,unit_no,title").in("id", unitIds).order("unit_no") : { data: [] as any[] };
  const textbookIds = [...new Set((units ?? []).map(x=>x.textbook_id))];
  const { data: textbooks } = textbookIds.length ? await db.from("textbooks").select("id,title,publisher").in("id", textbookIds) : { data: [] as any[] };
  const { data: contents } = unitIds.length ? await db.from("learning_contents").select("id,unit_id,type,title,content_text").in("unit_id", unitIds).order("created_at") : { data: [] as any[] };

  const typeName: Record<string,string> = { vocabulary:"어휘", grammar:"문법", dialogue:"대화문", passage:"본문" };

  return (
    <div className="shell">
      <header className="topbar"><div className="brand">Pamus Grit <span>Study</span></div><form action={logout}><button className="btn btn-ghost">로그아웃</button></form></header>
      <main className="container">
        <div className="page-title"><div><h1>{student.name} 학생</h1><p>{currentGrade(student.grade_code, student.grade_base_year)} · {(classes ?? []).map(c=>c.name).join(", ") || "배정된 반 없음"}</p></div></div>
        <div className="grid">
          {(units ?? []).map(unit=>{
            const textbook = (textbooks ?? []).find(t=>t.id===unit.textbook_id);
            const unitContents = (contents ?? []).filter(c=>c.unit_id===unit.id);
            return <section className="card span-6" key={unit.id}>
              <div className="section-label">{textbook?.title}</div>
              <h2>Unit {unit.unit_no}. {unit.title}</h2>
              <div className="stack">
                {unitContents.map(item=><details className="unit-card" key={item.id}><summary style={{cursor:"pointer",fontWeight:800}}><span className="tag tag-red" style={{marginRight:8}}>{typeName[item.type]}</span>{item.title}</summary><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.7,marginBottom:0}}>{item.content_text}</pre></details>)}
                {!unitContents.length && <div className="muted">아직 등록된 학습자료가 없습니다.</div>}
              </div>
            </section>
          })}
          {!(units ?? []).length && <section className="card span-12"><h2>학습할 유닛이 아직 없습니다.</h2><p className="muted">관리자가 반에 교과서와 유닛을 열어주면 여기에 표시됩니다.</p></section>}
        </div>
      </main>
    </div>
  );
}
