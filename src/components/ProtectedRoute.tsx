import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type UserType = "admin" | "client" | "super_admin";

interface ProtectedRouteProps {
  allowedRoles?: UserType[];
  requiredPermission?: string;
}

function homeFor(userType: UserType | null): string {
  if (userType === "admin" || userType === "super_admin") return "/admin/dashboard";
  if (userType === "client") return "/catalog";
  return "/login";
}

export function ProtectedRoute({ allowedRoles, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, userType, permissions, permissionsLoaded } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Usuário autenticado acessando rota de outro perfil → redireciona para a home dele
  if (allowedRoles && (!userType || !allowedRoles.includes(userType))) {
    return <Navigate to={homeFor(userType)} replace />;
  }

  // Aguarda o carregamento das permissões antes de bloquear
  if (requiredPermission && !permissionsLoaded) {
    return null;
  }

  // super_admin passa por tudo; admin sem a permissão vai para o dashboard
  if (requiredPermission && userType !== "super_admin") {
    if (!permissions.includes(requiredPermission)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <Outlet />;
}
