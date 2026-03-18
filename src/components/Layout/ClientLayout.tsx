import { ReactNode } from 'react';
import { ClientSidebar } from './ClientSidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';

export function ClientLayout({ children }: { children: ReactNode }) {
  const { userName } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-surface">
      <ClientSidebar />
      <div className="md:ml-72">
        <Header 
          userName={userName} 
          userType="client"
        />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}