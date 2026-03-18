import { useState, useEffect, useRef } from 'react';
import { Package, Sparkles, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME, APP_SUBTITLE } from "@/config/app";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/services/apiClient';

const PASSWORD_RULES = [
  { key: 'length',  label: 'Mínimo 8 caracteres',          test: (p: string) => p.length >= 8 },
  { key: 'upper',   label: 'Uma letra maiúscula (A-Z)',     test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'Uma letra minúscula (a-z)',     test: (p: string) => /[a-z]/.test(p) },
  { key: 'number',  label: 'Um número (0-9)',               test: (p: string) => /\d/.test(p) },
  { key: 'special', label: 'Um caractere especial (!@#$%)', test: (p: string) => /[!@#$%^&*()_+\-={}[\];':"\\|,.<>?]/.test(p) },
];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => { if (wasDark) root.classList.add('dark'); };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setStep(2);
      setCooldown(60);
    } catch {
      setError('Não foi possível enviar o código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setCooldown(60);
      setError('');
    } catch {
      setError('Não foi possível reenviar.');
    }
  };

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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) { setError('Digite todos os 6 dígitos.'); return; }
    if (!PASSWORD_RULES.every(r => r.test(password))) { setError('A senha não atende todos os critérios.'); return; }
    if (password !== passwordConfirmation) { setError('As senhas não conferem.'); return; }

    setIsLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/reset-password', {
        email,
        code,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      type ApiError = { response?: { data?: { message?: string } } };
      setError((err as ApiError).response?.data?.message ?? 'Código inválido ou expirado.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-primary">
              <Package className="w-8 h-8 text-white" />
            </div>
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">{APP_NAME}</h1>
          <p className="text-muted-foreground">{APP_SUBTITLE}</p>
        </div>

        <Card className="bg-white/90 backdrop-blur-xl border-border/50 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">
              {step === 1 ? 'Esqueci minha senha' : 'Redefinir senha'}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? 'Informe seu e-mail para receber o código de redefinição'
                : `Digite o código enviado para ${email} e sua nova senha`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
                <div>
                  <p className="text-lg font-semibold text-green-700">Senha redefinida!</p>
                  <p className="text-sm text-muted-foreground mt-1">Redirecionando para o login...</p>
                </div>
              </div>
            ) : step === 1 ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    required
                    className="h-11"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full h-11 btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </div>
                  ) : 'Enviar código'}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => navigate('/login')} className="text-sm text-primary hover:underline">
                    Voltar ao login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
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
                      className="w-11 h-14 text-center text-xl font-bold border-2 rounded-lg outline-none transition-colors focus:border-primary bg-white text-foreground border-border"
                    />
                  ))}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Não recebeu?{' '}
                  <button type="button" onClick={handleResend} disabled={cooldown > 0} className="text-primary hover:underline disabled:opacity-50 font-medium">
                    {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
                  </button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      required
                      className="h-11 pr-10"
                    />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {password.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                      {PASSWORD_RULES.map(rule => {
                        const ok = rule.test(password);
                        return (
                          <span key={rule.key} className={`flex items-center gap-1 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
                            <CheckCircle2 className={`h-3 w-3 shrink-0 ${ok ? 'text-green-500' : 'text-gray-300'}`} />
                            {rule.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_confirmation">Confirmar nova senha</Label>
                  <div className="relative">
                    <Input
                      id="password_confirmation"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={passwordConfirmation}
                      onChange={e => { setPasswordConfirmation(e.target.value); setError(''); }}
                      required
                      className="h-11 pr-10"
                    />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full h-11 btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Redefinindo...</span>
                    </div>
                  ) : 'Redefinir senha'}
                </Button>
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
