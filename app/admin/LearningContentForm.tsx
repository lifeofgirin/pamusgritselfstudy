"use client";

import { useState } from "react";
import { createLearningContent } from "./actions";

type UnitOption = {
  id: string;
  label: string;
};

type ContentType = "vocabulary" | "grammar" | "dialogue" | "passage";

const TYPES: { value: ContentType; label: string; description: string }[] = [
  { value: "vocabulary", label: "어휘", description: "단어·뜻·품사·예문을 구조화해서 저장" },
  { value: "grammar", label: "문법", description: "대분류·세부개념·난이도를 분리해서 저장" },
  { value: "dialogue", label: "대화문", description: "상황·화자별 대화·핵심 표현을 저장" },
  { value: "passage", label: "본문", description: "본문·해석·문법 포인트·핵심 어휘를 저장" },
];

export default function LearningContentForm({ units }: { units: UnitOption[] }) {
  const [type, setType] = useState<ContentType>("vocabulary");

  return (
    <form action={createLearningContent} className="content-form">
      <div className="form-row">
        <div className="field">
          <label>유닛</label>
          <select className="select" name="unitId" required defaultValue="">
            <option value="" disabled>교과서 / Unit 선택</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>자료 제목</label>
          <input className="input" name="contentTitle" placeholder="예: Unit 3 핵심 수동태" required />
        </div>
      </div>

      <input type="hidden" name="type" value={type} />

      <div className="field">
        <label>자료 종류</label>
        <div className="type-tabs">
          {TYPES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`type-tab ${type === item.value ? "active" : ""}`}
              onClick={() => setType(item.value)}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </div>

      {type === "vocabulary" && <VocabularyFields />}
      {type === "grammar" && <GrammarFields />}
      {type === "dialogue" && <DialogueFields />}
      {type === "passage" && <PassageFields />}

      <div className="field">
        <label>공통 태그 <span className="label-optional">선택</span></label>
        <input className="input" name="tags" placeholder="예: 시험범위, 핵심, 서술형 대비 (쉼표로 구분)" />
      </div>

      <button className="btn btn-primary btn-wide">학습자료 등록</button>
    </form>
  );
}

function VocabularyFields() {
  return (
    <div className="content-fields">
      <div className="section-kicker">어휘 등록</div>
      <div className="field">
        <label>단어 목록</label>
        <textarea
          className="textarea textarea-xl"
          name="vocabularyText"
          placeholder={"protect | 보호하다 | v. | We must protect the earth. | 우리는 지구를 보호해야 한다.\nenvironment | 환경 | n. | We care about the environment. | 우리는 환경을 생각한다."}
          required
        />
        <div className="form-help">한 줄에 한 단어 · <b>영단어 | 뜻 | 품사 | 예문 | 예문해석</b> 순서. 뒤 항목은 생략 가능.</div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>어휘 범주 <span className="label-optional">선택</span></label>
          <input className="input" name="majorTopic" placeholder="예: Unit 핵심 어휘" />
        </div>
        <DifficultyField defaultValue={2} />
      </div>
    </div>
  );
}

function GrammarFields() {
  return (
    <div className="content-fields">
      <div className="section-kicker">문법 등록</div>
      <div className="form-row">
        <div className="field">
          <label>문법 대분류</label>
          <input className="input" name="majorTopic" placeholder="예: 수동태" required />
        </div>
        <div className="field">
          <label>세부 개념</label>
          <input className="input" name="subTopic" placeholder="예: 4형식 수동태" required />
        </div>
      </div>
      <DifficultyField defaultValue={4} />
      <div className="field">
        <label>개념 설명</label>
        <textarea className="textarea" name="grammarExplanation" placeholder="학생이 알아야 할 규칙, 변환 방식, 주의점 등을 입력" required />
      </div>
      <div className="field">
        <label>예문 <span className="label-optional">한 줄에 하나</span></label>
        <textarea className="textarea textarea-sm" name="grammarExamples" placeholder={"They gave me a present. → I was given a present.\nA present was given to me."} />
      </div>
      <div className="field">
        <label>출제 포인트 / 선생님 메모 <span className="label-optional">선택</span></label>
        <textarea className="textarea textarea-sm" name="teacherNote" placeholder="예: give의 두 가지 수동태 형태를 모두 구분시키기" />
      </div>
    </div>
  );
}

function DialogueFields() {
  return (
    <div className="content-fields">
      <div className="section-kicker">대화문 등록</div>
      <div className="form-row">
        <div className="field">
          <label>대화 상황 / 의사소통 기능</label>
          <input className="input" name="majorTopic" placeholder="예: 조언하기 / 충고 구하기" required />
        </div>
        <DifficultyField defaultValue={3} />
      </div>
      <div className="field">
        <label>영어 대화문</label>
        <textarea className="textarea textarea-xl" name="dialogueText" placeholder={"A: What's wrong?\nB: I have a headache.\nA: You should get some rest."} required />
        <div className="form-help"><b>A:</b>, <b>B:</b>처럼 화자를 붙여 입력하면 나중에 AI가 대화 순서 문제를 만들기 쉬워져.</div>
      </div>
      <div className="field">
        <label>대화문 해석 <span className="label-optional">선택</span></label>
        <textarea className="textarea textarea-sm" name="translationText" placeholder="영어 대화 순서와 맞춰 입력" />
      </div>
      <div className="field">
        <label>핵심 표현 <span className="label-optional">선택</span></label>
        <textarea className="textarea textarea-sm" name="keyExpressions" placeholder={"What's wrong? | 무슨 일이니?\nYou should ~ | 너는 ~하는 것이 좋다"} />
      </div>
    </div>
  );
}

function PassageFields() {
  return (
    <div className="content-fields">
      <div className="section-kicker">본문 등록</div>
      <div className="form-row">
        <div className="field">
          <label>본문 주제 <span className="label-optional">선택</span></label>
          <input className="input" name="majorTopic" placeholder="예: 환경 보호" />
        </div>
        <DifficultyField defaultValue={4} />
      </div>
      <div className="field">
        <label>영어 본문</label>
        <textarea className="textarea textarea-xxl" name="passageText" placeholder="교과서 본문 원문을 입력" required />
      </div>
      <div className="field">
        <label>본문 해석 <span className="label-optional">선택</span></label>
        <textarea className="textarea textarea-xl" name="translationText" placeholder="본문 해석을 입력" />
      </div>
      <div className="form-row">
        <div className="field">
          <label>핵심 문법 포인트 <span className="label-optional">한 줄에 하나</span></label>
          <textarea className="textarea textarea-sm" name="grammarPoints" placeholder={"수동태 - be + p.p.\n관계대명사 목적격 생략"} />
        </div>
        <div className="field">
          <label>본문 핵심 어휘 <span className="label-optional">선택</span></label>
          <textarea className="textarea textarea-sm" name="passageVocabulary" placeholder={"protect | 보호하다\nenvironment | 환경"} />
        </div>
      </div>
    </div>
  );
}

function DifficultyField({ defaultValue }: { defaultValue: number }) {
  return (
    <div className="field">
      <label>세부 난이도</label>
      <select className="select" name="difficultyLevel" defaultValue={String(defaultValue)}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
          <option key={level} value={level}>Lv.{level} {difficultyLabel(level)}</option>
        ))}
      </select>
      <div className="form-help">상/중/하 대신 1~10으로 저장. 이후 학생별 적응형 출제에 사용.</div>
    </div>
  );
}

function difficultyLabel(level: number) {
  if (level <= 2) return "기초 확인";
  if (level <= 4) return "기본 적용";
  if (level <= 6) return "내신 응용";
  if (level <= 8) return "고난도 변형";
  return "최상위 복합";
}
