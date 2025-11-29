
import axios, { AxiosResponse } from 'axios';
import { User, Message, ApiResponse } from '../types';

/* ------------------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User API endpoints
export const userAPI = {
  register: (username: string, password: string): Promise<AxiosResponse<User>> =>
    api.post<User>('/users/register', { username, password }),
  
  login: (username: string, password: string): Promise<AxiosResponse<User>> =>
    api.post<User>('/users/login', { username, password }),
  
  logout: (userId: number): Promise<AxiosResponse<void>> =>
    api.post(`/users/logout/${userId}`),
  
  getOnlineUsers: (): Promise<AxiosResponse<User[]>> =>
    api.get<User[]>('/users/online'),
  
  getAllUsers: (): Promise<AxiosResponse<User[]>> =>
    api.get<User[]>('/users'),
  
  deleteUser: (userId: number, requestingUserId: number): Promise<AxiosResponse<void>> =>
    api.delete(`/users/${userId}`, { 
      headers: { 'X-User-Id': requestingUserId.toString() } 
    }),
  
  hardDeleteUser: (userId: number, requestingUserId: number): Promise<AxiosResponse<void>> =>
    api.delete(`/users/${userId}/hard`, { 
      headers: { 'X-User-Id': requestingUserId.toString() } 
    })
};

// Message API endpoints
export const messageAPI = {
  getPublicMessages: (): Promise<AxiosResponse<Message[]>> =>
    api.get<Message[]>('/messages/public'),
  
  getPrivateMessages: (user1Id: number, user2Id: number): Promise<AxiosResponse<Message[]>> =>
    api.get<Message[]>(`/messages/private/${user1Id}/${user2Id}`),
  
  getUserMessages: (userId: number): Promise<AxiosResponse<Message[]>> =>
    api.get<Message[]>(`/messages/user/${userId}`),
  
  getMessage: (messageId: number): Promise<AxiosResponse<Message>> =>
    api.get<Message>(`/messages/${messageId}`),
  
  editMessage: (messageId: number, content: string, userId: number): Promise<AxiosResponse<Message>> =>
    api.put<Message>(`/messages/${messageId}`, { content }, { 
      headers: { 'X-User-Id': userId.toString() } 
    }),

  
  markMessagesAsRead: (userId: number): Promise<AxiosResponse<void>> =>
    api.post(`/messages/read/${userId}`)
};

// Export types for convenience
export type { User, Message };
export default api;