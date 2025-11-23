import SockJS from 'sockjs-client';
import { Client, IMessage, StompHeaders } from '@stomp/stompjs';
import {
  ChatMessageDTO,
  WebSocketError,
} from '../types';
import { messageAPI } from './api';

interface StompFrame {
  command: string;
  headers: StompHeaders;
  body?: string;
}

interface WebSocketCloseEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

class WebSocketService {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private subscriptions: Map<string, any> = new Map();
  private messageCallbacks: ((message: ChatMessageDTO) => void)[] = [];
  private errorCallbacks: ((error: WebSocketError) => void)[] = [];
  private connectCallbacks: (() => void)[] = [];
  private disconnectCallbacks: (() => void)[] = [];

  connect(
    userId: number, 
    onMessageReceived: (message: ChatMessageDTO) => void,
    onError: (error: WebSocketError) => void
  ): void {
    this.messageCallbacks.push(onMessageReceived);
    this.errorCallbacks.push(onError);

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      
      onConnect: (frame: StompFrame) => {
        this.isConnected = true;
        console.log('WebSocket connected:', frame);
        
        this.setupSubscriptions(userId);
        this.connectCallbacks.forEach(callback => callback());
      },
      
      onStompError: (frame: StompFrame) => {
        console.error('WebSocket STOMP error:', frame);
        const error: WebSocketError = {
          type: 'ERROR',
          message: frame.headers?.message || 'WebSocket connection error'
        };
        this.errorCallbacks.forEach(callback => callback(error));
      },
      
      onDisconnect: () => {
        this.isConnected = false;
        console.log('WebSocket disconnected');
        this.disconnectCallbacks.forEach(callback => callback());
      },
      
      onWebSocketClose: (event: WebSocketCloseEvent) => {
        console.log('WebSocket closed:', event);
        this.isConnected = false;
      }
    });

    this.client.activate();
  }

  private handleIncomingMessage(message: IMessage) {
  if (!message.body) return;

  try {
    const parsed: ChatMessageDTO = JSON.parse(message.body);
    this.messageCallbacks.forEach(cb => cb(parsed));
  } catch (err) {
    console.error('Failed to parse incoming WS message:', err);
  }
}

  private setupSubscriptions(userId: number): void {
  if (!this.client) return;

  // Subscribe to all messages, edits, and deletions (all broadcast on /topic/public)
  const publicSub = this.client.subscribe('/topic/public', this.handleIncomingMessage.bind(this));
  this.subscriptions.set('public', publicSub);

  // Errors
  const errorSub = this.client.subscribe(`/user/${userId}/queue/errors`, (msg) => {
    try {
      const error = JSON.parse(msg.body);
      this.errorCallbacks.forEach((cb) => cb(error));
    } catch (err) {
      console.error('Failed to parse WS error:', err);
    }
  });
  this.subscriptions.set('errors', errorSub);
}


  sendPublicMessage(content: string, senderId: number): void {
    if (this.isConnected && this.client) {
      const message: ChatMessageDTO = {
        content: content,
        sender: senderId.toString(),
        type: 'PUBLIC'
      };
      
      this.client.publish({
        destination: '/app/chat.public',
        body: JSON.stringify(message)
      });
    } else {
      console.warn('WebSocket not connected');
    }
  }

  sendPrivateMessage(content: string, senderId: number, receiverId: number): void {
    if (this.isConnected && this.client) {
      const message: ChatMessageDTO = {
        content: content,
        sender: senderId.toString(),
        receiver: receiverId.toString(),
        type: 'PRIVATE'
      };
      
      this.client.publish({
        destination: '/app/chat.private',
        body: JSON.stringify(message)
      });
    } else {
      console.warn('WebSocket not connected');
    }
  }

  async editMessage(messageId: number, userId: number, newContent: string): Promise<boolean> {
  console.log('[WS-EDIT] Starting edit process:', { messageId, userId, newContent });
  
  // Validate inputs
  if (!newContent || newContent.trim().length === 0) {
    console.error('[WS-EDIT] Empty content provided');
    return false;
  }

  if (!messageId || !userId) {
    console.error('[WS-EDIT] Missing messageId or userId');
    return false;
  }

  try {
    console.log('[WS-EDIT] Attempting REST API edit...');
    
    // Try REST API first for persistence
    const response = await messageAPI.editMessage(messageId, newContent, userId);
    
    console.log('[WS-EDIT] REST API edit successful:', {
      status: response.status,
      data: response.data
    });
    
    // Then broadcast via WebSocket if connected for real-time updates
    if (this.isConnected && this.client) {
      console.log('[WS-EDIT] Broadcasting edit via WebSocket...');
      
      const editPayload = { 
        messageId, 
        userId, 
        content: newContent 
      };
      
      this.client.publish({
        destination: '/app/chat.edit',
        body: JSON.stringify(editPayload)
      });
      
      console.log('[WS-EDIT] WebSocket broadcast sent');
    } else {
      console.log('[WS-EDIT] WebSocket not connected, skipping broadcast');
    }
    
    return true;
    
  } catch (error: any) {
    console.error('[WS-EDIT] Edit failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // Log specific error details
    if (error.response?.status === 400) {
      console.error('[WS-EDIT] 400 Bad Request - likely validation error:', error.response.data);
    } else if (error.response?.status === 404) {
      console.error('[WS-EDIT] 404 Not Found - message does not exist');
    } else if (error.response?.status === 403) {
      console.error('[WS-EDIT] 403 Forbidden - user not authorized to edit this message');
    }
    
    return false;
  }
}

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    // Always try REST API first for persistence
    try {
      console.log('Deleting message via REST API:', { messageId, userId });
      await messageAPI.deleteMessage(messageId, userId);
      console.log('Delete successful via REST API');
      
      // Then broadcast via WebSocket if connected
      if (this.isConnected && this.client) {
        const deletePayload = {
          messageId: messageId,
          userId: userId
        };
        
        this.client.publish({
          destination: '/app/chat.delete',
          body: JSON.stringify(deletePayload)
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      return false;
    }
  }

  // Event subscription methods
  onMessage(callback: (message: ChatMessageDTO) => void): void {
    this.messageCallbacks.push(callback);
  }

  onError(callback: (error: WebSocketError) => void): void {
    this.errorCallbacks.push(callback);
  }

  onConnect(callback: () => void): void {
    this.connectCallbacks.push(callback);
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }

  // Utility methods
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    this.messageCallbacks = [];
    this.errorCallbacks = [];
    this.connectCallbacks = [];
    this.disconnectCallbacks = [];
    
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
    
    if (this.client) {
      this.client.deactivate();
      this.isConnected = false;
    }
  }
}

export default new WebSocketService();