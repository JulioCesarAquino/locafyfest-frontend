import { ReactNode } from 'react';
import { PublicHeader } from './PublicHeader';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-surface">
      <PublicHeader />
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
