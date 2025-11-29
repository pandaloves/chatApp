// User related types
export type User = {
  id: number;
  username: string;
  password?: string; 
  createdAt: string;
  isOnline: boolean;
  isDeleted: boolean;
  sentMessages?: Message[];
  receivedMessages?: Message[];
}

export type UserRegistration = {
  username: string;
  password: string;
}

export type UserLogin = {
  username: string;
  password: string;
}

export type UserResponse = {
  id: number;
  username: string;
  createdAt: string;
  isOnline: boolean;
  isDeleted: boolean;
}

// Message related types
export type Message = {
  id: number;
  content: string;
  sender ?: User;
  senderId: number;
  senderUsername: string; 
  receiver?: User;
  messageType: MessageType;
  timestamp: string;
  isRead: boolean;
  lastEdited?: string;
  originalContent?: string;
}

export type MessageType = 'PUBLIC' | 'PRIVATE';

export type CreateMessage = {
  content: string;
  senderId: number;
  receiverId?: number;
  messageType: MessageType;
}

export type EditMessage ={
  messageId: number;
  content: string;
  userId: number;
}

// WebSocket message types
export type ChatMessageDTO = {
  id?: number;
  content: string;
  sender: string; 
  senderUsername: string;
  receiver?: string;
  receiverUsername?: string;
  type: string;
  timestamp?: string;
  lastEdited?: string | null; // Add this
  isRead?: boolean;
}

export type WebSocketMessage ={
  type: 'PUBLIC' | 'PRIVATE' | 'MESSAGE_EDIT' |  'ERROR';
  payload: ChatMessageDTO | any;
}

export type WebSocketError = {
  type: 'ERROR';
  message: string;
}

// API Response types
export type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
}

export type ErrorResponse = {
  error: string;
  message: string;
  status: number;
  timestamp: string;
}

// Form types
export type LoginFormData = {
  username: string;
  password: string;
}

export type RegisterFormData = {
  username: string;
  password: string;
  confirmPassword?: string;
}

// Component Props types
export type ChatRoomProps = {
  user: User;
  onLogout: () => void;
}

export type MessageListProps = {
  messages: Message[];
  currentUser: User;
  onEditMessage: (messageId: number, newContent: string) => void;
}

export type MessageInputProps = {
  onSendMessage: (content: string, receiver?: number | null) => void;
  onPrivateMessageClick?: () => void;
}

export type UserListProps = {
  users: User[];
  onlineUsers: User[];
  onSelectUser: (user: User) => void;
}

export type LoginFormProps = {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  loading?: boolean;
}

export type PrivateMessageDialogProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSendMessage: (content: string) => void;
}

// Service types
export type ApiConfig = {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export type WebSocketConfig = {
  url: string;
  reconnectDelay?: number;
  heartbeatIncoming?: number;
  heartbeatOutgoing?: number;
}

// State management types
export type ChatState = {
  user: User | null;
  messages: Message[];
  users: User[];
  onlineUsers: User[];
  loading: boolean;
  error: string | null;
}

export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Event types
export type MessageEvent = {
  type: 'NEW_MESSAGE' | 'MESSAGE_EDIT'
  message: Message;
}

export type UserEvent = {
  type: 'USER_JOINED' | 'USER_LEFT' | 'USER_UPDATED';
  user: User;
}

// Utility types
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// API Endpoint types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type EndpointConfig ={
  url: string;
  method: HttpMethod;
  requiresAuth?: boolean;
}

// Pagination types (for future use)
export type PaginatedResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export type PageRequest ={
  page?: number;
  size?: number;
  sort?: string;
}

// Search and filter types (for future use)
export type UserSearchCriteria = {
  username?: string;
  isOnline?: boolean;
  isDeleted?: boolean;
}

export type MessageSearchCriteria = {
  senderId?: number;
  receiverId?: number;
  messageType?: MessageType;
  startDate?: string;
  endDate?: string;
  content?: string;
}