import { useState } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Edit2, Trash2, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ProductVariation {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface Product {
  id: string;
  nome: string;
  descricao: string;
  foto: string;
  variacoes: ProductVariation[];
}

export default function Products() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    foto: '',
    variacoes: [{ nome: '', preco: 0, quantidade: 0 }]
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVariationChange = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      variacoes: prev.variacoes.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const addVariation = () => {
    setFormData(prev => ({
      ...prev,
      variacoes: [...prev.variacoes, { nome: '', preco: 0, quantidade: 0 }]
    }));
  };

  const removeVariation = (index: number) => {
    if (formData.variacoes.length > 1) {
      setFormData(prev => ({
        ...prev,
        variacoes: prev.variacoes.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.nome || !formData.descricao) {
      toast({
        title: "Erro",
        description: "Nome e descrição são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    const newProduct: Product = {
      id: Date.now().toString(),
      nome: formData.nome,
      descricao: formData.descricao,
      foto: formData.foto || '/placeholder.svg',
      variacoes: formData.variacoes.map((v, i) => ({
        ...v,
        id: `${Date.now()}-${i}`
      }))
    };

    setProducts(prev => [...prev, newProduct]);
    setFormData({
      nome: '',
      descricao: '',
      foto: '',
      variacoes: [{ nome: '', preco: 0, quantidade: 0 }]
    });
    setShowForm(false);

    toast({
      title: "Sucesso",
      description: "Produto cadastrado com sucesso!"
    });
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      foto: '',
      variacoes: [{ nome: '', preco: 0, quantidade: 0 }]
    });
    setShowForm(false);
  };

  return (
    <AppLayout userType="admin" userName="Administrador">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">Produtos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o catálogo de produtos para locação
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="shadow-primary"
          >
            <Plus size={20} className="mr-2" />
            Novo Produto
          </Button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <Card className="bg-gradient-surface border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package size={24} className="mr-2 text-primary" />
                Cadastrar Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados básicos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Produto *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      placeholder="Ex: Mesa redonda"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="foto">URL da Foto</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="foto"
                        value={formData.foto}
                        onChange={(e) => handleInputChange('foto', e.target.value)}
                        placeholder="https://exemplo.com/foto.jpg"
                      />
                      <Button type="button" variant="outline" size="icon">
                        <Upload size={16} />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => handleInputChange('descricao', e.target.value)}
                    placeholder="Descrição detalhada do produto..."
                    rows={3}
                    required
                  />
                </div>

                {/* Variações */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Variações do Produto</h3>
                    <Button type="button" variant="outline" onClick={addVariation}>
                      <Plus size={16} className="mr-2" />
                      Adicionar Variação
                    </Button>
                  </div>

                  {formData.variacoes.map((variacao, index) => (
                    <Card key={index} className="bg-surface/50">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Nome da Variação</Label>
                            <Input
                              value={variacao.nome}
                              onChange={(e) => handleVariationChange(index, 'nome', e.target.value)}
                              placeholder="Ex: Pequena, Azul..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Preço (R$)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={variacao.preco}
                              onChange={(e) => handleVariationChange(index, 'preco', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                              type="number"
                              min="0"
                              value={variacao.quantidade}
                              onChange={(e) => handleVariationChange(index, 'quantidade', parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeVariation(index)}
                              disabled={formData.variacoes.length === 1}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="shadow-primary">
                    Cadastrar Produto
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {products.map((product) => (
              <Card key={product.id} className="bg-gradient-surface border-border/50 hover:shadow-primary transition-all duration-300">
                <CardContent className="p-4">
                  <div className="aspect-video bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {product.foto ? (
                      <img
                        src={product.foto}
                        alt={product.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={48} className="text-muted-foreground" />
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">{product.nome}</h3>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {product.descricao}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <span className="text-sm font-medium">Variações:</span>
                    <div className="flex flex-wrap gap-1">
                      {product.variacoes.map((variacao) => (
                        <Badge key={variacao.id} variant="secondary" className="text-xs">
                          {variacao.nome} - R$ {variacao.preco.toFixed(2)} ({variacao.quantidade})
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit2 size={14} className="mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 size={14} className="mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          !showForm && (
            <Card className="bg-gradient-surface border-border/50">
              <CardContent className="py-12 text-center">
                <Package size={64} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum produto cadastrado</h3>
                <p className="text-muted-foreground mb-4">
                  Comece cadastrando seu primeiro produto para locação
                </p>
                <Button onClick={() => setShowForm(true)} className="shadow-primary">
                  <Plus size={20} className="mr-2" />
                  Cadastrar Primeiro Produto
                </Button>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </AppLayout>
  );
}