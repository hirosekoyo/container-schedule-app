"use client";

import React from 'react';
import { Ship } from 'lucide-react';

interface LoadingShipAnimationProps {
  isLoading: boolean;
}

export function LoadingShipAnimation({ isLoading }: LoadingShipAnimationProps) {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sky-100/30 backdrop-blur-sm">
      <div className="relative w-64 h-40 overflow-hidden">
        
        <Ship 
          className="absolute z-10 w-20 h-20 text-blue-800 animate-ship-bob" 
          style={{ left: 'calc(50% - 40px)', top: 'calc(50% - 50px)' }} 
          strokeWidth={1.5}
        />
        
        {/* --- 【ここからが修正箇所】 --- */}
        <div className="absolute bottom-0 left-0 w-full h-1/2">
          {/* 各波のdivに、新しいアニメーションクラスを適用し、styleからanimationDelayを削除 */}
          <div className="absolute w-[200%] h-20 bg-blue-400 rounded-full animate-wave-1" style={{ bottom: -20, left: '-50%' }}></div>
          <div className="absolute w-[200%] h-20 bg-blue-500/80 rounded-full animate-wave-2" style={{ bottom: -30, left: '-50%' }}></div>
          <div className="absolute w-[200%] h-20 bg-blue-600/60 rounded-full animate-wave-3" style={{ bottom: -40, left: '-50%' }}></div>
        </div>
        {/* --- 【ここまで修正】 --- */}

      </div>
      <p className="mt-4 text-lg font-semibold text-blue-900 animate-pulse">
        Loading...
      </p>
    </div>
  );
}