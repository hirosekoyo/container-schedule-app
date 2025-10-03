import type { Metadata, Viewport } from 'next';
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "動静表作成ツール",
  description: "荷役予定を管理するアプリケーション",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "船舶動静",
  },
};

// ▼▼▼ 変更点2: viewportを独立してエクスポートする ▼▼▼
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      {/* スクロール時のバウンスを抑制する */}
      <body className={`${inter.className} overscroll-none`}>
        {children}
        <Analytics />
        <Toaster richColors position="top-center" toastOptions={{ style: { zIndex: 9999 } }} />
      </body>
    </html>
  );
}