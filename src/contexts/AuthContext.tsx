import { createContext, useContext, useState, ReactNode } from "react";
import type { SignInPayload } from "@/services/authService";

type UserType = "admin" | "client";

interface AuthContextData {
  isAuthenticated: boolean;
  userType: UserType | null;
  userName: string;
  userAvatarPath: string;
  signIn: (payload: SignInPayload) => void;
  signOut: () => void;
  updateUserName: (name: string) => void;
  updateUserAvatarPath: (path: string) => void;
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

  function signIn({ token: newToken, type, name, avatarPath }: SignInPayload) {
    localStorage.setItem("access_token", newToken);
    localStorage.setItem("user_type", type);
    localStorage.setItem("user_name", name);
    localStorage.setItem("user_avatar", avatarPath);
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
    setToken(null);
    setUserType(null);
    setUserName("");
    setUserAvatarPath("");
  }

  function updateUserName(name: string) {
    localStorage.setItem("user_name", name);
    setUserName(name);
  }

  function updateUserAvatarPath(path: string) {
    localStorage.setItem("user_avatar", path);
    setUserAvatarPath(path);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        userType,
        userName,
        userAvatarPath,
        signIn,
        signOut,
        updateUserName,
        updateUserAvatarPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
