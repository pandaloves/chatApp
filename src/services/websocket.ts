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

  private setupSubscriptions(userId: number): void {
    if (!this.client) return;

    // Subscribe to public messages
    const publicSub = this.client.subscribe('/topic/public', (message: IMessage) => {
      this.handleIncomingMessage(message);
    });
    this.subscriptions.set('public', publicSub);
    
    // Subscribe to private messages for this specific user
    const privateSub = this.client.subscribe(`/user/${userId}/queue/private`, (message: IMessage) => {
      this.handleIncomingMessage(message);
    });
    this.subscriptions.set('private', privateSub);
    
    // Subscribe to message updates (edits)
    const updateSub = this.client.subscribe('/topic/updates', (message: IMessage) => {
      this.handleIncomingMessage(message);
    });
    this.subscriptions.set('updates', updateSub);
    
    // Subscribe to message deletions
    const deleteSub = this.client.subscribe('/topic/deletes', (message: IMessage) => {
      this.handleIncomingMessage(message);
    });
    this.subscriptions.set('deletes', deleteSub);
    
    // Subscribe to errors
    const errorSub = this.client.subscribe('/user/queue/errors', (message: IMessage) => {
      try {
        const error: WebSocketError = JSON.parse(message.body);
        console.error('WebSocket application error:', error);
        this.errorCallbacks.forEach(callback => callback(error));
      } catch (parseError) {
        console.error('Error parsing WebSocket error message:', parseError);
      }
    });
    this.subscriptions.set('errors', errorSub);
  }

  private handleIncomingMessage(message: IMessage): void {
    try {
      const chatMessage: ChatMessageDTO = JSON.parse(message.body);
      console.log('Received WebSocket message:', chatMessage);
      this.messageCallbacks.forEach(callback => callback(chatMessage));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
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
    // Always try REST API first for persistence
    try {
      console.log('Editing message via REST API:', { messageId, userId, newContent });
      const response = await messageAPI.editMessage(messageId, newContent, userId);
      console.log('Edit successful via REST API:', response.data);
      
      // Then broadcast via WebSocket if connected
      if (this.isConnected && this.client) {
        const editPayload = { 
          messageId, 
          userId, 
          content: newContent 
        };
        
        this.client.publish({
          destination: '/app/chat.edit',
          body: JSON.stringify(editPayload)
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to edit message:', error);
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