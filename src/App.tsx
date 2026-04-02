import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

function OrderRedirect() {
  const { id } = useParams<{ id: string }>();
  const userType = localStorage.getItem('user_type');
  const to = userType === 'client' ? `/history?order=${id}` : `/admin/orders?id=${id}`;
  return <Navigate to={to} replace />;
}
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./modules/admin/dashboard";
import Login from "./modules/auth/login";
import Register from "./modules/auth/register";
import VerifyEmail from "./modules/auth/verify-email";
import ForgotPassword from "./modules/auth/forgot-password";
import Products from "./modules/admin/products";
import Clients from "./modules/admin/clients";
import ClientDetail from "./modules/admin/clients/detail";
import Orders from "./modules/admin/orders";
import Settings from "./modules/admin/settings";
import Reports from "./modules/admin/reports";
import Admins from "./modules/admin/admins";
import Coupons from "./modules/admin/coupons";
import Catalog from "./modules/client/catalog";
import MyOrder from "./modules/client/my-order";
import History from "./modules/client/history";
import Profile from "./modules/client/profile";
import Favorites from "./modules/client/favorites";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AuthProvider>
          <CartProvider>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Rota raiz redireciona para login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Rotas protegidas — admin e super_admin */}
            <Route element={<ProtectedRoute allowedRoles={["admin", "super_admin"]} />}>
              <Route path="/admin/dashboard" element={<Index />} />

              <Route element={<ProtectedRoute requiredPermission="products" />}>
                <Route path="/admin/products" element={<Products />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="clients" />}>
                <Route path="/admin/clients" element={<Clients />} />
                <Route path="/admin/clients/:id" element={<ClientDetail />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="orders" />}>
                <Route path="/admin/orders" element={<Orders />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="settings" />}>
                <Route path="/admin/settings" element={<Settings />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="reports" />}>
                <Route path="/admin/reports" element={<Reports />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="admins" />}>
                <Route path="/admin/admins" element={<Admins />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission="orders" />}>
                <Route path="/admin/coupons" element={<Coupons />} />
              </Route>
            </Route>

            {/* Rotas protegidas — somente client */}
            <Route element={<ProtectedRoute allowedRoles={["client"]} />}>
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/my-order" element={<MyOrder />} />
              <Route path="/history" element={<History />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/favorites" element={<Favorites />} />
            </Route>

            {/* Rota de compatibilidade para notificações push com action_url /orders/:id */}
            <Route path="/orders/:id" element={<OrderRedirect />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </CartProvider>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
