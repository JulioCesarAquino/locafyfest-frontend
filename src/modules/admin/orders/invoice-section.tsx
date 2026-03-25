import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText, Upload, Download, Loader2, CheckCircle2, Clock, RefreshCw, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getOrderInvoice, updateInvoice, uploadInvoicePdf, downloadInvoicePdf,
  type InvoiceAPI, type OrderAPI,
} from './services';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  order: OrderAPI;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  requested:  { label: 'Solicitada',  color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  processing: { label: 'Em emissão',  color: 'bg-blue-100 text-blue-800',    icon: RefreshCw },
  issued:     { label: 'Emitida',     color: 'bg-green-100 text-green-800',  icon: CheckCircle2 },
};

function formatAddress(a: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zip_code: string }) {
  return `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ''}, ${a.neighborhood}, ${a.city}/${a.state} — CEP ${a.zip_code}`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function AdminInvoiceSection({ order }: Props) {
  const [invoice, setInvoice] = useState<InvoiceAPI | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [status, setStatus] = useState<InvoiceAPI['status']>('requested');
  const [accessKey, setAccessKey] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Load invoice ──────────────────────────────────────────────────────────
  useEffect(() => {
    getOrderInvoice(order.id)
      .then((inv) => {
        setInvoice(inv);
        setStatus(inv.status);
        setAccessKey(inv.access_key ?? '');
        setAdminNotes(inv.admin_notes ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [order.id]);

  if (loading) return null;
  if (!invoice) return null;

  const client = order.client;
  const statusCfg = STATUS_CONFIG[invoice.status];
  const StatusIcon = statusCfg.icon;

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateInvoice(order.id, {
        status,
        access_key: accessKey || undefined,
        admin_notes: adminNotes || undefined,
      });
      setInvoice(updated);
      toast.success('Nota fiscal atualizada.');
    } catch {
      toast.error('Erro ao atualizar nota fiscal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const updated = await uploadInvoicePdf(order.id, selectedFile, {
        access_key: accessKey || undefined,
        admin_notes: adminNotes || undefined,
      });
      setInvoice(updated);
      setStatus(updated.status);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('PDF enviado e cliente notificado!');
    } catch {
      toast.error('Erro ao enviar PDF.');
    } finally {
      setUploading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="border-t pt-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <FileText size={15} />
          Nota Fiscal
        </h4>
        <Badge className={cn('text-xs', statusCfg.color)}>
          <StatusIcon size={12} className="mr-1" />
          {statusCfg.label}
        </Badge>
      </div>

      {/* Client fiscal data */}
      <div className="rounded-md bg-muted/40 p-3 space-y-1 text-sm">
        <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">Dados Fiscais do Cliente</p>
        {client && <p><span className="text-muted-foreground">Nome: </span>{client.name}</p>}
        {(invoice.cpf_override || (order.client as unknown as { cpf?: string })?.cpf) && (
          <p>
            <span className="text-muted-foreground">CPF: </span>
            {invoice.cpf_override ?? (order.client as unknown as { cpf?: string })?.cpf}
            {invoice.cpf_override && <span className="ml-1 text-xs text-yellow-600">(override)</span>}
          </p>
        )}
        {(invoice.cnpj_override || (order.client as unknown as { cnpj?: string })?.cnpj) && (
          <p>
            <span className="text-muted-foreground">CNPJ: </span>
            {invoice.cnpj_override ?? (order.client as unknown as { cnpj?: string })?.cnpj}
            {invoice.cnpj_override && <span className="ml-1 text-xs text-yellow-600">(override)</span>}
          </p>
        )}
        {(invoice.company_name_override || (order.client as unknown as { company_name?: string })?.company_name) && (
          <p>
            <span className="text-muted-foreground">Razão Social: </span>
            {invoice.company_name_override ?? (order.client as unknown as { company_name?: string })?.company_name}
          </p>
        )}
        {invoice.billing_address && (
          <p>
            <span className="text-muted-foreground">Endereço de Cobrança: </span>
            {formatAddress(invoice.billing_address)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Solicitada em {new Date(invoice.requested_at).toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Admin form */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as InvoiceAPI['status'])}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested">Solicitada</SelectItem>
                <SelectItem value="processing">Em emissão</SelectItem>
                <SelectItem value="issued">Emitida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Chave de Acesso NF (44 dígitos)</Label>
            <Input
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value.replace(/\D/g, '').slice(0, 44))}
              placeholder="00000000000000000000000000000000000000000000"
              className="h-8 text-xs font-mono"
            />
            <p className="text-xs text-muted-foreground">{accessKey.length}/44</p>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Observações internas</Label>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={2}
            placeholder="Notas sobre a emissão..."
            className="text-sm"
          />
        </div>

        {/* PDF upload */}
        <div className="space-y-2">
          <Label className="text-xs">Upload do PDF da Nota Fiscal</Label>

          {invoice.pdf_url ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md bg-green-500/10 border border-green-500/30 p-2 flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 size={14} />
                PDF já enviado
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(downloadInvoicePdf(order.id), '_blank')}
              >
                <Download size={14} className="mr-1" />
                Ver
              </Button>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} className="mr-1" />
              {selectedFile ? 'Trocar arquivo' : 'Selecionar PDF'}
            </Button>

            {selectedFile && (
              <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
                <span className="truncate text-muted-foreground">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
            Salvar
          </Button>

          {selectedFile && (
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading
                ? <Loader2 size={13} className="animate-spin mr-1" />
                : <Upload size={13} className="mr-1" />}
              Enviar PDF e Notificar Cliente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
