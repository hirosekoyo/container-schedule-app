"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AnchorInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const anchorData = [
  { no: 1, pos: 35.5 }, { no: 2, pos: 39.0 }, { no: 3, pos: 40.0 },
  { no: 4, pos: 44.5 }, { no: 5, pos: 48.5 }, { no: 6, pos: 51.5 },
  { no: 7, pos: 52.5 }, { no: 8, pos: 55.5 }, { no: 9, pos: 60.5 },
  { no: 10, pos: 63.5 },
];

const limitData = [
  { crane: 'IC-1', right: '40ft:35+1\n20ft:35+4', left: '?' },
  { crane: 'IC-2', right: '40ft:36+1\n20ft:36+4', left: '?' },
  { crane: 'IC-3', right: 'IC-2横', left: '右脚56±00' },
  { crane: 'IC-4', right: '左脚38±00', left: '右脚61±00' },
  { crane: 'IC-5', right: '左脚45±00', left: '40ft:63-9\n20ft:63-6' },
  { crane: 'IC-6', right: '左脚47-15', left: '40ft:64-7\n20ft:64-10' },
];


export function AnchorInfoModal({ open, onOpenChange }: AnchorInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>アンカー位置 & 極限位置</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-6 text-xs">
          
          {/* --- 【ここからが修正箇所】 --- */}
          {/* アンカー位置テーブル */}
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

          {/* 極限位置テーブル */}
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
          {/* --- 【ここまで】 --- */}

        </div>
      </DialogContent>
    </Dialog>
  );
}