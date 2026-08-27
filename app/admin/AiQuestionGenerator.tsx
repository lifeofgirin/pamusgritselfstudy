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

      <div className="difficulty-picker">
        <div>
          <label>목표 출제 레벨</label>
          <p>자료 난이도와 별개로, 이번에 만들 문제의 변형·추론 수준을 정합니다.</p>
        </div>
        <select className="select difficulty-select" name="targetDifficulty" defaultValue="5">
          <option value="1">Lv.1 · 아주 기본</option>
          <option value="2">Lv.2 · 기본 확인</option>
          <option value="3">Lv.3 · 쉬운 내신</option>
          <option value="4">Lv.4 · 기본 내신</option>
          <option value="5">Lv.5 · 일반 내신</option>
          <option value="6">Lv.6 · 일반+변형</option>
          <option value="7">Lv.7 · 고난도 변형</option>
          <option value="8">Lv.8 · 복합/함정</option>
          <option value="9">Lv.9 · 최상위</option>
          <option value="10">Lv.10 · 최상위 서술/추론</option>
        </select>
      </div>

      <div className="ai-note ai-note-strong">
        <strong>AI가 현재 Unit에 등록된 어휘·문법·대화문·본문만 읽어서 출제합니다.</strong>
        <span>선택한 레벨은 ‘목표 난이도’입니다. 생성 후 AI가 각 문항의 실제 난이도도 다시 판정해서 함께 저장합니다.</span>
      </div>
      <GenerateButton />
    </form>
  );
}
