const withPWA = require('next-pwa')({
  dest: 'public', // PWA関連のファイルをpublicディレクトリに出力
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // 開発環境ではPWAを無効化
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ここに既存のNext.js設定があれば記述
};

module.exports = withPWA(nextConfig);