import { Bell, User, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
interface HeaderProps {
  userName: string;
  userType: 'admin' | 'client';
  companyName?: string;
}
export function Header({
  userName,
  userType,
  companyName
}: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications] = useState(3);
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };
  return <header className="h-16 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 bg-background/80">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">
            {userType === 'admin' ? 'Painel Admin' : 'Portal Cliente'}
          </h1>
          {companyName && <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{companyName}</p>}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Theme Toggle */}
        <Button variant="outline" size="icon" onClick={toggleDarkMode} className="w-8 h-8 sm:w-9 sm:h-9 hidden sm:flex">
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        {/* Notifications */}
        <Button variant="outline" size="icon" className="relative w-8 h-8 sm:w-9 sm:h-9 hidden sm:flex">
          <Bell size={16} />
          {notifications > 0 && <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs bg-danger">
              {notifications}
            </Badge>}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 h-8 sm:h-9 px-2 sm:px-3">
              <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                  {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-medium truncate max-w-32">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">{userType}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background border-border z-50">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            {userType === 'admin' && <DropdownMenuItem>
                <span>Configurações</span>
              </DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>;
}