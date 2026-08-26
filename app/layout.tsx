import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pamus Grit Study",
  description: "학생 맞춤형 내신 학습 플랫폼",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
