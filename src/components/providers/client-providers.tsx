'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/ui/toast';

interface ClientProvidersProps {
  children: ReactNode;
  session?: any;
}

export default function ClientProviders({ children, session }: ClientProvidersProps) {
  return (
    <SessionProvider session={session} refetchInterval={5 * 60}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}