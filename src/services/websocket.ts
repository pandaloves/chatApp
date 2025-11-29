import SockJS from 'sockjs-client';
import { Client, IMessage, StompHeaders } from '@stomp/stompjs';
import {
  ChatMessageDTO,
  WebSocketError,
} from '../types';
import { messageAPI } from './api';

/* ------------------------------------------------------------------------------ */

type StompFrame = {
  command: string;
  headers: StompHeaders;
  body?: string;
}

type WebSocketCloseEvent = {
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
  private userCallbacks: ((event: any) => void)[] = []; 

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

  onUserEvent(callback: (event: any) => void): void {
    this.userCallbacks.push(callback);
  }

  private handleUserEvent(event: any) {
    if (!event.type) return;
    this.userCallbacks.forEach(cb => cb(event));
  }

  // Utility methods
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  private setupSubscriptions(userId: number): void {
    if (!this.client) return;

    console.log('🔌 Setting up WebSocket subscriptions for user:', userId);

    // Subscribe to public messages (public messages and public deletions)
    const publicSub = this.client.subscribe('/topic/public', (message: IMessage) => {
      console.log('📨 Received message from /topic/public:', message.body);
      this.handleIncomingMessage(message);
    });
    this.subscriptions.set('public', publicSub);

    // Subscribe to user-specific messages for private messages and private deletions
    const userSub = this.client.subscribe(`/user/queue/messages`, (message: IMessage) => {
      console.log('📨 Received message from /user/queue/messages:', message.body);
      this.handleIncomingMessage(message);
    });
    this.subscriptions.set('user-messages', userSub);

    // Subscribe to user events
    const userEventSub = this.client.subscribe('/topic/users', (message: IMessage) => {
      console.log('User event received:', message.body);
      this.handleUserEvent(JSON.parse(message.body));
    });
    this.subscriptions.set("user-events", userEventSub);

    // Subscribe to errors
    const errorSub = this.client.subscribe(`/user/${userId}/queue/errors`, (message: IMessage) => {
      try {
        console.log('Received error from WebSocket:', message.body);
        const error = JSON.parse(message.body);
        this.errorCallbacks.forEach((cb) => cb(error));
      } catch (err) {
        console.error('Failed to parse WS error:', err);
      }
    });
    this.subscriptions.set('errors', errorSub);

    console.log('WebSocket subscriptions set up for user:', userId);
    console.log('- /topic/public (public messages & deletions)');
    console.log('- /user/queue/messages (private messages & deletions)');
    console.log('- /topic/users (user events)');
    console.log('- /user/' + userId + '/queue/errors (errors)');
  }

  // Add the missing handleIncomingMessage method
  private handleIncomingMessage(message: IMessage) {
    if (!message.body) return;

    try {
      const parsed: ChatMessageDTO = JSON.parse(message.body);
      console.log('WebSocket message received:', {
        type: parsed.type,
        id: parsed.id,
        content: parsed.content
      });
      
      this.messageCallbacks.forEach(cb => cb(parsed));
    } catch (err) {
      console.error('Failed to parse incoming WS message:', err, message.body);
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
    console.log('[WS-EDIT] Starting edit process:', { messageId, userId, newContent });
    
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
      
      const response = await messageAPI.editMessage(messageId, newContent, userId);
      
      console.log('[WS-EDIT] REST API edit successful:', {
        status: response.status,
        data: response.data
      });
      
      // Broadcast via WebSocket for real-time updates
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
      }
      
      return true;
      
    } catch (error: any) {
      console.error('[WS-EDIT] Edit failed:', error);
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

  disconnect(): void {
    this.messageCallbacks = [];
    this.errorCallbacks = [];
    this.connectCallbacks = [];
    this.disconnectCallbacks = [];
    this.userCallbacks = []; 
    
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