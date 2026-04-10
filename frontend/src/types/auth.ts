export type Role = 'admin' | 'lead';

export interface User {
  id: number;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
