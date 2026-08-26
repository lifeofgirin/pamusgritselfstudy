import { logout } from "@/app/actions/auth";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentGrade, GRADE_SEQUENCE } from "@/lib/grade";
import {
  addStudentToClass,
  connectTextbookToClass,
  createClass,
  createStudent,
  createTextbook,
  createUnit,
  enableUnitForClass,
} from "./actions";
import LearningContentForm from "./LearningContentForm";
import DeleteLearningContentButton from "./DeleteLearningContentButton";

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
    db.from("learning_contents").select("id,unit_id,type,title,major_topic,sub_topic,tags").order("created_at", { ascending: false }),
  ]);

  const students = studentsRes.data ?? [];
  const classes = classesRes.data ?? [];
  const textbooks = textbooksRes.data ?? [];
  const units = unitsRes.data ?? [];
  const members = membersRes.data ?? [];
  const classBooks = classBooksRes.data ?? [];
  const classUnits = classUnitsRes.data ?? [];
  const contents = contentsRes.data ?? [];

  const contentTypeName: Record<string, string> = { vocabulary: "어휘", grammar: "문법", dialogue: "대화문", passage: "본문" };
  const unitOptions = units.map((unit) => {
    const textbook = textbooks.find((item) => item.id === unit.textbook_id);
    return {
      id: unit.id,
      label: `${textbook?.title ?? "교과서"} · Unit ${unit.unit_no} ${unit.title}`,
    };
  });

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Pamus Grit <span>Study</span></div>
        <form action={logout}><button className="btn btn-ghost">로그아웃</button></form>
      </header>
      <main className="container">
        <div className="page-title">
          <div><h1>관리자 페이지</h1><p>{profile.name} · 교과서 범위 / 학습 콘텐츠 관리</p></div>
        </div>

        <div className="grid">
          <section className="card span-5">
            <h2>1. 학생 등록</h2>
            <form action={createStudent}>
              <div className="form-row">
                <div className="field"><label>이름</label><input className="input" name="name" required /></div>
                <div className="field"><label>학년</label><select className="select" name="grade" required>{GRADE_SEQUENCE.map((grade) => <option key={grade}>{grade}</option>)}</select></div>
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
              {students.map((student) => {
                const classNames = members.filter((member) => member.student_id === student.id).map((member) => classes.find((item) => item.id === member.class_id)?.name).filter(Boolean).join(", ");
                return <tr key={student.id}><td>{student.name}</td><td><span className="tag tag-red">{currentGrade(student.grade_code, student.grade_base_year)}</span></td><td>{student.grade_code} / {student.grade_base_year}</td><td>{classNames || "-"}</td></tr>;
              })}
            </tbody></table></div>
          </section>

          <section className="card span-6">
            <h2>2. 반 만들기 / 학생 배정</h2>
            <form action={createClass} className="actions" style={{ marginBottom: 16 }}>
              <input className="input" name="className" placeholder="예: 중2A" style={{ maxWidth: 260 }} required />
              <button className="btn btn-primary">반 만들기</button>
            </form>
            <form action={addStudentToClass} className="form-row">
              <div className="field"><label>반</label><select className="select" name="classId" required><option value="">선택</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div className="field"><label>학생</label><select className="select" name="studentId" required><option value="">선택</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} ({currentGrade(student.grade_code, student.grade_base_year)})</option>)}</select></div>
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
            <hr className="divider" />
            <form action={createUnit}>
              <div className="form-row-4">
                <div className="field"><label>교과서</label><select className="select" name="textbookId" required><option value="">선택</option>{textbooks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
                <div className="field"><label>Unit 번호</label><input className="input" name="unitNo" type="number" min="1" required /></div>
                <div className="field" style={{ gridColumn: "span 2" }}><label>Unit 제목</label><input className="input" name="unitTitle" placeholder="예: Ideas for Saving the Earth" required /></div>
              </div>
              <button className="btn btn-soft">유닛 추가</button>
            </form>
          </section>

          <section className="card span-12">
            <h2>반에 교과서 / 학습 유닛 열어주기</h2>
            <div className="grid">
              <form action={connectTextbookToClass} className="span-6">
                <div className="form-row">
                  <div className="field"><label>반</label><select className="select" name="classId" required><option value="">선택</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  <div className="field"><label>교과서</label><select className="select" name="textbookId" required><option value="">선택</option>{textbooks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
                </div>
                <button className="btn btn-primary">교과서 연결</button>
              </form>
              <form action={enableUnitForClass} className="span-6">
                <div className="form-row">
                  <div className="field"><label>반</label><select className="select" name="classId" required><option value="">선택</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  <div className="field"><label>허용할 유닛</label><select className="select" name="unitId" required><option value="">선택</option>{units.map((unit) => { const textbook = textbooks.find((item) => item.id === unit.textbook_id); return <option key={unit.id} value={unit.id}>{textbook?.title} · Unit {unit.unit_no} {unit.title}</option>; })}</select></div>
                </div>
                <button className="btn btn-soft">이 유닛 학습 허용</button>
              </form>
            </div>
            <div className="table-wrap" style={{ marginTop: 16 }}><table><thead><tr><th>반</th><th>교과서</th><th>열린 유닛</th></tr></thead><tbody>
              {classes.map((item) => {
                const bookNames = classBooks.filter((link) => link.class_id === item.id).map((link) => textbooks.find((textbook) => textbook.id === link.textbook_id)?.title).filter(Boolean).join(", ");
                const unitNames = classUnits.filter((link) => link.class_id === item.id && link.enabled).map((link) => units.find((unit) => unit.id === link.unit_id)).filter(Boolean).map((unit: any) => `Unit ${unit.unit_no}`).join(", ");
                return <tr key={item.id}><td>{item.name}</td><td>{bookNames || "-"}</td><td>{unitNames || "-"}</td></tr>;
              })}
            </tbody></table></div>
          </section>

          <section className="card span-8">
            <div className="card-heading">
              <div><h2>4. 학습자료 등록</h2><p>자료만 정확히 등록하면 됩니다. 난이도는 이후 AI가 자동 분석합니다.</p></div>
              <span className="tag tag-red">v1.2</span>
            </div>
            <LearningContentForm units={unitOptions} />
          </section>

          <section className="card span-4">
            <h2>등록된 학습자료</h2>
            <div className="stack">
              {contents.slice(0, 30).map((item) => {
                const unit = units.find((unitItem) => unitItem.id === item.unit_id);
                const textbook = textbooks.find((book) => book.id === unit?.textbook_id);
                return (
                  <div className="unit-card" key={item.id}>
                    <div className="content-list-top">
                      <span className="tag tag-red">{contentTypeName[item.type]}</span>
                      <DeleteLearningContentButton contentId={item.id} title={item.title} />
                    </div>
                    <strong>{item.title}</strong>
                    {(item.major_topic || item.sub_topic) && <div className="muted content-topic">{[item.major_topic, item.sub_topic].filter(Boolean).join(" › ")}</div>}
                    <div className="muted" style={{ fontSize: 13, marginTop: 5 }}>{textbook?.title} · Unit {unit?.unit_no}</div>
                  </div>
                );
              })}
              {!contents.length && <div className="muted">아직 등록된 자료가 없습니다.</div>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
