import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Products from "./pages/admin/Products";
import Clients from "./pages/admin/Clients";
import Orders from "./pages/admin/Orders";
import Settings from "./pages/admin/Settings";
import Reports from "./pages/admin/Reports";
import Admins from "./pages/admin/Admins";
import Catalog from "./pages/client/Catalog";
import MyOrder from "./pages/client/MyOrder";
import History from "./pages/client/History";
import Profile from "./pages/client/Profile";
import Favorites from "./pages/client/Favorites";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Rota raiz redireciona para login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Rotas protegidas — somente admin */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<Index />} />
              <Route path="/admin/products" element={<Products />} />
              <Route path="/admin/clients" element={<Clients />} />
              <Route path="/admin/orders" element={<Orders />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/admins" element={<Admins />} />
            </Route>

            {/* Rotas protegidas — somente client */}
            <Route element={<ProtectedRoute allowedRoles={["client"]} />}>
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/my-order" element={<MyOrder />} />
              <Route path="/history" element={<History />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/favorites" element={<Favorites />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
