"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UAParser } from 'ua-parser-js'; // 1. ua-parser-jsをインポート

// Dateオブジェクトを 'YYYY-MM-DD' 形式の文字列に変換
const formatDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // 2. ユーザーエージェントを解析
    const parser = new UAParser(window.navigator.userAgent);
    const device = parser.getDevice();
    
    const today = new Date();
    const todayDateString = formatDate(today);

    // 3. デバイスタイプによってリダイレクト先を振り分ける
    if (device.type === 'mobile' || device.type === 'tablet') {
      // PWAのstart_urlからのアクセスをモバイルページに
      router.replace(`/mobile/${todayDateString}`);
    } else {
      // PCからのアクセスは、これまでのメニューページへ
      router.replace(`/home`); // 新しいPC用トップページのパス
    }
  }, [router]);

  return <div className="flex h-screen items-center justify-center">読み込み中...</div>;
}