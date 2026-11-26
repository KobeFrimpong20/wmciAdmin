import { apiClient } from './client';

export interface LoginResponse {
  token: string;
  role: string;
  expires_at: string;
}

export interface SessionResponse {
  role: string;
}

export const authApi = {
  login: (password: string) =>
    apiClient<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      skipAuth: true,
    }),

  getSession: () =>
    apiClient<SessionResponse>('/auth/me', {
      method: 'GET',
    }),
};
