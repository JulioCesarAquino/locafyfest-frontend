import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Mail, Link2 } from 'lucide-react';
import { AbceLogo } from '@/components/AbceLogo';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_NAME, APP_SUBTITLE } from "@/config/app";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/services/apiClient';

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  const masked = user.slice(0, 2) + '***' + user.slice(-1);
  return `${masked}@${domain}`;
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  type LocationState = { email?: string; password?: string; pending_link?: boolean };
  const state = location.state as LocationState | null;
  const email: string = state?.email ?? '';
  const password: string = state?.password ?? '';
  const pendingLink: boolean = state?.pending_link ?? false;

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) { setError('Digite todos os 6 dígitos.'); return; }

    setIsLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/verify-email', { email, code });
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { verified: true, email, password } }), 2000);
    } catch (err: unknown) {
      type ApiError = { response?: { data?: { message?: string } } };
      const message = (err as ApiError).response?.data?.message ?? 'Código inválido ou expirado.';
      setError(message);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    try {
      await apiClient.post('/auth/resend-verification', { email });
      setCooldown(60);
      setError('');
    } catch {
      setError('Não foi possível reenviar o código.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-1">
            <AbceLogo height={110} />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary mb-1">{APP_NAME}</h1>
          <p className="text-muted-foreground">{APP_SUBTITLE}</p>
        </div>

        <Card className="backdrop-blur-xl border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Verifique seu e-mail</CardTitle>
            <CardDescription>
              Enviamos um código de 6 dígitos para<br />
              <span className="font-medium text-foreground">{maskEmail(email)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
                <div>
                  <p className="text-lg font-semibold text-green-700">E-mail verificado!</p>
                  <p className="text-sm text-muted-foreground mt-1">Redirecionando para o login...</p>
                </div>
                {pendingLink && (
                  <div className="w-full rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 flex items-start gap-2 text-left">
                    <Link2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Identificamos um possível cadastro anterior com seus dados.
                      Um administrador irá verificar e, se confirmado, seus históricos serão unificados.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div onPaste={handlePaste} className="flex justify-center gap-2">
                  {digits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleDigit(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className="w-11 h-14 text-center text-xl font-bold border-2 rounded-lg outline-none transition-colors focus:border-primary bg-background text-foreground border-border"
                    />
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 btn-primary" disabled={isLoading || digits.join('').length < 6}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verificando...</span>
                    </div>
                  ) : 'Verificar e-mail'}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Não recebeu o código?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || isResending}
                    className="text-primary hover:underline disabled:opacity-50 disabled:no-underline font-medium"
                  >
                    {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">© 2026 {APP_NAME}. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
