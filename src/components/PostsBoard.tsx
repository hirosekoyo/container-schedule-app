"use client";

import React, { useState, useTransition } from 'react';
import { Post, deletePost } from '@/lib/supabase/actions';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, PlusCircle, BellRing } from 'lucide-react';
import { EditPostDialog } from './EditPostDialog';
import { format, toDate } from 'date-fns-tz';

interface PostsBoardProps {
  initialPosts: Post[];
}

export function PostsBoard({ initialPosts }: PostsBoardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Partial<Post> | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (post: Post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedPost(null);
    setIsModalOpen(true);
  };
  
  const handleDelete = (postId: number, content: string) => {
    if (window.confirm(`以下の投稿を削除しますか？\n\n「${content.substring(0, 20)}...」`)) {
      startTransition(async () => {
        const { error } = await deletePost(postId);
        if (error) {
          alert(`削除中にエラーが発生しました: ${error.message}`);
        }
      });
    }
  };

  return (
    <div className="w-fullSS space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">掲示板</h2>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* ▼▼▼ 変更点2: gridのクラスを変更して縦1列に ▼▼▼ */}
      <div className="grid grid-cols-1 gap-4">
        {initialPosts.map(post => (
          <Card key={post.id} className={post.is_attention ? 'border-yellow-400 bg-yellow-50/50' : ''}>
            <CardHeader>
              <CardTitle className="text-base flex justify-between items-start">
                <div className="space-y-1">
                  <span>To: {post.to || '各位'}</span>
                  <span className="block text-xs text-gray-500">From: {post.from || '匿名希望'}</span>
                </div>
                {post.is_attention && <BellRing className="h-5 w-5 text-yellow-500" />}
              </CardTitle>
              <CardDescription>
                作成日時: {format(toDate(post.created_at, { timeZone: 'Asia/Tokyo' }), 'yyyy/MM/d HH:mm')} | 
                掲載期限: {post.expiration_date ? format(new Date(post.expiration_date), 'yyyy/MM/d') : '無期限'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{post.content}</p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" size="icon" onClick={() => handleEdit(post)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={() => handleDelete(post.id, post.content)} disabled={isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {initialPosts.length === 0 && (
        <p className="text-center text-gray-500">表示する掲示はありません。</p>
      )}

      <EditPostDialog 
        post={selectedPost}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}