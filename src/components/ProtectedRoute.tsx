import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type UserType = "admin" | "client";


interface ProtectedRouteProps {
  allowedRoles?: UserType[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, userType } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    if (!userType || !allowedRoles.includes(userType)) {
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}
