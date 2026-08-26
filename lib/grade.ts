export const GRADE_SEQUENCE = [
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
  "고1", "고2", "고3",
] as const;

export type GradeCode = typeof GRADE_SEQUENCE[number];

export function currentGrade(baseGrade: string, baseYear: number, now = new Date()) {
  const index = GRADE_SEQUENCE.indexOf(baseGrade as GradeCode);
  if (index < 0) return baseGrade;
  const yearsPassed = Math.max(0, now.getFullYear() - baseYear);
  return GRADE_SEQUENCE[Math.min(index + yearsPassed, GRADE_SEQUENCE.length - 1)];
}
