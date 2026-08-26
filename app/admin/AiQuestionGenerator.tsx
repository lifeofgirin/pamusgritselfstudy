"use client";

import { useFormStatus } from "react-dom";
import { generateAiQuestions } from "./actions";

type UnitOption = { id: string; label: string };

function GenerateButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? "AI가 문제 만드는 중..." : "AI 문제 생성"}
    </button>
  );
}

export default function AiQuestionGenerator({ units }: { units: UnitOption[] }) {
  return (
    <form action={generateAiQuestions} className="ai-generator-form">
      <div className="form-row-4">
        <div className="field" style={{ gridColumn: "span 2" }}>
          <label>출제 범위</label>
          <select className="select" name="unitId" required defaultValue="">
            <option value="" disabled>교과서 / Unit 선택</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>문제 유형</label>
          <select className="select" name="questionType" defaultValue="mixed">
            <option value="mixed">혼합 내신형</option>
            <option value="vocabulary">어휘</option>
            <option value="grammar">어법 / 문법</option>
            <option value="content_match">내용 일치</option>
            <option value="blank">빈칸</option>
            <option value="order">순서 배열</option>
            <option value="writing">서술형 / 영작</option>
          </select>
        </div>
        <div className="field">
          <label>문항 수</label>
          <select className="select" name="questionCount" defaultValue="5">
            <option value="3">3문항</option>
            <option value="5">5문항</option>
            <option value="10">10문항</option>
            <option value="15">15문항</option>
            <option value="20">20문항</option>
          </select>
        </div>
      </div>
      <div className="ai-note ai-note-strong">
        <strong>AI가 현재 Unit에 등록된 어휘·문법·대화문·본문만 읽어서 출제합니다.</strong>
        <span>생성 문제는 일단 초안으로 저장됩니다. 검수 후 승인해야 다음 학생 풀이 단계에서 사용할 수 있게 만들 예정입니다.</span>
      </div>
      <GenerateButton />
    </form>
  );
}
