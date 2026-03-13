import { useState, useEffect } from 'react';
import { Eye, EyeOff, Package, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '@/services/apiClient';

// --- Máscaras ---
function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

// --- Validadores ---
function validateCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  const v1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (11 - i);
  sum += v1 * 2;
  const v2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return v1 === parseInt(d[9]) && v2 === parseInt(d[10]);
}

function validateCnpj(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (digits: string, weights: number[]) => {
    const sum = digits.split('').reduce((acc, n, i) => acc + parseInt(n) * weights[i], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };
  const v1 = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const v2 = calc(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return v1 === parseInt(d[12]) && v2 === parseInt(d[13]);
}

const PASSWORD_RULES = [
  { key: 'length',  label: 'Mínimo 8 caracteres',          test: (p: string) => p.length >= 8 },
  { key: 'upper',   label: 'Uma letra maiúscula (A-Z)',     test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'Uma letra minúscula (a-z)',     test: (p: string) => /[a-z]/.test(p) },
  { key: 'number',  label: 'Um número (0-9)',               test: (p: string) => /\d/.test(p) },
  { key: 'special', label: 'Um caractere especial (!@#$%)', test: (p: string) => /[!@#$%^&*()_+\-={}[\];':"\\|,.<>?]/.test(p) },
];

function validatePassword(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateName(name: string): boolean {
  return name.trim().length >= 3 && /^[a-zA-ZÀ-ÿ\s]+$/.test(name);
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

export default function Register() {
  const [personType, setPersonType] = useState<'pf' | 'pj'>('pf');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => { if (wasDark) root.classList.add('dark'); };
  }, []);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    cnpj: '',
    company_name: '',
    password: '',
    password_confirmation: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let masked = value;
    if (name === 'phone') masked = maskPhone(value);
    if (name === 'cpf')   masked = maskCpf(value);
    if (name === 'cnpj')  masked = maskCnpj(value);
    setForm((prev) => ({ ...prev, [name]: masked }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePersonTypeChange = (type: 'pf' | 'pj') => {
    setPersonType(type);
    setForm((prev) => ({ ...prev, cpf: '', cnpj: '', company_name: '' }));
    setFieldErrors({});
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!validateName(form.name))
      errors.name = 'Nome deve ter ao menos 3 letras e conter apenas letras.';

    if (!validateEmail(form.email))
      errors.email = 'Informe um e-mail válido.';

    if (form.phone && !validatePhone(form.phone))
      errors.phone = 'Telefone inválido.';

    if (personType === 'pf') {
      if (form.cpf && !validateCpf(form.cpf))
        errors.cpf = 'CPF inválido.';
    } else {
      if (!form.cnpj)
        errors.cnpj = 'CNPJ é obrigatório para Pessoa Jurídica.';
      else if (!validateCnpj(form.cnpj))
        errors.cnpj = 'CNPJ inválido.';

      if (!form.company_name.trim())
        errors.company_name = 'Razão social é obrigatória para Pessoa Jurídica.';
    }

    if (!validatePassword(form.password))
      errors.password = 'A senha não atende todos os critérios.';

    if (form.password !== form.password_confirmation)
      errors.password_confirmation = 'As senhas não conferem.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      await apiClient.post('/auth/register', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        password_confirmation: form.password_confirmation,
        person_type: personType,
        user_type: 'client',
        ...(personType === 'pf' ? { cpf: form.cpf } : { cnpj: form.cnpj, company_name: form.company_name }),
      });
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err: unknown) {
      type ApiError = { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const { response } = err as ApiError;
      const apiErrors = response?.data?.errors ?? {};

      if (Object.keys(apiErrors).length > 0) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(apiErrors)) {
          mapped[field] = messages[0];
        }
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
      } else {
        setError(
          response?.data?.message ||
          'Erro ao criar conta. Verifique os dados e tente novamente.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-primary">
              <Package className="w-8 h-8 text-white" />
            </div>
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">Festa System</h1>
          <p className="text-muted-foreground">Sistema de Locação para Eventos e Festas</p>
        </div>

        <Card className="bg-white/90 backdrop-blur-xl border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Criar conta</CardTitle>
            <CardDescription className="text-center">
              Preencha os dados abaixo para se cadastrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Toggle PF / PJ */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => handlePersonTypeChange('pf')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    personType === 'pf'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Pessoa Física
                </button>
                <button
                  type="button"
                  onClick={() => handlePersonTypeChange('pj')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    personType === 'pj'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Pessoa Jurídica
                </button>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">{personType === 'pj' ? 'Nome do responsável' : 'Nome completo'}</Label>
                <Input
                  id="name" name="name"
                  placeholder="Seu nome completo"
                  value={form.name} onChange={handleChange} required
                  className={`h-11 ${fieldErrors.name ? 'border-red-400' : ''}`}
                />
                {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
              </div>

              {/* Razão Social — só PJ */}
              {personType === 'pj' && (
                <div className="space-y-2">
                  <Label htmlFor="company_name">Razão social</Label>
                  <Input
                    id="company_name" name="company_name"
                    placeholder="Nome da empresa"
                    value={form.company_name} onChange={handleChange}
                    className={`h-11 ${fieldErrors.company_name ? 'border-red-400' : ''}`}
                  />
                  {fieldErrors.company_name && <p className="text-xs text-red-500">{fieldErrors.company_name}</p>}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email" name="email" type="email"
                  placeholder="seu@email.com"
                  value={form.email} onChange={handleChange} required
                  className={`h-11 ${fieldErrors.email ? 'border-red-400' : ''}`}
                />
                {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
              </div>

              {/* Telefone + CPF/CNPJ */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone" name="phone"
                    placeholder="(11) 99999-9999"
                    value={form.phone} onChange={handleChange}
                    className={`h-11 ${fieldErrors.phone ? 'border-red-400' : ''}`}
                  />
                  {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
                </div>

                {personType === 'pf' ? (
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf" name="cpf"
                      placeholder="000.000.000-00"
                      value={form.cpf} onChange={handleChange}
                      className={`h-11 ${fieldErrors.cpf ? 'border-red-400' : ''}`}
                    />
                    {fieldErrors.cpf && <p className="text-xs text-red-500">{fieldErrors.cpf}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj" name="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={form.cnpj} onChange={handleChange}
                      className={`h-11 ${fieldErrors.cnpj ? 'border-red-400' : ''}`}
                    />
                    {fieldErrors.cnpj && <p className="text-xs text-red-500">{fieldErrors.cnpj}</p>}
                  </div>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={form.password} onChange={handleChange} required
                    className={`h-11 pr-10 ${fieldErrors.password ? 'border-red-400' : ''}`}
                  />
                  <Button
                    type="button" variant="ghost" size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
                {form.password.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                    {PASSWORD_RULES.map((rule) => {
                      const ok = rule.test(form.password);
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

              {/* Confirmar senha */}
              <div className="space-y-2">
                <Label htmlFor="password_confirmation">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="password_confirmation" name="password_confirmation"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    value={form.password_confirmation} onChange={handleChange} required
                    className={`h-11 pr-10 ${fieldErrors.password_confirmation ? 'border-red-400' : ''}`}
                  />
                  <Button
                    type="button" variant="ghost" size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {fieldErrors.password_confirmation && (
                  <p className="text-xs text-red-500">{fieldErrors.password_confirmation}</p>
                )}
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
                    <span>Criando conta...</span>
                  </div>
                ) : 'Criar conta'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Já tem uma conta?
                  <Button variant="link" className="p-0 ml-1 h-auto text-primary" onClick={() => navigate('/login')}>
                    Faça login
                  </Button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            © 2026 Festa System. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
