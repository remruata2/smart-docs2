'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/ui/toast';
import { SupabaseProvider } from './supabase-provider';

interface ClientProvidersProps {
  children: ReactNode;
  session?: any;
}

import { ChallengeNotification } from '@/components/battle/ChallengeNotification';

export default function ClientProviders({ children, session }: ClientProvidersProps) {
  return (
    <SessionProvider session={session} refetchInterval={5 * 60}>
      <SupabaseProvider>
        <ToastProvider>
          {children}
          {session?.user?.id && (
            <ChallengeNotification currentUserId={parseInt(session.user.id)} />
          )}
        </ToastProvider>
      </SupabaseProvider>
    </SessionProvider>
  );
}