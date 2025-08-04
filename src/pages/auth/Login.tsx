import { useState } from 'react';
import { Eye, EyeOff, Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent, userType: 'admin' | 'client') => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      // Redirect based on user type
      if (userType === 'admin') {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/catalog';
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      
      <div className="relative w-full max-w-lg">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-primary">
              <Package className="w-8 h-8 text-white" />
            </div>
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">
            Festa System
          </h1>
          <p className="text-muted-foreground">
            Sistema de Locação para Eventos e Festas
          </p>
        </div>

        <Card className="bg-white/90 backdrop-blur-xl border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Bem-vindo</CardTitle>
            <CardDescription className="text-center">
              Faça login para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="client" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
                <TabsTrigger 
                  value="client" 
                  className="text-sm font-semibold data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
                >
                  Cliente
                </TabsTrigger>
                <TabsTrigger 
                  value="admin" 
                  className="text-sm text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground"
                >
                  Administrador
                </TabsTrigger>
              </TabsList>

              {/* Admin Login */}
              <TabsContent value="admin">
                <form onSubmit={(e) => handleLogin(e, 'admin')} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email ou Usuário</Label>
                    <Input
                      id="admin-email"
                      type="text"
                      placeholder="admin@empresa.com"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Digite sua senha"
                        required
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Entrando...</span>
                      </div>
                    ) : (
                      'Entrar como Administrador'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Client Login */}
              <TabsContent value="client">
                <form onSubmit={(e) => handleLogin(e, 'client')} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-cpf">CPF</Label>
                    <Input
                      id="client-cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="client-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Digite sua senha"
                        required
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Entrando...</span>
                      </div>
                    ) : (
                      'Entrar como Cliente'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Novo cliente? 
                <Button variant="link" className="p-0 ml-1 h-auto text-primary">
                  Cadastre-se aqui
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            © 2024 Festa System. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}