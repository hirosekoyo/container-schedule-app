import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createServerClient, type CookieOptions } from '@supabase/ssr'; // 1. ssrからインポート
import { cookies } from "next/headers";

// revalidate=0 は不要になるので削除

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "コンテナ船荷役予定管理",
  description: "コンテナ船の荷役予定を管理するアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 2. サーバーサイドでのセッション更新処理はMiddlewareに集約するため、
  //    このファイルでのSupabaseクライアント作成は不要になります。
  // const supabase = ...
  // await supabase.auth.getSession();

  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}