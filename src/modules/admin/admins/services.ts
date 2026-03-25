import apiClient from '@/services/apiClient';

export interface Admin {
  id: number;
  name: string;
  email: string;
  phone?: string;
  user_type: 'admin' | 'client';
  permissions: string[];
  is_active: boolean;
  profile_picture_path?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminData {
  name: string;
  email: string;
  password: string;
  permissions?: string[];
}

export interface UpdateAdminData {
  name?: string;
  email?: string;
  permissions?: string[];
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface ResetPasswordData {
  new_password: string;
  new_password_confirmation: string;
}

export const getMe = async (): Promise<Admin> => {
  const { data } = await apiClient.get('/auth/me');
  return data;
};

export const getAdmins = async (params?: {
  search?: string;
  status?: string;
}): Promise<Admin[]> => {
  const { data } = await apiClient.get('/admin/admins', { params });
  return data.data;
};

export const getAdmin = async (id: number): Promise<Admin> => {
  const { data } = await apiClient.get(`/admin/admins/${id}`);
  return data.data;
};

export const createAdmin = async (payload: CreateAdminData): Promise<Admin> => {
  const { data } = await apiClient.post('/admin/admins', payload);
  return data.data;
};

export const updateAdmin = async (id: number, payload: UpdateAdminData): Promise<Admin> => {
  const { data } = await apiClient.put(`/admin/admins/${id}`, payload);
  return data.data;
};

export const deleteAdmin = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/admins/${id}`);
};

export const toggleAdminStatus = async (id: number): Promise<Admin> => {
  const { data } = await apiClient.post(`/admin/admins/${id}/toggle-status`);
  return data.data;
};

export const updateAdminPermissions = async (id: number, permissions: string[]): Promise<Admin> => {
  const { data } = await apiClient.post(`/admin/admins/${id}/permissions`, { permissions });
  return data.data;
};

export const uploadAdminPhoto = async (id: number, file: File): Promise<Admin> => {
  const form = new FormData();
  form.append('profile_picture', file);
  const { data } = await apiClient.post(`/admin/admins/${id}/upload-photo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export const resetAdminPassword = async (id: number, payload: ResetPasswordData): Promise<void> => {
  await apiClient.post(`/admin/admins/${id}/reset-password`, payload);
};

// Perfil próprio
export const updateMyProfile = async (payload: UpdateProfileData): Promise<Admin> => {
  const { data } = await apiClient.put('/admin/profile', payload);
  return data.data;
};

export const changeMyPassword = async (payload: ChangePasswordData): Promise<void> => {
  await apiClient.post('/admin/profile/change-password', payload);
};

export const uploadMyPhoto = async (file: File): Promise<Admin> => {
  const form = new FormData();
  form.append('profile_picture', file);
  const { data } = await apiClient.post('/admin/profile/upload-photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export const removeMyPhoto = async (): Promise<Admin> => {
  const { data } = await apiClient.delete('/admin/profile/remove-photo');
  return data.data;
};
