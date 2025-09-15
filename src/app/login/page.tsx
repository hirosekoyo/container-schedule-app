"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Database } from '@/types/database.types';

export default function LoginPage() {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/');
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-800">
            ログイン
          </h1>
        </header>
        <main className="rounded-lg border bg-white p-8 shadow-md">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="light"
            providers={[]}
            showLinks={false}
            view="sign_in"
            localization={{
              variables: {
                sign_in: {
                  email_label: 'ID',
                  password_label: 'パスワード',
                  button_label: 'ログイン',
                  email_input_placeholder: 'IDを入力',
                  password_input_placeholder: 'パスワードを入力',
                },
              },
            }}
          />
        </main>
      </div>
    </div>
  );
}