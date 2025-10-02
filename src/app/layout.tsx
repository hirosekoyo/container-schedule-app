import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "動静表作成ツール",
  description: "荷役予定を管理するアプリケーション",
  // --- 【ここからが追加箇所】 ---
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "船舶動静",
  },
    viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1, // 拡大を許可しない
    userScalable: false, // ユーザーによるズーム操作を禁止
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
      <body className={`${inter.className} overscroll-none`}>
        {children}
        <Analytics />
        <Toaster richColors position="top-center" toastOptions={{ style: { zIndex: 9999 } }} /> 
      </body>
      {/* --- 【ここまで】 --- */}
    </html>
  );
}