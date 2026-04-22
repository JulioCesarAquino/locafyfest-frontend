import { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2, ShoppingCart } from 'lucide-react';
import { AbceLogo } from '@/components/AbceLogo';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { useGuestCart } from "@/contexts/GuestCartContext";
import { useCart } from "@/contexts/CartContext";
import { APP_NAME, APP_SUBTITLE } from "@/config/app";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { guestItems, clearGuestCart } = useGuestCart();
  const { mergeItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { verified?: boolean; email?: string; password?: string } | null;
  const verified = state?.verified;
  const [email, setEmail] = useState(state?.email ?? '');
  const [password, setPassword] = useState(state?.password ?? '');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = await login({ email, password });
      signIn(payload);
      const isAdmin = payload.type === "admin" || payload.type === "super_admin";
      const hasGuestItems = guestItems.length > 0;
      if (!isAdmin && hasGuestItems) {
        mergeItems(guestItems);
        clearGuestCart();
      }
      if (isAdmin) {
        navigate("/admin/dashboard", { replace: true });
      } else if (hasGuestItems) {
        navigate("/my-order", { replace: true });
      } else {
        navigate("/catalog", { replace: true });
      }
    } catch (err: unknown) {
      type ApiError = { response?: { status?: number; data?: { email_verified?: boolean; email?: string; message?: string } } };
      const { response } = err as ApiError;

      if (response?.status === 403 && response.data?.email_verified === false) {
        navigate('/verify-email', { state: { email: response.data.email, password } });
        return;
      }

      setError(response?.data?.message ?? "E-mail ou senha inválidos. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

      <div className="relative w-full max-w-lg">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-1">
            <AbceLogo height={110} />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary mb-1">
            {APP_NAME}
          </h1>
          <p className="text-muted-foreground">
            {APP_SUBTITLE}
          </p>
        </div>

        <Card className="backdrop-blur-xl border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Bem-vindo</CardTitle>
            <CardDescription className="text-center">
              Faça login para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {guestItems.length > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-primary/10 border border-primary/30 px-3 py-2 text-sm text-primary mb-4">
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span>
                  Você tem <strong>{guestItems.length} {guestItems.length === 1 ? 'item' : 'itens'}</strong> salvos no orçamento. Entre para finalizar.
                </span>
              </div>
            )}
            {verified && (
              <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-600 mb-4">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>E-mail verificado com sucesso! Faça login para continuar.</span>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              <div className="text-right">
                <Button type="button" variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-primary" onClick={() => navigate('/forgot-password')}>
                  Esqueceu a senha?
                </Button>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
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
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Novo cliente?
                <Button variant="link" className="p-0 ml-1 h-auto text-primary" onClick={() => navigate('/register')}>
                  Cadastre-se aqui
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            © 2026 {APP_NAME}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}