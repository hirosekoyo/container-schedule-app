import React from 'react';
import './print.css'; // 1. 作成したCSSをインポート

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      {/* 2. bodyにTailwindの基本スタイルと背景色を適用 */}
      <body className="font-sans bg-gray-100">
        {children}
      </body>
    </html>
  );
}