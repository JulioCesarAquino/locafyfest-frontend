import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { SignInPayload } from "@/services/authService";
import apiClient from "@/services/apiClient";

type UserType = "admin" | "client" | "super_admin";

interface AuthContextData {
  isAuthenticated: boolean;
  userType: UserType | null;
  userName: string;
  userAvatarPath: string;
  clientId: number | null;
  permissions: string[];
  permissionsLoaded: boolean;
  signIn: (payload: SignInPayload) => void;
  signOut: () => void;
  updateUserName: (name: string) => void;
  updateUserAvatarPath: (path: string) => void;
  updatePermissions: (permissions: string[]) => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("access_token")
  );
  const [userType, setUserType] = useState<UserType | null>(
    () => localStorage.getItem("user_type") as UserType | null
  );
  const [userName, setUserName] = useState<string>(
    () => localStorage.getItem("user_name") ?? ""
  );
  const [userAvatarPath, setUserAvatarPath] = useState<string>(
    () => localStorage.getItem("user_avatar") ?? ""
  );
  const [clientId, setClientId] = useState<number | null>(() => {
    const stored = localStorage.getItem("client_id");
    return stored ? parseInt(stored, 10) : null;
  });
  const [permissions, setPermissions] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("user_permissions") ?? "[]");
    } catch {
      return [];
    }
  });
  // Se já há permissões em localStorage, considera carregado imediatamente
  const [permissionsLoaded, setPermissionsLoaded] = useState<boolean>(
    () => localStorage.getItem("user_permissions") !== null || !localStorage.getItem("access_token")
  );

  // Busca permissões frescas do backend sempre que o token muda
  useEffect(() => {
    if (!token) {
      setPermissionsLoaded(true);
      return;
    }

    const controller = new AbortController();

    apiClient.get("/auth/me", { signal: controller.signal })
      .then(({ data }) => {
        const perms: string[] = data.permissions ?? [];
        const type: UserType = data.user_type;
        const id: number | null = data.id ?? null;
        localStorage.setItem("user_permissions", JSON.stringify(perms));
        localStorage.setItem("user_type", type);
        if (id !== null) localStorage.setItem("client_id", String(id));
        setPermissions(perms);
        setUserType(type);
        setClientId(id);
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
      })
      .finally(() => setPermissionsLoaded(true));

    return () => controller.abort();
  }, [token]);

  function signIn({ token: newToken, type, name, avatarPath }: SignInPayload) {
    localStorage.setItem("access_token", newToken);
    localStorage.setItem("user_type", type);
    localStorage.setItem("user_name", name);
    localStorage.setItem("user_avatar", avatarPath);
    // Limpa permissões antigas para forçar re-fetch no useEffect
    localStorage.removeItem("user_permissions");
    setPermissions([]);
    setPermissionsLoaded(false);
    setToken(newToken);
    setUserType(type);
    setUserName(name);
    setUserAvatarPath(avatarPath);
  }

  function signOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_type");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_avatar");
    localStorage.removeItem("user_permissions");
    localStorage.removeItem("client_id");
    setToken(null);
    setUserType(null);
    setUserName("");
    setUserAvatarPath("");
    setClientId(null);
    setPermissions([]);
    setPermissionsLoaded(true);
  }

  function updateUserName(name: string) {
    localStorage.setItem("user_name", name);
    setUserName(name);
  }

  function updateUserAvatarPath(path: string) {
    localStorage.setItem("user_avatar", path);
    setUserAvatarPath(path);
  }

  function updatePermissions(perms: string[]) {
    localStorage.setItem("user_permissions", JSON.stringify(perms));
    setPermissions(perms);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        userType,
        userName,
        userAvatarPath,
        clientId,
        permissions,
        permissionsLoaded,
        signIn,
        signOut,
        updateUserName,
        updateUserAvatarPath,
        updatePermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
