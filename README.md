# LocaFyFest — Frontend

Sistema web de gerenciamento de locação para festas e eventos. Oferece uma interface administrativa completa para gestão de produtos, clientes e pedidos, além de uma interface de catálogo para clientes realizarem pedidos.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Roteamento | React Router DOM 6 |
| Estado servidor | TanStack React Query 5 |
| HTTP | Axios (com interceptors JWT) |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| Notificações | Sonner |
| Temas | next-themes (light/dark/system) |

---

## Pré-requisitos

- Node.js >= 18
- npm

---

## Instalação e execução

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (localhost:8080)
npm run dev

# Build para produção
npm run build

# Pré-visualizar build de produção
npm run preview

# Lint
npm run lint
```

---

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_STORAGE_URL=http://localhost:8000/storage
VITE_APP_NAME=LocaFyFest
VITE_APP_SUBTITLE=Festas e Eventos
```

---

## Estrutura do projeto

```
src/
├── App.tsx                  # Roteamento principal e providers
├── main.tsx                 # Entry point
│
├── components/
│   ├── Layout/              # Layouts de admin e cliente
│   ├── ProtectedRoute.tsx   # Proteção de rotas por role/permissão
│   └── ui/                  # Componentes shadcn/ui
│
├── modules/
│   ├── auth/                # Login, cadastro, verificação, recuperação de senha
│   ├── admin/               # Dashboard, produtos, clientes, pedidos, cupons, relatórios
│   └── client/              # Catálogo, carrinho, pedidos, favoritos, perfil
│
├── contexts/
│   ├── AuthContext.tsx       # Estado de autenticação e JWT
│   ├── CartContext.tsx       # Carrinho persistido no localStorage
│   └── ThemeContext.tsx      # Tema light/dark/system
│
├── services/
│   ├── apiClient.ts          # Instância Axios com refresh automático de token
│   └── authService.ts        # Funções de login/logout
│
├── config/
│   └── app.ts                # Configurações globais da aplicação
│
└── lib/
    └── utils.ts              # Utilitários (formatação de moeda, URL de storage, resize de imagem)
```

---

## Autenticação

Baseada em JWT com persistência no `localStorage`. O fluxo é:

1. Usuário faz login → `POST /auth/login`
2. Token armazenado no `localStorage`
3. `POST /auth/me` retorna dados do usuário e permissões
4. Interceptor do Axios injeta `Bearer {token}` em todas as requisições
5. Em caso de `401`, o token é renovado automaticamente via `POST /auth/refresh`

### Tipos de usuário

| Tipo | Acesso |
|---|---|
| `super_admin` | Acesso completo |
| `admin` | Acesso com permissões restritas |
| `client` | Apenas área do cliente |

---

## Funcionalidades

### Área administrativa
- Dashboard com métricas
- Gerenciamento de produtos (com variações, componentes e imagens)
- Gerenciamento de clientes
- Gerenciamento de pedidos
- Gerenciamento de usuários administradores
- Cupons de desconto
- Relatórios e gráficos

### Área do cliente
- Catálogo de produtos com busca
- Favoritos
- Carrinho de compras (persistido no localStorage)
- Histórico de pedidos
- Acompanhamento de pedidos ativos
- Edição de perfil

---

## Licença

Projeto privado. Todos os direitos reservados.
