import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "コンテナ船荷役予定管理",
  description: "コンテナ船の荷役予定を管理するアプリケーション",
  // --- 【ここからが追加箇所】 ---
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "荷役予定",
  },
  // --- 【ここまで】 ---
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      {/* --- 【ここからが修正箇所】 --- */}
      {/* スクロール時のバウンスを抑制する */}
      <body className={`${inter.className} overscroll-behavior-none`}>
        {children}
      </body>
      {/* --- 【ここまで】 --- */}
    </html>
  );
}