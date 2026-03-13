import { createContext, useContext, useState, ReactNode } from "react";

type UserType = "admin" | "client";

interface AuthContextData {
  isAuthenticated: boolean;
  userType: UserType | null;
  signIn: (token: string, type: UserType) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("access_token")
  );
  const [userType, setUserType] = useState<UserType | null>(
    () => localStorage.getItem("user_type") as UserType | null
  );

  function signIn(newToken: string, type: UserType) {
    localStorage.setItem("access_token", newToken);
    localStorage.setItem("user_type", type);
    setToken(newToken);
    setUserType(type);
  }

  function signOut() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_type");
    setToken(null);
    setUserType(null);
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: !!token, userType, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
