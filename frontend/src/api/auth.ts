import { apiClient } from './client';
import type { AuthResponse, LoginCredentials } from '../types/auth';

export const authApi = {
  login: (credentials: LoginCredentials) => 
    apiClient<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
};
