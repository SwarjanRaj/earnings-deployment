import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { RemoveReactionDto } from './dto/remove-reaction.dto';
import * as jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://nailartsdesign.com', 'https://www.nailartsdesign.com'],
    credentials: true,
  },
  namespace: '/chat',

})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    @InjectRedis() private readonly redis: Redis,
  ) { }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token ||
        client.handshake.query?.token as string;

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not defined');
      }

      const payload = jwt.verify(token, jwtSecret) as any;
      client.userId = payload.sub || payload.id;
      client.username = payload.username || payload.email;

      // Join user's personal room
      await client.join(`user:${client.userId}`);

      // Store online user in Redis
      await this.redis.setex(`online:${client.userId}`, 300, JSON.stringify({
        userId: client.userId,
        username: client.username,
        connectedAt: new Date().toISOString(),
      }));

      // Update user online status in database
      await this.chatService.updateUserOnlineStatus(client.userId, true);

      console.log(`[Gateway] ✅ User ${client.username} (${client.userId}) connected - Socket ID: ${client.id}`);
      console.log(`[Gateway] User joined personal room: user:${client.userId}`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove online user from Redis
      await this.redis.del(`online:${client.userId}`);

      // Update user online status in database
      await this.chatService.updateUserOnlineStatus(client.userId, false);
    }
    console.log(`User ${client.username} (${client.userId}) disconnected`);
  }

  @SubscribeMessage('join-topic')
  async handleJoinTopic(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { topicId: string },
  ) {
    if (!client.userId) {
      console.error('[Gateway] Join topic failed: Unauthorized');
      return { error: 'Unauthorized' };
    }

    const room = `topic:${data.topicId}`;
    await client.join(room);

    const roomSize = this.server?.sockets?.adapter?.rooms?.get(room)?.size || 0;
    console.log(`[Gateway] ✅ User ${client.username} (${client.userId}) joined room: ${room}`);
    console.log(`[Gateway] Room ${room} now has ${roomSize} clients`);
    console.log(`[Gateway] Socket ID: ${client.id}`);

    // Notify others in the topic
    client.to(room).emit('user-joined', {
      userId: client.userId,
      username: client.username,
      topicId: data.topicId,
    });

    return { success: true, topicId: data.topicId, roomSize };
  }

  @SubscribeMessage('leave-topic')
  async handleLeaveTopic(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { topicId: string },
  ) {
    const room = `topic:${data.topicId}`;
    client.leave(room);

    // Notify others in the topic
    client.to(room).emit('user-left', {
      userId: client.userId,
      username: client.username,
      topicId: data.topicId,
    });

    return { success: true };
  }

  @SubscribeMessage('join-chat')
  async handleJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) {
      console.error('[Gateway] Join chat failed: Unauthorized');
      return { error: 'Unauthorized' };
    }

    const room = `chat:${data.chatId}`;
    await client.join(room);

    const roomSize = this.server?.sockets?.adapter?.rooms?.get(room)?.size || 0;
    console.log(`[Gateway] ✅ User ${client.username} (${client.userId}) joined room: ${room}`);
    console.log(`[Gateway] Room ${room} now has ${roomSize} clients`);
    console.log(`[Gateway] Socket ID: ${client.id}`);

    // Notify others in the chat
    client.to(room).emit('user-joined-chat', {
      userId: client.userId,
      username: client.username,
      chatId: data.chatId,
    });

    return { success: true, chatId: data.chatId, roomSize };
  }

  @SubscribeMessage('leave-chat')
  async handleLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `chat:${data.chatId}`;
    client.leave(room);

    // Notify others in the chat
    client.to(room).emit('user-left-chat', {
      userId: client.userId,
      username: client.username,
      chatId: data.chatId,
    });

    return { success: true };
  }

  @SubscribeMessage('join-discussion')
  async handleJoinDiscussion(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { discussionId: string },
  ) {
    if (!client.userId) {
      console.error('[Gateway] Join discussion failed: Unauthorized');
      return { error: 'Unauthorized' };
    }

    const room = `discussion:${data.discussionId}`;
    await client.join(room);

    const roomSize = this.server?.sockets?.adapter?.rooms?.get(room)?.size || 0;
    console.log(`[Gateway] ✅ User ${client.username} (${client.userId}) joined room: ${room}`);
    console.log(`[Gateway] Room ${room} now has ${roomSize} clients`);
    console.log(`[Gateway] Socket ID: ${client.id}`);

    // Notify others in the discussion
    client.to(room).emit('user-joined-discussion', {
      userId: client.userId,
      username: client.username,
      discussionId: data.discussionId,
    });

    return { success: true, discussionId: data.discussionId, roomSize };
  }

  @SubscribeMessage('leave-discussion')
  async handleLeaveDiscussion(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { discussionId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const room = `discussion:${data.discussionId}`;
    client.leave(room);

    // Notify others in the discussion
    client.to(room).emit('user-left-discussion', {
      userId: client.userId,
      username: client.username,
      discussionId: data.discussionId,
    });

    return { success: true };
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessageDto,
  ) {
    if (!client.userId) {
      console.log('[Gateway] ❌ Send message failed: Unauthorized client');
      return { error: 'Unauthorized' };
    }

    console.log('[Gateway] 📨 Received send-message event:', {
      userId: client.userId,
      username: client.username,
      socketId: client.id,
      data: {
        discussionId: data.discussionId,
        topicId: data.topicId,
        chatId: data.chatId,
        contentLength: data.content?.length,
      },
      timestamp: new Date().toISOString(),
    });

    try {
      // Save message to database (skip broadcast as we'll handle it here)
      const message = await this.chatService.sendMessage(client.userId, data, undefined, undefined, undefined, true);

      // Determine room to broadcast to
      let room: string;
      if (data.discussionId) {
        room = `discussion:${data.discussionId}`;
        console.log('[Gateway] 📡 Broadcasting to discussion room:', room);
      } else if (data.topicId) {
        room = `topic:${data.topicId}`;
        console.log('[Gateway] 📡 Broadcasting to topic room:', room);
      } else if (data.chatId) {
        room = `chat:${data.chatId}`;
        console.log('[Gateway] 📡 Broadcasting to chat room:', room);
      } else {
        console.log('[Gateway] ❌ Invalid message data - no discussionId, topicId, or chatId');
        return { error: 'Invalid message data' };
      }

      // Check if server is available (adapter should always exist if server exists)
      if (!this.server) {
        console.error('[Gateway] ❌ WebSocket server not available');
        // Still return success since message was saved, just can't broadcast
        return { success: true, message, warning: 'Message saved but broadcast failed' };
      }

      // Broadcast message to all clients in the room
      // Use optional chaining to safely access adapter
      const adapter = this.server.sockets?.adapter;
      const roomSize = adapter?.rooms?.get(room)?.size || 0;
      console.log(`[Gateway] 📤 Broadcasting message to room ${room} (${roomSize} clients)`);
      console.log(`[Gateway] Message details:`, {
        id: message.id,
        userId: message.userId,
        content: message.content.substring(0, 50),
        room,
        roomSize,
        timestamp: new Date().toISOString(),
      });

      // Get all sockets in the room for logging
      const roomSockets = adapter?.rooms?.get(room);
      if (roomSockets) {
        console.log(`[Gateway] Room ${room} contains sockets:`, Array.from(roomSockets));
      } else {
        console.log(`[Gateway] ⚠️ Room ${room} not found in adapter or has no sockets`);
      }

      // Only broadcast if adapter is available
      if (adapter) {
        try {
          // Emit to all in room (including sender)
          console.log(`[Gateway] 🚀 Emitting to room: ${room}`);
          this.server.in(room).emit('new-message', message);

          // Also emit to sender's personal room as fallback
          console.log(`[Gateway] 🚀 Emitting to personal room: user:${client.userId}`);
          this.server.to(`user:${client.userId}`).emit('new-message', message);

          console.log(`[Gateway] ✅ Message broadcasted to room ${room} (${roomSize} clients should receive it)`);
        } catch (broadcastError) {
          console.error('[Gateway] ❌ Error during broadcast:', broadcastError);
          return { success: true, message, warning: 'Message saved but broadcast failed' };
        }
      } else {
        console.warn('[Gateway] ⚠️ Adapter not available, skipping broadcast (message still saved)');
      }

      return { success: true, message };
    } catch (error) {
      console.error('Error sending message:', error);
      // Return structured error response
      const errorMessage = error?.message || 'Failed to send message';
      const statusCode = error?.status || error?.statusCode || 500;
      return {
        error: errorMessage,
        statusCode,
        // Include retryAfter if it's a rate limit error
        retryAfter: error?.retryAfter,
      };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { topicId?: string; chatId?: string; discussionId?: string; isTyping: boolean },
  ) {
    if (!client.userId) {
      return;
    }

    let room: string;
    if (data.discussionId) {
      room = `discussion:${data.discussionId}`;
    } else if (data.topicId) {
      room = `topic:${data.topicId}`;
    } else if (data.chatId) {
      room = `chat:${data.chatId}`;
    } else {
      return;
    }

    // Broadcast typing indicator to others in the room
    client.to(room).emit('user-typing', {
      userId: client.userId,
      username: client.username,
      isTyping: data.isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('mark-message-read')
  async handleMarkMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const result = await this.chatService.markMessageAsRead(data.messageId, client.userId);
      return { success: true, ...result };
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { error: 'Failed to mark message as read' };
    }
  }

  @SubscribeMessage('mark-chat-read')
  async handleMarkChatRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const result = await this.chatService.markChatAsRead(data.chatId, client.userId);
      return { success: true, ...result };
    } catch (error) {
      console.error('Error marking chat as read:', error);
      return { error: 'Failed to mark chat as read' };
    }
  }

  @SubscribeMessage('add-reaction')
  async handleAddReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: AddReactionDto,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const result = await this.chatService.addReaction(client.userId, data.messageId, data.emoji);
      return { success: true, reaction: result };
    } catch (error) {
      console.error('Error adding reaction:', error);
      return { error: error.message || 'Failed to add reaction' };
    }
  }

  @SubscribeMessage('remove-reaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: RemoveReactionDto,
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const result = await this.chatService.removeReaction(client.userId, data.messageId, data.emoji);
      return { success: true, reaction: result };
    } catch (error) {
      console.error('Error removing reaction:', error);
      return { error: error.message || 'Failed to remove reaction' };
    }
  }
}

