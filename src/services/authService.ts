// src/services/authService.ts
import apiClient from "./apiClient";

interface LoginData {
  email?: string;
  cpf?: string;
  password: string;
}

export async function login(userType: "admin" | "client", data: LoginData) {
  const response = await apiClient.post("/auth/login", data);
  return response.data; // deve conter { access_token }
}

export function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
}
