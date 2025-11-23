import SockJS from 'sockjs-client';
import { Client, IMessage, StompHeaders } from '@stomp/stompjs';
import {
  ChatMessageDTO,
  WebSocketError,
} from '../types';

// Define STOMP frame types if not provided by the library
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
        
        this.setupSubscriptions();
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

  private setupSubscriptions(): void {
    if (!this.client) return;

    // Subscribe to public messages
    const publicSub = this.client.subscribe('/topic/public', (message: IMessage) => {
      this.handleIncomingMessage(message);
    });
    this.subscriptions.set('public', publicSub);
    
    // Subscribe to private messages
    const privateSub = this.client.subscribe('/user/queue/private', (message: IMessage) => {
      this.handleIncomingMessage(message);
    });
    this.subscriptions.set('private', privateSub);
    
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

  editMessage(messageId: number, userId: number, newContent: string): void {
    if (this.isConnected && this.client) {
      const editPayload = {
        messageId: messageId,
        userId: userId,
        content: newContent
      };
      
      this.client.publish({
        destination: '/app/chat.edit',
        body: JSON.stringify(editPayload)
      });
    } else {
      console.warn('WebSocket not connected');
    }
  }

  deleteMessage(messageId: number, userId: number): void {
    if (this.isConnected && this.client) {
      const deletePayload = {
        messageId: messageId,
        userId: userId
      };
      
      this.client.publish({
        destination: '/app/chat.delete',
        body: JSON.stringify(deletePayload)
      });
    } else {
      console.warn('WebSocket not connected');
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