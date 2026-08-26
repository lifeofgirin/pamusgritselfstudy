"use client";

import { approveGeneratedQuestion, deleteGeneratedQuestion } from "./actions";

export default function QuestionActionButtons({
  questionId,
  status,
}: {
  questionId: string;
  status: string;
}) {
  return (
    <div className="question-actions">
      {status !== "approved" && (
        <form action={approveGeneratedQuestion}>
          <input type="hidden" name="questionId" value={questionId} />
          <button className="btn btn-soft btn-mini" type="submit">승인</button>
        </form>
      )}
      <form
        action={deleteGeneratedQuestion}
        onSubmit={(event) => {
          if (!window.confirm("이 AI 생성 문제를 삭제할까요?")) event.preventDefault();
        }}
      >
        <input type="hidden" name="questionId" value={questionId} />
        <button className="btn btn-danger btn-mini" type="submit">삭제</button>
      </form>
    </div>
  );
}
