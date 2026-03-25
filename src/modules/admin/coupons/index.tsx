import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/Layout/AppLayout';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCoupon,
  CouponAPI,
  CreateCouponPayload,
  UpdateCouponPayload,
} from './services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Tag, Percent, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

// ─── Form state ───────────────────────────────────────────────────────────────

interface CouponForm {
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  usage_limit: string;
  active: boolean;
  expires_at: string;
  description: string;
}

const emptyForm = (): CouponForm => ({
  code: '',
  type: 'fixed',
  value: '',
  usage_limit: '',
  active: true,
  expires_at: '',
  description: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponAPI | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<CouponAPI | null>(null);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons', search],
    queryFn: () => getCoupons(search ? { search } : undefined),
  });

  const createMut = useMutation({
    mutationFn: createCoupon,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast({ title: 'Cupom criado com sucesso' });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCouponPayload }) => updateCoupon(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast({ title: 'Cupom atualizado com sucesso' });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast({ title: 'Cupom excluído' });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const toggleMut = useMutation({
    mutationFn: toggleCoupon,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
    onError: (err: Error) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  function openCreate() {
    setEditingCoupon(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(coupon: CouponAPI) {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      usage_limit: coupon.usage_limit?.toString() ?? '',
      active: coupon.active,
      expires_at: coupon.expires_at ? coupon.expires_at.substring(0, 10) : '',
      description: coupon.description ?? '',
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingCoupon(null);
    setForm(emptyForm());
  }

  function handleSubmit() {
    const payload: CreateCouponPayload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: parseFloat(form.value),
      usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
      active: form.active,
      expires_at: form.expires_at || null,
      description: form.description || null,
    };

    if (!payload.code || !payload.value) {
      toast({ title: 'Erro', description: 'Preencha código e valor', variant: 'destructive' });
      return;
    }

    if (editingCoupon) {
      updateMut.mutate({ id: editingCoupon.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const isMutating = createMut.isPending || updateMut.isPending;

  return (
    <AppLayout userType="admin">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Cupons de Desconto</h1>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Buscar por código ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Expiração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum cupom encontrado
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {coupon.type === 'percentage' ? (
                        <><Percent className="h-3 w-3" /> Percentual</>
                      ) : (
                        <><DollarSign className="h-3 w-3" /> Fixo</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {coupon.type === 'percentage'
                      ? `${parseFloat(coupon.value)}`
                      : formatCurrency(parseFloat(coupon.value))}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {coupon.used_count}
                      {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' / ∞'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {coupon.expires_at
                      ? new Date(coupon.expires_at).toLocaleDateString('pt-BR')
                      : <span className="text-muted-foreground text-sm">Sem expiração</span>}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={coupon.active}
                      onCheckedChange={() => toggleMut.mutate(coupon.id)}
                      disabled={toggleMut.isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(coupon)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(coupon)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Code */}
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input
                placeholder="EX: PROMO10"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </div>

            {/* Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={form.type === 'fixed' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setForm({ ...form, type: 'fixed' })}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant={form.type === 'percentage' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setForm({ ...form, type: 'percentage' })}
                  >
                    <Percent className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={form.type === 'percentage' ? '10' : '20.00'}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
            </div>

            {/* Usage limit */}
            <div className="space-y-1.5">
              <Label>Limite de uso <span className="text-muted-foreground text-xs">(vazio = ilimitado)</span></Label>
              <Input
                type="number"
                min="1"
                placeholder="100"
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
              />
            </div>

            {/* Expires at */}
            <div className="space-y-1.5">
              <Label>Data de expiração <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                placeholder="Campanha de Páscoa..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
                id="coupon-active"
              />
              <Label htmlFor="coupon-active">Cupom ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isMutating}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating ? 'Salvando...' : editingCoupon ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir cupom</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o cupom{' '}
            <span className="font-mono font-medium text-foreground">{deleteConfirm?.code}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleteMut.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AppLayout>
  );
}
