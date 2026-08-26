"use client";

import { deleteLearningContent } from "./actions";

export default function DeleteLearningContentButton({
  contentId,
  title,
}: {
  contentId: string;
  title: string;
}) {
  return (
    <form
      action={deleteLearningContent}
      onSubmit={(event) => {
        if (!window.confirm(`"${title}" 자료를 삭제할까요?\n삭제한 자료는 복구할 수 없습니다.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="contentId" value={contentId} />
      <button type="submit" className="btn btn-danger btn-mini">
        삭제
      </button>
    </form>
  );
}
