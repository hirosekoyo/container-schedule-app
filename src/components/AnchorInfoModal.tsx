"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

// ① Lightbox関連のコンポーネントとCSSをインポート
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

interface AnchorInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const anchorData = [
  { no: 1, pos: 35.5 }, { no: 2, pos: 39.0 }, { no: 3, pos: 40.0 },
  { no: 4, pos: 44.5 }, { no: 5, pos: 48.5 }, { no: 6, pos: 51.5 },
  { no: 7, pos: 52.5 }, { no: 8, pos: 55.5 }, { no: 9, pos: 60.2 },
  { no: 10, pos: 63.2 },
];

const limitData = [
  { crane: 'IC-1', right: '40ft:35+01\n20ft:35+04', left: '右脚54+00' },
  { crane: 'IC-2', right: '40ft:36+01\n20ft:36+04', left: '右脚55+00' },
  { crane: 'IC-3', right: 'IC-2横', left: '右脚56+00' },
  { crane: 'IC-4', right: '左脚38+00', left: '右脚61+00' },
  { crane: 'IC-5', right: '左脚45+00', left: '40ft:63-09\n20ft:63-06' },
  { crane: 'IC-6', right: '左脚47-15', left: '40ft:64-07\n20ft:64-10' },
];


export function AnchorInfoModal({ open, onOpenChange }: AnchorInfoModalProps) {
  const [isImageVisible, setIsImageVisible] = useState(false);
  // ② Lightboxの開閉を管理するstateを追加
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>アンカー位置 & 極限位置</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-6 text-xs">
            
          {/* アンカー位置テーブル (変更なし) */}
          <div>
            <h3 className="font-semibold mb-2">アンカー位置</h3>
            <Table className="border">
              <TableHeader>
                <TableRow className="bg-sky-50 hover:bg-sky-100/50">
                  {anchorData.map(item => <TableHead key={item.no} className="text-center h-6 p-1">{item.no}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  {anchorData.map(item => <TableCell key={item.no} className="text-center h-6 p-1 font-medium">{item.pos}</TableCell>)}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* 極限位置テーブル (変更なし) */}
          <div>
            <h3 className="font-semibold mb-2">極限位置</h3>
            <Table className="border">
              <TableHeader>
                <TableRow className="bg-sky-50 hover:bg-sky-100/50">
                  <TableHead className="w-[20%] p-1 h-6"></TableHead>
                  <TableHead className="text-center p-1 h-6">左極限</TableHead>
                  <TableHead className="text-center p-1 h-6">右極限</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {limitData.map((row, index) => (
                  <TableRow key={row.crane} className={index % 2 === 0 ? '' : 'bg-sky-50/50'}>
                    <TableCell className="font-semibold p-1 h-6">{row.crane}</TableCell>
                    <TableCell className="whitespace-pre-wrap p-1 h-6 text-center">{row.right}</TableCell>
                    <TableCell className="whitespace-pre-wrap p-1 h-6 text-center">{row.left}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* --- ▼▼▼ ここからが追加部分です ▼▼▼ --- */}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-center">
                <Button 
                  variant="outline"
                  onClick={() => setIsImageVisible(!isImageVisible)}
                >
                {isImageVisible ? '画像を閉じる' : '画像を表示'}
                </Button>
              </div>

              {isImageVisible && (
                // ③ 画像をクリックしたらLightboxを開くようにする
                <div 
                  className="mt-4 rounded-lg border p-2 bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <Image
                    src="/images/anchor_position.png"
                    alt="アンカー位置詳細図"
                    width={1200}
                    height={800}
                    style={{ 
                      width: '100%',
                      height: 'auto',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ④ Lightboxコンポーネントをレンダリング */}
      <Lightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        slides={[{ src: "/images/anchor_position.png" }]}
        plugins={[Zoom]} // Zoomプラグインを有効化
      />
    </>
  );
}