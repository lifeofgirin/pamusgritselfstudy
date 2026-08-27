"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import { analyzePdfImport, createPdfUploadTicket, deletePdfImport, registerPdfImport } from "./actions";

type UnitOption = { id: string; label: string };

type DraftItem = {
  type: "vocabulary" | "grammar" | "dialogue" | "passage";
  title: string;
  major_topic: string;
  sub_topic: string;
  content_text: string;
  auxiliary_text: string;
  extra_text: string;
  tags: string[];
  confidence: number;
  source_note: string;
  include?: boolean;
};

type PdfImport = {
  id: string;
  unit_id: string;
  original_filename: string;
  status: string;
  ai_summary?: string | null;
  ai_result?: { warnings?: string[]; contents?: DraftItem[] } | null;
  error_message?: string | null;
  created_at?: string | null;
};

const TYPE_LABELS: Record<DraftItem["type"], string> = {
  vocabulary: "어휘",
  grammar: "문법",
  dialogue: "대화문",
  passage: "본문",
};

export default function PdfAiImportPanel({ units, imports }: { units: UnitOption[]; imports: PdfImport[] }) {
  const router = useRouter();
  const [unitId, setUnitId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadAndAnalyze() {
    if (!unitId) return setMessage("Unit을 먼저 선택해주세요.");
    if (!file) return setMessage("PDF 파일을 선택해주세요.");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setMessage("PDF 파일만 업로드할 수 있습니다.");
    if (file.size > 25 * 1024 * 1024) return setMessage("PDF는 최대 25MB까지 업로드할 수 있습니다.");

    setBusy(true);
    setMessage("업로드 준비 중...");
    try {
      const ticket = await createPdfUploadTicket(unitId, file.name, file.size);
      if (!ticket.ok) throw new Error(ticket.error);

      setMessage("PDF 업로드 중...");
      const supabase = createBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("study-pdfs")
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: "application/pdf" });
      if (uploadError) throw new Error(uploadError.message);

      setMessage("AI가 PDF를 읽고 자료를 분류하는 중... 잠시만 기다려주세요.");
      const analyzed = await analyzePdfImport(ticket.importId);
      if (!analyzed.ok) throw new Error(analyzed.error);
      setMessage("AI 분석 완료! 아래 검수 영역에서 오류만 고친 뒤 등록하면 됩니다.");
      setFile(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PDF 처리 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pdf-panel">
      <div className="pdf-upload-grid">
        <div className="field">
          <label>교과서 / Unit</label>
          <select className="select" value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={busy}>
            <option value="">선택</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>PDF 자료</label>
          <input
            className="input"
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="form-help">최대 25MB · 교과서 본문, 대화문, 문법 프린트, 단어자료 등</div>
        </div>
        <button className="btn btn-primary pdf-upload-button" type="button" onClick={uploadAndAnalyze} disabled={busy}>
          {busy ? "PDF AI 분석 중..." : "PDF 업로드 + AI 분석"}
        </button>
      </div>
      {message && <div className={message.includes("오류") || message.includes("못") || message.includes("부족") ? "error" : "success"}>{message}</div>}

      <div className="ai-note ai-note-strong">
        <strong>PDF는 바로 학생 자료로 등록되지 않습니다.</strong>
        <span>AI가 어휘·문법·대화문·본문으로 먼저 분류해 초안을 만들고, 선생님이 오타/분류 오류만 고친 뒤 ‘검수 내용 전체 등록’을 누르는 구조입니다.</span>
      </div>

      <div className="pdf-import-list">
        {imports.map((item) => <PdfImportCard key={item.id} item={item} unitLabel={units.find((u) => u.id === item.unit_id)?.label ?? "Unit"} />)}
        {!imports.length && <div className="muted pdf-empty">아직 PDF 자동등록 기록이 없습니다.</div>}
      </div>
    </div>
  );
}

function PdfImportCard({ item, unitLabel }: { item: PdfImport; unitLabel: string }) {
  const router = useRouter();
  const initialItems = useMemo(() => (item.ai_result?.contents ?? []).map((x) => ({ ...x, include: true })), [item.ai_result]);
  const [drafts, setDrafts] = useState<DraftItem[]>(initialItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function update(index: number, patch: Partial<DraftItem>) {
    setDrafts((current) => current.map((entry, i) => i === index ? { ...entry, ...patch } : entry));
  }

  async function registerAll() {
    const selected = drafts.filter((x) => x.include !== false).map(({ include: _include, ...rest }) => rest);
    if (!selected.length) return setMessage("등록할 항목을 최소 1개 선택해주세요.");
    setBusy(true);
    setMessage("검수한 자료를 등록하는 중...");
    const result = await registerPdfImport(item.id, JSON.stringify(selected));
    setBusy(false);
    if (!result.ok) return setMessage(result.error);
    setMessage("등록 완료! 기존 학습자료 목록에 추가됐습니다.");
    router.refresh();
  }

  async function removeDraft() {
    if (!confirm(`'${item.original_filename}' PDF 초안을 삭제할까요?`)) return;
    setBusy(true);
    const result = await deletePdfImport(item.id);
    setBusy(false);
    if (!result.ok) return setMessage(result.error);
    router.refresh();
  }

  const statusLabel: Record<string, string> = {
    uploaded: "업로드됨",
    analyzing: "AI 분석 중",
    review: "검수 대기",
    registered: "등록 완료",
    error: "오류",
  };

  return (
    <article className="pdf-import-card">
      <div className="pdf-import-head">
        <div>
          <div className="actions"><span className="tag tag-red">PDF AI</span><span className={`status-badge ${item.status === "registered" ? "approved" : "draft"}`}>{statusLabel[item.status] ?? item.status}</span></div>
          <h3>{item.original_filename}</h3>
          <div className="muted pdf-unit-label">{unitLabel}</div>
        </div>
        {item.status !== "registered" && <button className="btn btn-danger btn-mini" type="button" onClick={removeDraft} disabled={busy}>초안 삭제</button>}
      </div>

      {item.ai_summary && <p className="pdf-summary">{item.ai_summary}</p>}
      {!!item.ai_result?.warnings?.length && (
        <div className="pdf-warning"><strong>AI 확인 필요</strong>{item.ai_result.warnings.map((warning, i) => <div key={i}>• {warning}</div>)}</div>
      )}
      {item.error_message && <div className="error">{item.error_message}</div>}

      {item.status === "review" && (
        <>
          <div className="pdf-review-list">
            {drafts.map((draft, index) => (
              <div className={`pdf-review-item ${draft.include === false ? "excluded" : ""}`} key={index}>
                <div className="pdf-review-top">
                  <label className="pdf-check"><input type="checkbox" checked={draft.include !== false} onChange={(e) => update(index, { include: e.target.checked })} /> 등록</label>
                  <select className="select pdf-type-select" value={draft.type} onChange={(e) => update(index, { type: e.target.value as DraftItem["type"] })}>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                  <span className="confidence-badge">AI 확신 {draft.confidence}%</span>
                </div>
                <div className="form-row">
                  <div className="field"><label>제목</label><input className="input" value={draft.title} onChange={(e) => update(index, { title: e.target.value })} /></div>
                  <div className="field"><label>대분류 / 주제</label><input className="input" value={draft.major_topic} onChange={(e) => update(index, { major_topic: e.target.value })} /></div>
                </div>
                {draft.type === "grammar" && <div className="field"><label>세부개념</label><input className="input" value={draft.sub_topic} onChange={(e) => update(index, { sub_topic: e.target.value })} /></div>}
                <div className="field"><label>{primaryLabel(draft.type)}</label><textarea className="textarea pdf-main-text" value={draft.content_text} onChange={(e) => update(index, { content_text: e.target.value })} /></div>
                {draft.type !== "vocabulary" && <div className="field"><label>{secondaryLabel(draft.type)}</label><textarea className="textarea textarea-sm" value={draft.auxiliary_text} onChange={(e) => update(index, { auxiliary_text: e.target.value })} /></div>}
                {draft.type !== "vocabulary" && <div className="field"><label>{extraLabel(draft.type)}</label><textarea className="textarea textarea-sm" value={draft.extra_text} onChange={(e) => update(index, { extra_text: e.target.value })} /></div>}
                <div className="pdf-source-note">PDF 위치 메모: {draft.source_note || "-"}</div>
              </div>
            ))}
          </div>
          {message && <div className={message.includes("완료") ? "success" : "error"}>{message}</div>}
          <button className="btn btn-primary" type="button" onClick={registerAll} disabled={busy}>{busy ? "등록 중..." : "검수 내용 전체 등록"}</button>
        </>
      )}

      {item.status === "registered" && <div className="success">이 PDF에서 검수한 자료가 학습자료로 등록되었습니다.</div>}
    </article>
  );
}

function primaryLabel(type: DraftItem["type"]) {
  if (type === "vocabulary") return "단어 목록 (영단어 | 뜻 | 품사 | 예문 | 예문해석)";
  if (type === "grammar") return "문법 설명 / 규칙";
  if (type === "dialogue") return "영어 대화문";
  return "영어 본문";
}
function secondaryLabel(type: DraftItem["type"]) {
  if (type === "grammar") return "예문 (한 줄에 하나)";
  if (type === "dialogue") return "대화문 해석";
  return "본문 해석";
}
function extraLabel(type: DraftItem["type"]) {
  if (type === "grammar") return "PDF 강조 포인트 / 주의점";
  if (type === "dialogue") return "핵심 표현 (표현 | 뜻)";
  return "핵심 문법 포인트 (한 줄에 하나)";
}
