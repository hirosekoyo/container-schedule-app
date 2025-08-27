import type { Metadata } from "next";
// Sans-serifフォントとMono-spaceフォントの両方をインポートします
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";

export const metadata: Metadata = {
  title: "コンテナ船荷役予定管理アプリ", // アプリケーション名に合わせて修正
  description: "コンテナ船の荷役予定を管理するアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // htmlタグにクラスを適用し、言語を日本語に設定します
    <html lang="ja" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}