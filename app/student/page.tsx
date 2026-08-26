import { logout } from "@/app/actions/auth";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentGrade } from "@/lib/grade";

const typeName: Record<string, string> = { vocabulary: "어휘", grammar: "문법", dialogue: "대화문", passage: "본문" };

export default async function StudentPage() {
  const profile = await requireRole("student");
  const db = createAdminClient();
  const { data: student } = await db.from("students").select("id,name,grade_code,grade_base_year").eq("user_id", profile.id).single();
  if (!student) return null;

  const { data: memberships } = await db.from("class_members").select("class_id").eq("student_id", student.id);
  const classIds = (memberships ?? []).map((item) => item.class_id);
  const { data: classes } = classIds.length ? await db.from("classes").select("id,name").in("id", classIds) : { data: [] as any[] };
  const { data: openUnits } = classIds.length ? await db.from("class_units").select("class_id,unit_id,enabled").in("class_id", classIds).eq("enabled", true) : { data: [] as any[] };
  const unitIds = [...new Set((openUnits ?? []).map((item) => item.unit_id))];
  const { data: units } = unitIds.length ? await db.from("units").select("id,textbook_id,unit_no,title").in("id", unitIds).order("unit_no") : { data: [] as any[] };
  const textbookIds = [...new Set((units ?? []).map((item) => item.textbook_id))];
  const { data: textbooks } = textbookIds.length ? await db.from("textbooks").select("id,title,publisher").in("id", textbookIds) : { data: [] as any[] };
  const { data: contents } = unitIds.length
    ? await db.from("learning_contents").select("id,unit_id,type,title,content_text,major_topic,sub_topic,tags,metadata").in("unit_id", unitIds).order("created_at")
    : { data: [] as any[] };

  return (
    <div className="shell">
      <header className="topbar"><div className="brand">Pamus Grit <span>Study</span></div><form action={logout}><button className="btn btn-ghost">로그아웃</button></form></header>
      <main className="container">
        <div className="page-title"><div><h1>{student.name} 학생</h1><p>{currentGrade(student.grade_code, student.grade_base_year)} · {(classes ?? []).map((item) => item.name).join(", ") || "배정된 반 없음"}</p></div></div>
        <div className="grid">
          {(units ?? []).map((unit) => {
            const textbook = (textbooks ?? []).find((item) => item.id === unit.textbook_id);
            const unitContents = (contents ?? []).filter((item) => item.unit_id === unit.id);
            return (
              <section className="card span-6" key={unit.id}>
                <div className="section-label">{textbook?.title}</div>
                <h2>Unit {unit.unit_no}. {unit.title}</h2>
                <div className="stack">
                  {unitContents.map((item) => <ContentDetails key={item.id} item={item} />)}
                  {!unitContents.length && <div className="muted">아직 등록된 학습자료가 없습니다.</div>}
                </div>
              </section>
            );
          })}
          {!(units ?? []).length && <section className="card span-12"><h2>학습할 유닛이 아직 없습니다.</h2><p className="muted">관리자가 반에 교과서와 유닛을 열어주면 여기에 표시됩니다.</p></section>}
        </div>
      </main>
    </div>
  );
}

function ContentDetails({ item }: { item: any }) {
  const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};

  return (
    <details className="unit-card learning-detail">
      <summary>
        <span className="tag tag-red">{typeName[item.type]}</span>
        <span className="learning-title">{item.title}</span>
      </summary>
      {(item.major_topic || item.sub_topic) && <div className="learning-path">{[item.major_topic, item.sub_topic].filter(Boolean).join(" › ")}</div>}
      {item.type === "vocabulary" && <VocabularyContent metadata={metadata} fallback={item.content_text} />}
      {item.type === "grammar" && <GrammarContent metadata={metadata} content={item.content_text} />}
      {item.type === "dialogue" && <DialogueContent metadata={metadata} fallback={item.content_text} />}
      {item.type === "passage" && <PassageContent metadata={metadata} content={item.content_text} />}
    </details>
  );
}

function VocabularyContent({ metadata, fallback }: { metadata: any; fallback: string }) {
  const items = Array.isArray(metadata.items) ? metadata.items : [];
  if (!items.length) return <pre className="plain-content">{fallback}</pre>;
  return (
    <div className="table-wrap learning-table"><table><thead><tr><th>단어</th><th>뜻</th><th>품사</th><th>예문</th></tr></thead><tbody>
      {items.map((item: any, index: number) => <tr key={`${item.word}-${index}`}><td><strong>{item.word}</strong></td><td>{item.meaning}</td><td>{item.part_of_speech || "-"}</td><td>{item.example || "-"}{item.example_ko && <div className="muted mini-translation">{item.example_ko}</div>}</td></tr>)}
    </tbody></table></div>
  );
}

function GrammarContent({ metadata, content }: { metadata: any; content: string }) {
  const examples = Array.isArray(metadata.examples) ? metadata.examples : [];
  return (
    <div className="content-body">
      <div className="content-block"><h4>개념 설명</h4><p className="preline">{content}</p></div>
      {!!examples.length && <div className="content-block"><h4>예문</h4><ul>{examples.map((example: string, index: number) => <li key={index}>{example}</li>)}</ul></div>}
    </div>
  );
}

function DialogueContent({ metadata, fallback }: { metadata: any; fallback: string }) {
  const dialogueLines = Array.isArray(metadata.lines) ? metadata.lines : [];
  const translations = Array.isArray(metadata.translation_lines) ? metadata.translation_lines : [];
  const expressions = Array.isArray(metadata.key_expressions) ? metadata.key_expressions : [];
  return (
    <div className="content-body">
      <div className="dialogue-box">
        {dialogueLines.length ? dialogueLines.map((line: any, index: number) => <div className="dialogue-line" key={index}><b>{line.speaker || "•"}</b><span>{line.text}</span>{translations[index] && <small>{translations[index]}</small>}</div>) : <pre className="plain-content">{fallback}</pre>}
      </div>
      {!!expressions.length && <div className="content-block"><h4>핵심 표현</h4>{expressions.map((expression: any, index: number) => <div className="expression-row" key={index}><strong>{expression.expression}</strong><span>{expression.meaning}</span></div>)}</div>}
    </div>
  );
}

function PassageContent({ metadata, content }: { metadata: any; content: string }) {
  const grammarPoints = Array.isArray(metadata.grammar_points) ? metadata.grammar_points : [];
  const vocabulary = Array.isArray(metadata.vocabulary) ? metadata.vocabulary : [];
  return (
    <div className="content-body">
      <div className="content-block"><h4>본문</h4><p className="preline passage-text">{content}</p></div>
      {metadata.translation && <div className="content-block soft-block"><h4>해석</h4><p className="preline">{metadata.translation}</p></div>}
      {!!grammarPoints.length && <div className="content-block"><h4>핵심 문법</h4><div className="tag-row">{grammarPoints.map((point: string, index: number) => <span className="tag" key={index}>{point}</span>)}</div></div>}
      {!!vocabulary.length && <div className="content-block"><h4>핵심 어휘</h4>{vocabulary.map((item: any, index: number) => <div className="expression-row" key={index}><strong>{item.word}</strong><span>{item.meaning}</span></div>)}</div>}
    </div>
  );
}
