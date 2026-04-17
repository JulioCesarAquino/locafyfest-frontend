import apiClient from "./apiClient";

interface LoginData {
  email: string;
  password: string;
}

export interface SignInPayload {
  token: string;
  type: "admin" | "client" | "super_admin";
  name: string;
  avatarPath: string;
}

export async function login(data: LoginData): Promise<SignInPayload> {
  const { data: tokenData } = await apiClient.post("/auth/login", data);
  const { data: user } = await apiClient.get("/auth/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  return {
    token: tokenData.access_token,
    type: user.user_type,
    name: user.name,
    avatarPath: user.profile_picture_path ?? "",
  };
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_type");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_avatar");
  localStorage.removeItem("user_permissions");
  localStorage.removeItem("client_id");
  window.location.href = "/#/";
}
