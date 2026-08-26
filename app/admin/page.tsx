import { logout } from "@/app/actions/auth";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentGrade, GRADE_SEQUENCE } from "@/lib/grade";
import {
  addStudentToClass, connectTextbookToClass, createClass, createLearningContent,
  createStudent, createTextbook, createUnit, enableUnitForClass,
} from "./actions";

export default async function AdminPage() {
  const profile = await requireRole("admin");
  const db = createAdminClient();
  const [studentsRes, classesRes, textbooksRes, unitsRes, membersRes, classBooksRes, classUnitsRes, contentsRes] = await Promise.all([
    db.from("students").select("id,name,grade_code,grade_base_year,user_id").order("name"),
    db.from("classes").select("id,name").order("name"),
    db.from("textbooks").select("id,title,publisher").order("title"),
    db.from("units").select("id,textbook_id,unit_no,title").order("unit_no"),
    db.from("class_members").select("class_id,student_id"),
    db.from("class_textbooks").select("class_id,textbook_id"),
    db.from("class_units").select("class_id,unit_id,enabled"),
    db.from("learning_contents").select("id,unit_id,type,title").order("created_at", { ascending:false }),
  ]);

  const students = studentsRes.data ?? [];
  const classes = classesRes.data ?? [];
  const textbooks = textbooksRes.data ?? [];
  const units = unitsRes.data ?? [];
  const members = membersRes.data ?? [];
  const classBooks = classBooksRes.data ?? [];
  const classUnits = classUnitsRes.data ?? [];
  const contents = contentsRes.data ?? [];

  const contentTypeName: Record<string,string> = { vocabulary:"어휘", grammar:"문법", dialogue:"대화문", passage:"본문" };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Pamus Grit <span>Study</span></div>
        <form action={logout}><button className="btn btn-ghost">로그아웃</button></form>
      </header>
      <main className="container">
        <div className="page-title">
          <div><h1>관리자 페이지</h1><p>{profile.name} · 1차 학습 콘텐츠 관리</p></div>
        </div>

        <div className="grid">
          <section className="card span-5">
            <h2>1. 학생 등록</h2>
            <form action={createStudent}>
              <div className="form-row">
                <div className="field"><label>이름</label><input className="input" name="name" required /></div>
                <div className="field"><label>학년</label><select className="select" name="grade" required>{GRADE_SEQUENCE.map(g=><option key={g}>{g}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="field"><label>아이디</label><input className="input" name="loginId" pattern="[A-Za-z0-9._-]+" required /></div>
                <div className="field"><label>비밀번호</label><input className="input" name="password" type="password" minLength={6} required /></div>
              </div>
              <button className="btn btn-primary">학생 등록</button>
            </form>
          </section>

          <section className="card span-7">
            <h2>학생 목록</h2>
            <div className="table-wrap"><table><thead><tr><th>이름</th><th>현재 학년</th><th>등록 기준</th><th>반</th></tr></thead><tbody>
              {students.map(s => {
                const classNames = members.filter(m=>m.student_id===s.id).map(m=>classes.find(c=>c.id===m.class_id)?.name).filter(Boolean).join(", ");
                return <tr key={s.id}><td>{s.name}</td><td><span className="tag tag-red">{currentGrade(s.grade_code, s.grade_base_year)}</span></td><td>{s.grade_code} / {s.grade_base_year}</td><td>{classNames || "-"}</td></tr>;
              })}
            </tbody></table></div>
          </section>

          <section className="card span-6">
            <h2>2. 반 만들기 / 학생 배정</h2>
            <form action={createClass} className="actions" style={{marginBottom:16}}>
              <input className="input" name="className" placeholder="예: 중2A" style={{maxWidth:260}} required />
              <button className="btn btn-primary">반 만들기</button>
            </form>
            <form action={addStudentToClass} className="form-row">
              <div className="field"><label>반</label><select className="select" name="classId" required><option value="">선택</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="field"><label>학생</label><select className="select" name="studentId" required><option value="">선택</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} ({currentGrade(s.grade_code,s.grade_base_year)})</option>)}</select></div>
              <button className="btn btn-soft">학생 배정</button>
            </form>
          </section>

          <section className="card span-6">
            <h2>3. 교과서 / 유닛 등록</h2>
            <form action={createTextbook} className="form-row">
              <div className="field"><label>교과서명</label><input className="input" name="title" placeholder="예: 중2 영어 능률 김성곤" required /></div>
              <div className="field"><label>출판사</label><input className="input" name="publisher" placeholder="예: NE능률" /></div>
              <button className="btn btn-primary">교과서 등록</button>
            </form>
            <hr style={{border:0,borderTop:"1px solid var(--line)",margin:"18px 0"}} />
            <form action={createUnit}>
              <div className="form-row-4">
                <div className="field"><label>교과서</label><select className="select" name="textbookId" required><option value="">선택</option>{textbooks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
                <div className="field"><label>Unit 번호</label><input className="input" name="unitNo" type="number" min="1" required /></div>
                <div className="field" style={{gridColumn:"span 2"}}><label>Unit 제목</label><input className="input" name="unitTitle" placeholder="예: Unit 3 Ideas for Saving the Earth" required /></div>
              </div>
              <button className="btn btn-soft">유닛 추가</button>
            </form>
          </section>

          <section className="card span-12">
            <h2>반에 교과서 / 학습 유닛 열어주기</h2>
            <div className="grid">
              <form action={connectTextbookToClass} className="span-6">
                <div className="form-row">
                  <div className="field"><label>반</label><select className="select" name="classId" required><option value="">선택</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="field"><label>교과서</label><select className="select" name="textbookId" required><option value="">선택</option>{textbooks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
                </div><button className="btn btn-primary">교과서 연결</button>
              </form>
              <form action={enableUnitForClass} className="span-6">
                <div className="form-row">
                  <div className="field"><label>반</label><select className="select" name="classId" required><option value="">선택</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  <div className="field"><label>허용할 유닛</label><select className="select" name="unitId" required><option value="">선택</option>{units.map(u=>{const t=textbooks.find(x=>x.id===u.textbook_id); return <option key={u.id} value={u.id}>{t?.title} · Unit {u.unit_no} {u.title}</option>})}</select></div>
                </div><button className="btn btn-soft">이 유닛 학습 허용</button>
              </form>
            </div>
            <div className="table-wrap" style={{marginTop:16}}><table><thead><tr><th>반</th><th>교과서</th><th>열린 유닛</th></tr></thead><tbody>
              {classes.map(c=>{
                const bookNames=classBooks.filter(x=>x.class_id===c.id).map(x=>textbooks.find(t=>t.id===x.textbook_id)?.title).filter(Boolean).join(", ");
                const unitNames=classUnits.filter(x=>x.class_id===c.id&&x.enabled).map(x=>units.find(u=>u.id===x.unit_id)).filter(Boolean).map((u:any)=>`Unit ${u.unit_no}`).join(", ");
                return <tr key={c.id}><td>{c.name}</td><td>{bookNames||"-"}</td><td>{unitNames||"-"}</td></tr>
              })}
            </tbody></table></div>
          </section>

          <section className="card span-7">
            <h2>4. 학습자료 등록</h2>
            <form action={createLearningContent}>
              <div className="form-row">
                <div className="field"><label>유닛</label><select className="select" name="unitId" required><option value="">선택</option>{units.map(u=>{const t=textbooks.find(x=>x.id===u.textbook_id); return <option key={u.id} value={u.id}>{t?.title} · Unit {u.unit_no}</option>})}</select></div>
                <div className="field"><label>종류</label><select className="select" name="type" required><option value="vocabulary">어휘</option><option value="grammar">문법</option><option value="dialogue">대화문</option><option value="passage">본문</option></select></div>
              </div>
              <div className="field"><label>자료 제목</label><input className="input" name="contentTitle" placeholder="예: Unit 3 핵심 어휘" required /></div>
              <div className="field"><label>내용</label><textarea className="textarea" name="contentText" placeholder={"어휘 예시: protect | 보호하다\\nenvironment | 환경\\n\\n문법/대화문/본문은 원문 그대로 입력"} required /></div>
              <button className="btn btn-primary">자료 등록</button>
            </form>
          </section>

          <section className="card span-5">
            <h2>등록된 학습자료</h2>
            <div className="stack">
              {contents.slice(0,20).map(item=>{ const u=units.find(x=>x.id===item.unit_id); const t=textbooks.find(x=>x.id===u?.textbook_id); return <div className="unit-card" key={item.id}><div className="section-label">{contentTypeName[item.type]}</div><strong>{item.title}</strong><div className="muted" style={{fontSize:13,marginTop:5}}>{t?.title} · Unit {u?.unit_no}</div></div> })}
              {!contents.length && <div className="muted">아직 등록된 자료가 없습니다.</div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
