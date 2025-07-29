import { AppLayout } from '@/components/Layout/AppLayout';
import Dashboard from './admin/Dashboard';

const Index = () => {
  // Temporary: Show admin dashboard
  // In production, this would check authentication state
  const userType = 'admin';
  const userName = 'João Silva';
  const companyName = 'Festa & Cia Locações';

  return (
    <AppLayout 
      userType={userType} 
      userName={userName} 
      companyName={companyName}
    >
      <Dashboard />
    </AppLayout>
  );
};

export default Index;
