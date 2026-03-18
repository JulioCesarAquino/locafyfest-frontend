import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: ReactNode;
  userType: 'admin' | 'client';
  companyName?: string;
}

export function AppLayout({ children, userType, companyName }: AppLayoutProps) {
  const { userName } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-surface">
      <Sidebar userType={userType} />
      <div className="md:ml-72">
        <Header 
          userName={userName} 
          userType={userType} 
          companyName={companyName} 
        />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}