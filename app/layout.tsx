import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "四驱兄弟 十周年 奥林匹克运动会",
  description: "Live 4-player party scoreboard, cards, and reveal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
