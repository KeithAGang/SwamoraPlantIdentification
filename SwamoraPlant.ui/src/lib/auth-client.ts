import { api } from './api';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  isAdmin?: boolean;
}

export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const res = await api.post('/api/auth/login', { email, password });
    return res.data;
  },
  signup: async (
    name: string,
    email: string,
    password: string,
  ): Promise<{ token: string; user: AuthUser }> => {
    const res = await api.post('/api/auth/signup', { name, email, password });
    return res.data;
  },
  me: async (token: string): Promise<AuthUser> => {
    const res = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
