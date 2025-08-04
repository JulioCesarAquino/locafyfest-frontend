import { ReactNode } from 'react';
import { ClientSidebar } from './ClientSidebar';
import { Header } from './Header';

interface ClientLayoutProps {
  children: ReactNode;
  userName?: string;
}

export function ClientLayout({ children, userName = "Maria Silva" }: ClientLayoutProps) {
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