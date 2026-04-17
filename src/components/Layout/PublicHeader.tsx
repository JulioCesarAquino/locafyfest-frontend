import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/config/app';

export function PublicHeader() {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="h-16 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 bg-background/80">
      <div className="flex items-center gap-2">
        <img src="/logo-transparent.svg" alt={APP_NAME} className="h-8 w-8" />
        <span className="text-lg font-bold text-primary">{APP_NAME}</span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="w-8 h-8 sm:w-9 sm:h-9 hidden sm:flex"
        >
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
          Entrar
        </Button>

        <Button size="sm" onClick={() => navigate('/register')}>
          Cadastrar
        </Button>
      </div>
    </header>
  );
}
