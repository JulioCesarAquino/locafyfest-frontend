import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/dashboard" element={<Index />} />
          <Route path="/admin/products" element={<Products />} />
          <Route path="/admin/clients" element={<Clients />} />
          <Route path="/admin/orders" element={<Orders />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/admins" element={<Admins />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/my-order" element={<MyOrder />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
