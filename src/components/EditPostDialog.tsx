"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from "@/components/ui/button";
// ▼▼▼ 変更点1: DialogDescriptionをインポート ▼▼▼
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Info } from 'lucide-react'; // Infoアイコンをインポート
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Post, upsertPost } from '@/lib/supabase/actions';

interface EditPostDialogProps {
  post: Partial<Post> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPostDialog({ post, open, onOpenChange }: EditPostDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<Partial<Post>>({});

  useEffect(() => {
    if (open) {
      if (post && post.id) {
        setFormData(post);
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFormData({
          from: '',
          to: '',
          expiration_date: format(tomorrow, 'yyyy-MM-dd'),
          content: '',
          is_attention: false,
        });
      }
    }
  }, [post, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const prependHashtag = () => {
    const hashtag = "#読んだら削除して！";
    const currentContent = formData.content || '';
    if (currentContent.startsWith(hashtag)) {
      return;
    }
    const newContent = `${hashtag}\n${currentContent}`;
    setFormData(prev => ({ ...prev, content: newContent }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.expiration_date) {
      alert('掲載期限は必須です。');
      return;
    }
    startTransition(async () => {
      const { error } = await upsertPost(formData as Post);
      if (!error) {
        onOpenChange(false);
      } else {
        alert(`保存中にエラーが発生しました: ${error.message}`);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{post?.id ? '掲示を編集' : '新規掲示を作成'}</DialogTitle>
            <DialogDescription className="pt-2 text-orange-600 flex items-start gap-1.5">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>掲載期限で自動削除は行いません。個人宛ではない掲示は作成者が削除してください！</span>
            </DialogDescription>
        </DialogHeader>
        <form id="post-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* ▼▼▼ 変更点3: placeholderを追加 ▼▼▼ */}
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" name="from" value={formData.from || ''} onChange={handleChange} placeholder="例: 〇日当直 (未記入で匿名)" />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" value={formData.to || ''} onChange={handleChange} placeholder="例: 〇日当直 、動静表作成者 (未記入で全員)" />
            </div>
          </div>
          <div>
            <Label htmlFor="expiration_date">掲載期限 *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expiration_date ? format(new Date(formData.expiration_date), 'yyyy/MM/dd') : <span>日付を選択</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.expiration_date ? new Date(formData.expiration_date) : undefined}
                  onSelect={(date) => setFormData(prev => ({ ...prev, expiration_date: date ? format(date, 'yyyy-MM-dd') : null }))}
                  initialFocus
                  locale={ja}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="content">内容</Label>
            {/* ▼▼▼ 変更点3: placeholderを追加 ▼▼▼ */}
            <Textarea id="content" name="content" value={formData.content || ''} onChange={handleChange} rows={5} placeholder="例: 〇日の緊急工事の予定を消さないように注意して！！" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="is_attention" checked={formData.is_attention} onCheckedChange={(checked) => setFormData(prev => ({...prev, is_attention: !!checked}))} />
              <Label htmlFor="is_attention">お知らせ【動静表の作成画面に通知されます】</Label>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={prependHashtag}>
              #読んだら削除して！
            </Button>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="post-form" disabled={isPending}>{isPending ? '保存中...' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}