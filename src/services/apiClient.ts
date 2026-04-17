import axios from "axios";

// ─── Audit helpers ─────────────────────────────────────────────────────────────

interface AuditEntry {
  resource: string;
  action: string;
  resource_id: number | null;
  description: string;
}

function extractId(path: string, pattern: RegExp): number | null {
  const m = path.match(pattern);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Mapeia método + caminho da URL para uma entrada de auditoria legível.
 * Retorna null para requisições que não devem ser registradas (GET, refresh, etc.).
 */
function mapToAuditEntry(method: string, url: string): AuditEntry | null {
  // Remove base URL, query string e trailing slash
  const path = url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/\?.*$/, '')
    .replace(/\/$/, '');

  const m = method.toUpperCase();

  // Ignorar leituras e endpoints internos
  if (m === 'GET' || !path) return null;
  if (path.includes('/audit-logs')) return null;
  if (path.includes('/auth/refresh')) return null;
  if (path.includes('/auth/forgot-password')) return null;
  if (path.includes('/auth/verify-email')) return null;
  if (/\/products\/\d+\/check-availability$/.test(path)) return null;
  if (/\/orders\/my-orders$/.test(path)) return null;
  if (/\/coupons\/validate$/.test(path)) return null;

  // ── Autenticação ────────────────────────────────────────────────────────────
  if (m === 'POST' && /\/auth\/login$/.test(path))
    return { resource: 'Autenticação', action: 'Login', resource_id: null, description: 'Login realizado no sistema' };

  if (m === 'POST' && /\/auth\/register$/.test(path))
    return { resource: 'Autenticação', action: 'Cadastro', resource_id: null, description: 'Novo cadastro de cliente realizado' };

  if (m === 'POST' && /\/auth\/reset-password$/.test(path))
    return { resource: 'Autenticação', action: 'Redefinição de senha', resource_id: null, description: 'Senha redefinida via e-mail' };

  // ── Configurações ───────────────────────────────────────────────────────────
  if (m === 'POST' && /\/settings\/bulk-upsert$/.test(path))
    return { resource: 'Configurações', action: 'Atualização', resource_id: null, description: 'Configurações do sistema atualizadas' };

  // ── Endereços ────────────────────────────────────────────────────────────────
  if (m === 'PUT' && /\/addresses\/\d+$/.test(path)) {
    const id = extractId(path, /\/addresses\/(\d+)/);
    return { resource: 'Endereço', action: 'Edição', resource_id: id, description: `Endereço #${id} editado` };
  }
  if (m === 'DELETE' && /\/addresses\/\d+$/.test(path)) {
    const id = extractId(path, /\/addresses\/(\d+)/);
    return { resource: 'Endereço', action: 'Exclusão', resource_id: id, description: `Endereço #${id} excluído` };
  }
  if (m === 'POST' && /\/addresses\/\d+\/set-default$/.test(path)) {
    const id = extractId(path, /\/addresses\/(\d+)/);
    return { resource: 'Endereço', action: 'Endereço padrão', resource_id: id, description: `Endereço #${id} definido como padrão` };
  }

  // ── Cupons ───────────────────────────────────────────────────────────────────
  if (m === 'POST' && /\/coupons$/.test(path))
    return { resource: 'Cupom', action: 'Criação', resource_id: null, description: 'Novo cupom criado' };
  if (m === 'PUT' && /\/coupons\/\d+$/.test(path)) {
    const id = extractId(path, /\/coupons\/(\d+)/);
    return { resource: 'Cupom', action: 'Edição', resource_id: id, description: `Cupom #${id} editado` };
  }
  if (m === 'DELETE' && /\/coupons\/\d+$/.test(path)) {
    const id = extractId(path, /\/coupons\/(\d+)/);
    return { resource: 'Cupom', action: 'Exclusão', resource_id: id, description: `Cupom #${id} excluído` };
  }
  if (m === 'POST' && /\/coupons\/\d+\/toggle$/.test(path)) {
    const id = extractId(path, /\/coupons\/(\d+)/);
    return { resource: 'Cupom', action: 'Alteração de status', resource_id: id, description: `Status do cupom #${id} alterado` };
  }

  // ── Produtos ─────────────────────────────────────────────────────────────────
  if (m === 'POST' && /\/products\/\d+\/upload-variation-images$/.test(path)) {
    const id = extractId(path, /\/products\/(\d+)/);
    return { resource: 'Produto', action: 'Upload de imagem', resource_id: id, description: `Imagens de variação do produto #${id} enviadas` };
  }
  if (m === 'POST' && /\/products\/\d+\/upload-images$/.test(path)) {
    const id = extractId(path, /\/products\/(\d+)/);
    return { resource: 'Produto', action: 'Upload de imagem', resource_id: id, description: `Imagem do produto #${id} enviada` };
  }
  if (m === 'POST' && /\/products$/.test(path))
    return { resource: 'Produto', action: 'Criação', resource_id: null, description: 'Novo produto criado' };
  if (m === 'PUT' && /\/products\/\d+$/.test(path)) {
    const id = extractId(path, /\/products\/(\d+)/);
    return { resource: 'Produto', action: 'Edição', resource_id: id, description: `Produto #${id} editado` };
  }
  if (m === 'DELETE' && /\/products\/\d+$/.test(path)) {
    const id = extractId(path, /\/products\/(\d+)/);
    return { resource: 'Produto', action: 'Exclusão', resource_id: id, description: `Produto #${id} excluído` };
  }

  // ── Usuários / Clientes / Admins ─────────────────────────────────────────────
  if (m === 'POST' && /\/users\/\d+\/addresses$/.test(path)) {
    const id = extractId(path, /\/users\/(\d+)/);
    return { resource: 'Endereço', action: 'Criação', resource_id: null, description: `Novo endereço adicionado ao usuário #${id}` };
  }
  if (m === 'POST' && /\/users\/\d+\/link$/.test(path)) {
    const id = extractId(path, /\/users\/(\d+)/);
    return { resource: 'Usuário', action: 'Vínculo', resource_id: id, description: `Cliente #${id} vinculado ao sistema` };
  }
  if (m === 'POST' && /\/users\/\d+\/reject-link$/.test(path)) {
    const id = extractId(path, /\/users\/(\d+)/);
    return { resource: 'Usuário', action: 'Rejeição de vínculo', resource_id: id, description: `Vínculo do cliente #${id} rejeitado` };
  }
  if (m === 'POST' && /\/users\/\d+\/change-password$/.test(path)) {
    const id = extractId(path, /\/users\/(\d+)/);
    return { resource: 'Usuário', action: 'Alteração de senha', resource_id: id, description: `Senha do usuário #${id} alterada` };
  }
  if (m === 'POST' && /\/users$/.test(path))
    return { resource: 'Usuário', action: 'Criação', resource_id: null, description: 'Novo usuário/cliente criado' };
  if (m === 'PUT' && /\/users\/\d+$/.test(path)) {
    const id = extractId(path, /\/users\/(\d+)/);
    return { resource: 'Usuário', action: 'Edição', resource_id: id, description: `Usuário #${id} editado` };
  }
  if (m === 'DELETE' && /\/users\/\d+$/.test(path)) {
    const id = extractId(path, /\/users\/(\d+)/);
    return { resource: 'Usuário', action: 'Exclusão', resource_id: id, description: `Usuário #${id} excluído` };
  }

  // ── Pedidos — sub-rotas primeiro ─────────────────────────────────────────────
  if (m === 'POST' && /\/orders\/\d+\/confirm$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Pedido', action: 'Confirmação', resource_id: id, description: `Pedido #${id} confirmado` };
  }
  if (m === 'POST' && /\/orders\/\d+\/cancel$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Pedido', action: 'Cancelamento', resource_id: id, description: `Pedido #${id} cancelado` };
  }
  if (m === 'POST' && /\/orders\/\d+\/deliver$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Pedido', action: 'Entrega', resource_id: id, description: `Pedido #${id} marcado como entregue` };
  }
  if (m === 'POST' && /\/orders\/\d+\/return$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Pedido', action: 'Devolução', resource_id: id, description: `Pedido #${id} devolvido` };
  }
  if (m === 'POST' && /\/orders\/\d+\/force-status$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Pedido', action: 'Status forçado', resource_id: id, description: `Status do pedido #${id} alterado manualmente` };
  }
  if (m === 'POST' && /\/orders\/\d+\/apply-discount$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Pedido', action: 'Desconto', resource_id: id, description: `Desconto aplicado ao pedido #${id}` };
  }
  if (m === 'POST' && /\/orders\/\d+\/mark-paid$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Pedido', action: 'Pagamento', resource_id: id, description: `Pagamento do pedido #${id} registrado` };
  }
  if (m === 'PATCH' && /\/orders\/\d+\/payment-method$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Pedido', action: 'Forma de pagamento', resource_id: id, description: `Forma de pagamento do pedido #${id} atualizada` };
  }
  if (m === 'POST' && /\/orders\/\d+\/invoice\/upload-pdf$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Nota Fiscal', action: 'Upload de PDF', resource_id: id, description: `PDF da nota fiscal do pedido #${id} enviado` };
  }
  if (m === 'POST' && /\/orders\/\d+\/invoice\/request$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Nota Fiscal', action: 'Solicitação', resource_id: id, description: `Nota fiscal do pedido #${id} solicitada` };
  }
  if (m === 'PATCH' && /\/orders\/\d+\/invoice$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Nota Fiscal', action: 'Atualização', resource_id: id, description: `Nota fiscal do pedido #${id} atualizada` };
  }
  if (m === 'POST' && /\/orders$/.test(path))
    return { resource: 'Pedido', action: 'Criação', resource_id: null, description: 'Novo pedido criado' };
  if ((m === 'PUT' || m === 'PATCH') && /\/orders\/\d+$/.test(path)) {
    const id = extractId(path, /\/orders\/(\d+)/);
    return { resource: 'Pedido', action: 'Edição', resource_id: id, description: `Pedido #${id} editado` };
  }

  return null;
}

// ─── Axios instance ────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
type FailedRequest = {
  resolve: (value?: unknown) => void;
  reject: (error: unknown) => void;
};

let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};


apiClient.interceptors.response.use(
  (response) => {
    // ── Auditoria automática ──────────────────────────────────────────────────
    // Executa de forma assíncrona (fire-and-forget) para não bloquear a resposta
    try {
      const config = response.config;
      const entry = mapToAuditEntry(config.method ?? '', config.url ?? '');
      if (entry) {
        const payload = {
          user_name: localStorage.getItem('user_name') ?? 'Desconhecido',
          user_type: localStorage.getItem('user_type') ?? 'unknown',
          action: entry.action,
          resource: entry.resource,
          resource_id: entry.resource_id,
          description: entry.description,
          method: (config.method ?? '').toUpperCase(),
          endpoint: (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''),
        };
        apiClient.post('/audit-logs', payload).catch(() => {/* silencioso */});
      }
    } catch {
      // Auditoria nunca pode quebrar o fluxo principal
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/login")) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const expiredToken = localStorage.getItem("access_token");
        if (!expiredToken) {
          throw new Error("No token");
        }

        // JWT refresh: envia o token expirado no header para obter um novo
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${expiredToken}` } },
        );

        localStorage.setItem("access_token", data.access_token);
        apiClient.defaults.headers.common["Authorization"] = "Bearer " + data.access_token;
        processQueue(null, data.access_token);

        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem("access_token");
        window.location.href = "/#/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
