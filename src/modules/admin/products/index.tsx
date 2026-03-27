import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Upload,
  Edit2,
  Trash2,
  Package,
  Loader2,
  ImageOff,
  Link2,
  Image,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { storageUrl, formatPrice } from '@/lib/utils';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductAPI,
  type ProductForm,
  type FormVariation,
  type FormComponent,
} from './services';

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: 0,
  quantity_available: 0,
  is_combo: false,
  is_available: true,
  requires_assembly: false,
  variations: [],
  components: [],
};

function primaryImageUrl(product: ProductAPI): string {
  const images = product.images ?? [];
  const img = images.find((i) => i.is_primary) ?? images[0];
  return img ? storageUrl(img.image_path) : '';
}

export default function Products() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductAPI | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await getProducts({ include_unavailable: true });
      const list: ProductAPI[] = res.data?.data ?? res.data ?? [];
      setProducts(list);
    } catch (err: unknown) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao carregar produtos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // ─── Form helpers ────────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setSelectedImage(null);
    setImagePreview('');
    setShowForm(true);
  };

  const openEditForm = async (product: ProductAPI) => {
    setEditingProduct(product);
    setSelectedImage(null);
    setImagePreview(primaryImageUrl(product));
    setShowForm(true);

    // Busca produto completo para carregar componentes e variações
    try {
      const res = await getProductById(product.id);
      const full: ProductAPI = res.data?.product ?? res.data ?? product;
      setEditingProduct(full);
      setForm({
        name: full.name,
        description: full.description,
        price: parseFloat(full.price),
        quantity_available: full.quantity_available,
        is_combo: full.is_combo,
        is_available: full.is_available,
        requires_assembly: full.requires_assembly ?? false,
        variations: (full.variations ?? []).map((v) => ({
          id: v.id,
          nome: v.name,
          preco: parseFloat(v.price_modifier),
          quantidade: v.quantity_available,
        })),
        components: (full.components ?? []).map((c) => ({
          product_id: c.component_product_id,
          quantity: c.quantity,
          is_selectable_by_customer: c.is_selectable_by_customer ?? false,
        })),
      });
      setImagePreview(primaryImageUrl(full));
    } catch {
      // fallback: usa o que já tinha no card
      setForm({
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        quantity_available: product.quantity_available,
        is_combo: product.is_combo,
        is_available: product.is_available,
        requires_assembly: product.requires_assembly ?? false,
        variations: (product.variations ?? []).map((v) => ({
          id: v.id,
          nome: v.name,
          preco: parseFloat(v.price_modifier),
          quantidade: v.quantity_available,
        })),
        components: (product.components ?? []).map((c) => ({
          product_id: c.component_product_id,
          quantity: c.quantity,
          is_selectable_by_customer: c.is_selectable_by_customer ?? false,
        })),
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const addVariation = () => {
    setForm((prev) => ({
      ...prev,
      variations: [...prev.variations, { nome: '', preco: 0, quantidade: 0 }],
    }));
  };

  const updateVariation = (index: number, field: keyof FormVariation, value: string | number | File | null) => {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.map((v, i) =>
        i === index ? { ...v, [field]: value } : v,
      ),
    }));
  };

  const removeVariation = (index: number) => {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index),
    }));
  };

  const addComponent = () => {
    setForm((prev) => ({
      ...prev,
      components: [...prev.components, { product_id: 0, quantity: 1, is_selectable_by_customer: false }],
    }));
  };

  const updateComponent = (index: number, field: keyof FormComponent, value: number) => {
    setForm((prev) => ({
      ...prev,
      components: prev.components.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    }));
  };

  const removeComponent = (index: number) => {
    setForm((prev) => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };

  // ─── Submit / Delete ─────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) {
      toast({ title: 'Erro', description: 'Nome e descrição são obrigatórios', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, form, selectedImage);
        toast({ title: 'Sucesso', description: 'Produto atualizado com sucesso!' });
      } else {
        await createProduct(form, selectedImage);
        toast({ title: 'Sucesso', description: 'Produto cadastrado com sucesso!' });
      }
      setShowForm(false);
      await loadProducts();
    } catch (err: unknown) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao salvar produto',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct(deleteId);
      toast({ title: 'Sucesso', description: 'Produto excluído com sucesso!' });
      setDeleteId(null);
      await loadProducts();
    } catch (err: unknown) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao excluir produto',
        variant: 'destructive',
      });
    }
  };

  // Products that can be selected as combo components (all except the one being edited)
  const availableForComponent = products.filter((p) => p.id !== editingProduct?.id && !p.is_combo);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <AppLayout userType="admin">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">Produtos</h1>
            <p className="text-muted-foreground mt-1">Gerencie o catálogo de produtos para locação</p>
          </div>
          <Button onClick={openCreateForm} className="shadow-primary">
            <Plus size={20} className="mr-2" />
            Novo Produto
          </Button>
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : products.length === 0 ? (
          <Card className="bg-gradient-surface border-border/50">
            <CardContent className="py-12 text-center">
              <Package size={64} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum produto cadastrado</h3>
              <p className="text-muted-foreground mb-4">Cadastre seu primeiro produto para locação</p>
              <Button onClick={openCreateForm} className="shadow-primary">
                <Plus size={20} className="mr-2" />
                Cadastrar Produto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const imgUrl = primaryImageUrl(product);
              return (
                <Card
                  key={product.id}
                  className="bg-gradient-surface border-border/50 hover:shadow-primary transition-all duration-300 flex flex-col"
                >
                  <div className="aspect-video bg-muted rounded-t-xl overflow-hidden flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={40} className="text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
                      <div className="flex flex-col gap-1 shrink-0">
                        {product.is_combo && (
                          <Badge variant="secondary" className="text-xs">
                            <Link2 size={10} className="mr-1" />
                            Combo
                          </Badge>
                        )}
                        {!product.is_available && (
                          <Badge variant="destructive" className="text-xs">Inativo</Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{product.description}</p>

                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Preço</span>
                        <span className="font-medium">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Estoque</span>
                        <span className="font-medium">{product.quantity_available} un.</span>
                      </div>

                      {(product.variations ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(product.variations ?? []).slice(0, 3).map((v) => (
                            <Badge key={v.id} variant="outline" className="text-xs">
                              {v.name} — {formatPrice(v.price_modifier)}
                            </Badge>
                          ))}
                          {(product.variations ?? []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(product.variations ?? []).length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEditForm(product)}
                        >
                          <Edit2 size={14} className="mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(product.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Create / Edit Dialog ─── */}
      <Dialog open={showForm} onOpenChange={(open) => !submitting && setShowForm(open)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package size={20} className="text-primary" />
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Mesa redonda"
                  required
                />
              </div>

              {/* Image upload */}
              <div className="space-y-2">
                <Label>Foto do Produto</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} className="mr-2" />
                    {selectedImage ? 'Trocar' : imagePreview ? 'Alterar' : 'Selecionar'}
                  </Button>
                  {imagePreview && (
                    <div className="w-14 h-14 rounded-lg overflow-hidden border bg-muted shrink-0">
                      <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                {selectedImage && (
                  <p className="text-xs text-muted-foreground">{selectedImage.name}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Descrição detalhada do produto..."
                rows={3}
                required
              />
            </div>

            {/* Price + Quantity + Availability */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço base (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Estoque base</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  value={form.quantity_available}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, quantity_available: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Disponível</Label>
                <div className="flex items-center h-10">
                  <Switch
                    checked={form.is_available}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, is_available: v }))}
                  />
                </div>
              </div>
            </div>

            {/* Combo toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-surface/30">
              <Switch
                id="is_combo"
                checked={form.is_combo}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_combo: v, components: [] }))}
              />
              <div>
                <Label htmlFor="is_combo" className="cursor-pointer font-medium">
                  Produto Combo
                </Label>
                <p className="text-xs text-muted-foreground">
                  Agrupa outros produtos e desconta do estoque de cada componente ao ser locado
                </p>
              </div>
            </div>

            {/* Assembly toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-surface/30">
              <Switch
                id="requires_assembly"
                checked={form.requires_assembly}
                onCheckedChange={(v) => setForm((p) => ({ ...p, requires_assembly: v }))}
              />
              <div>
                <Label htmlFor="requires_assembly" className="cursor-pointer font-medium">
                  Requer Montagem
                </Label>
                <p className="text-xs text-muted-foreground">
                  A taxa de montagem será adicionada automaticamente ao pedido
                </p>
              </div>
            </div>

            {/* Combo components */}
            {form.is_combo && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Componentes do Combo</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                    <Plus size={14} className="mr-1" />
                    Adicionar
                  </Button>
                </div>
                {form.components.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum componente adicionado.</p>
                )}
                {form.components.map((comp, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border border-border/40 bg-surface/20">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Select
                          value={comp.product_id > 0 ? String(comp.product_id) : ''}
                          onValueChange={(v) => updateComponent(idx, 'product_id', parseInt(v))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecionar produto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableForComponent.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name} (estoque: {p.quantity_available})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qtd"
                          value={comp.quantity}
                          onChange={(e) =>
                            updateComponent(idx, 'quantity', parseInt(e.target.value) || 1)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() => removeComponent(idx)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                    {/* Toggle selecionável pelo cliente */}
                    <div className="flex items-center gap-2 pl-1">
                      <Switch
                        checked={comp.is_selectable_by_customer}
                        onCheckedChange={(v) =>
                          setForm((prev) => ({
                            ...prev,
                            components: prev.components.map((c, i) =>
                              i === idx ? { ...c, is_selectable_by_customer: v } : c,
                            ),
                          }))
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Cliente escolhe a variação (ex: tecido, estampa)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Variations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Variações</Label>
                  <p className="text-xs text-muted-foreground">
                    Opcional — cada variação tem preço e estoque próprios
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariation}>
                  <Plus size={14} className="mr-1" />
                  Adicionar
                </Button>
              </div>
              {form.variations.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma variação adicionada.</p>
              )}
              {form.variations.map((v, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_100px_80px_40px] gap-3 items-end p-3 rounded-lg border border-border/40 bg-surface/20"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={v.nome}
                      onChange={(e) => updateVariation(idx, 'nome', e.target.value)}
                      placeholder="Ex: Floral Rosa, Listrado Azul..."
                    />
                    {/* Imagem da variação */}
                    <div className="flex items-center gap-2 pt-1">
                      <label className="cursor-pointer flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                        <Image size={12} />
                        {v.imageFile ? v.imageFile.name : v.image_path ? 'Alterar foto' : 'Adicionar foto'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            updateVariation(idx, 'imageFile', file);
                          }}
                        />
                      </label>
                      {(v.imageFile || v.image_path) && (
                        <img
                          src={v.imageFile ? URL.createObjectURL(v.imageFile) : storageUrl(v.image_path!)}
                          alt="preview"
                          className="w-8 h-8 rounded object-cover border"
                        />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Preço (R$)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={v.preco}
                      onChange={(e) => updateVariation(idx, 'preco', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Estoque</Label>
                    <Input
                      type="number"
                      min="0"
                      value={v.quantidade}
                      onChange={(e) =>
                        updateVariation(idx, 'quantidade', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeVariation(idx)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="shadow-primary" disabled={submitting}>
                {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
                {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirmation ─── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O produto será permanentemente removido do catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
