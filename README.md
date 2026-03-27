# LocafyFest Backend

API RESTful para plataforma de aluguel de produtos para festas e eventos.

---

## Autenticação

A API utiliza **JWT (JSON Web Tokens)**. O token deve ser enviado no header de todas as rotas protegidas:

```
Authorization: Bearer {token}
```

### Endpoints de autenticação

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/auth/register` | Cadastro de novo usuário |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/verify-email` | Verificação de e-mail |
| POST | `/api/v1/auth/forgot-password` | Solicitar recuperação de senha |
| POST | `/api/v1/auth/reset-password` | Redefinir senha |

---

## Endpoints

Base URL: `/api/v1`

### Públicos (sem autenticação)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/products` | Listar produtos |
| GET | `/products/featured` | Produtos em destaque |
| GET | `/products/popular` | Produtos mais populares |
| GET | `/products/{id}` | Detalhe do produto |
| GET | `/categories` | Listar categorias |
| GET | `/addresses/search-cep/{cep}` | Buscar endereço por CEP |
| GET | `/settings/public` | Configurações públicas |
| GET | `/health` | Status da API |

### Produtos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/products` | Listar produtos |
| GET | `/products/{id}` | Detalhe do produto |
| GET | `/products/{id}/check-availability` | Verificar disponibilidade |
| POST | `/products/{id}/favorites` | Favoritar produto |
| DELETE | `/products/{id}/favorites` | Desfavoritar produto |

### Pedidos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/orders` | Listar pedidos |
| POST | `/orders` | Criar pedido |
| GET | `/orders/{id}` | Detalhe do pedido |
| POST | `/orders/calculate-delivery-fee` | Calcular frete |
| POST | `/orders/{id}/confirm` | Confirmar pedido |
| POST | `/orders/{id}/cancel` | Cancelar pedido |
| POST | `/orders/{id}/process-payment` | Processar pagamento |
| GET | `/orders/my-orders` | Meus pedidos |

### Endereços

| Método | Rota | Descrição |
|---|---|---|
| GET | `/addresses` | Listar endereços |
| POST | `/addresses` | Adicionar endereço |
| PUT | `/addresses/{id}` | Atualizar endereço |
| DELETE | `/addresses/{id}` | Remover endereço |
| GET | `/addresses/my-addresses` | Meus endereços |
| POST | `/addresses/{id}/set-default` | Definir endereço padrão |

### Favoritos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/favorites/my-favorites` | Meus favoritos |
| DELETE | `/favorites/{id}` | Remover favorito |

### Avaliações

| Método | Rota | Descrição |
|---|---|---|
| GET | `/reviews` | Listar avaliações |
| POST | `/reviews` | Criar avaliação |
| GET | `/reviews/my-reviews` | Minhas avaliações |

### Notificações

| Método | Rota | Descrição |
|---|---|---|
| GET | `/notifications` | Listar notificações |
| GET | `/notifications/unread` | Não lidas |
| POST | `/notifications/{id}/read` | Marcar como lida |
| POST | `/notifications/mark-all-read` | Marcar todas como lidas |

### Cupons

| Método | Rota | Descrição |
|---|---|---|
| POST | `/coupons/validate` | Validar cupom |

---

## Perfil do usuário

| Método | Rota | Descrição |
|---|---|---|
| GET | `/users/{id}` | Dados do usuário |
| PUT | `/users/{id}` | Atualizar dados |

---

## Papéis de acesso

| Papel | Descrição |
|---|---|
| `client` | Usuário final da plataforma |
| `admin` | Administrador |
| `super_admin` | Acesso total |
