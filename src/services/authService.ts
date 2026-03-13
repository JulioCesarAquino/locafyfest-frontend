// src/services/authService.ts
import apiClient from "./apiClient";

interface LoginData {
  email: string;
  password: string;
}

export async function login(data: LoginData): Promise<{ access_token: string; user_type: "admin" | "client" }> {
  const { data: tokenData } = await apiClient.post("/auth/login", data);
  const { data: user } = await apiClient.get("/auth/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  return { access_token: tokenData.access_token, user_type: user.user_type };
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_type");
  window.location.href = "/login";
}
