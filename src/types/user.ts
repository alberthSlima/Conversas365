/**
 * Tipos para usuários
 */

export type UserRole = 'ADMIN' | 'USER' | 'MANAGER';

export type User = {
  id: number;
  username: string;
  role: UserRole | number;
  createdAt?: string;
  updatedAt?: string;
};

export type UserListItem = {
  id?: number;
  username?: string;
  role?: string | number;
};

export type CreateUserRequest = {
  username: string;
  password: string;
  role: number;
};

export type UpdateUserRequest = {
  password?: string;
  role?: number;
};
