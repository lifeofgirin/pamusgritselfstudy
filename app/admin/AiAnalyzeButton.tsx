"use client";

import { useFormStatus } from "react-dom";
import { analyzeLearningContent } from "./actions";

function SubmitButton({ analyzed }: { analyzed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-soft btn-mini" disabled={pending}>
      {pending ? "AI 분석 중..." : analyzed ? "AI 재분석" : "AI 분석"}
    </button>
  );
}

export default function AiAnalyzeButton({
  contentId,
  analyzed,
}: {
  contentId: string;
  analyzed: boolean;
}) {
  return (
    <form action={analyzeLearningContent}>
      <input type="hidden" name="contentId" value={contentId} />
      <SubmitButton analyzed={analyzed} />
    </form>
  );
}
