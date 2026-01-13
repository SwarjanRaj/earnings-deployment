import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, Inject, forwardRef, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { RemoveReactionDto } from './dto/remove-reaction.dto';
import { ChatGateway } from './chat.gateway';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { RateLimitService } from './rate-limit.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    @InjectRedis() private readonly redis: Redis,
    private readonly rateLimitService: RateLimitService,
    private readonly auditService: AuditService,
  ) { }

  // Helper method to check if role is admin (case-insensitive)
  private isAdminRole(role?: string): boolean {
    if (!role) return false;
    const normalizedRole = role.toUpperCase();
    return normalizedRole === 'ADMIN' || normalizedRole === 'SUPERADMIN' || normalizedRole === 'SUPER_ADMIN';
  }

  // Helper method to check if role is super admin (case-insensitive)
  private isSuperAdminRole(role?: string): boolean {
    if (!role) return false;
    const normalizedRole = role.toUpperCase();
    return normalizedRole === 'SUPERADMIN' || normalizedRole === 'SUPER_ADMIN';
  }

  // Helper method to auto-create user from JWT payload
  private async ensureUserExists(userId: string, userEmail?: string, userRole?: string, username?: string): Promise<void> {
    try {
      // Map role from JWT to admin-service role
      const mapRole = (role?: string): 'USER' | 'ADMIN' | 'BLOCKED' | 'SUPERADMIN' => {
        if (!role) return 'USER';
        const roleMap: { [key: string]: 'USER' | 'ADMIN' | 'BLOCKED' | 'SUPERADMIN' } = {
          'USER': 'USER',
          'ADMIN': 'ADMIN',
          'SUPERADMIN': 'SUPERADMIN',
          'SUPER_ADMIN': 'SUPERADMIN' // Handle both formats
        };
        return roleMap[role.toUpperCase()] || 'USER';
      };

      // Try to create or update user using JWT payload data
      if (userEmail) {
        await this.prisma.user.upsert({
          where: { email: userEmail },
          update: {
            id: userId, // Update ID if it changed
            username: username || userEmail.split('@')[0], // Use email prefix if no username
            role: mapRole(userRole),
            updatedAt: new Date(),
          },
          create: {
            id: userId,
            email: userEmail,
            username: username || userEmail.split('@')[0],
            role: mapRole(userRole),
            password: '', // placeholder, since we don't store passwords in admin-service
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        this.logger.log(`Auto-created/updated user ${userEmail} from JWT payload`);
      } else {
        // If no email, try to create with just ID (less ideal but better than failing)
        try {
          await this.prisma.user.create({
            data: {
              id: userId,
              email: `${userId}@temp.local`, // Temporary email
              username: `user_${userId.substring(0, 8)}`,
              role: mapRole(userRole),
              password: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          this.logger.log(`Auto-created user ${userId} with temporary email`);
        } catch (error: any) {
          // If create fails (e.g., ID already exists), try to update
          if (error?.code === 'P2002') {
            this.logger.warn(`User ${userId} already exists but couldn't be found by ID`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to auto-create user ${userId}:`, error);
      // Don't throw - let the calling method decide what to do
    }
  }

  // Topic Management
  async createTopic(userId: string, dto: CreateTopicDto, userEmail?: string) {
    // ADMIN and SUPER_ADMIN can create topics (role is checked by RolesGuard in controller)
    console.log('createTopic - userId from token:', userId, 'email:', userEmail);

    // Try to find user by ID first
    let user = await this.prisma.user.findUnique({ where: { id: userId } });

    // If not found by ID, try to find by email (in case user IDs don't match between services)
    if (!user && userEmail) {
      console.log('User not found by ID, trying to find by email:', userEmail);
      user = await this.prisma.user.findUnique({ where: { email: userEmail } });
      if (user) {
        console.log('Found user by email, using user ID:', user.id);
        userId = user.id; // Update userId to match the found user
      }
    }

    if (!user) {
      console.error('createTopic - User not found in database. userId:', userId, 'email:', userEmail);
      throw new ForbiddenException(
        `User not found in admin service database. Please sync your account by calling POST /api/admin/sync-users (Admin only) or contact an administrator.`
      );
    }
    console.log('createTopic - Found user:', { id: user.id, email: user.email, role: user.role });

    // Double-check role (ADMIN or SUPER_ADMIN/SUPERADMIN can create topics)
    if (!this.isAdminRole(user.role)) {
      throw new ForbiddenException('Only admins can create topics');
    }

    const topic = await this.prisma.topic.create({
      data: {
        title: dto.title,
        description: dto.description,
        createdBy: userId,
      },
    });

    // Create a chat for this topic
    const chat = await this.prisma.chat.create({
      data: {
        type: 'GROUP',
        topicId: topic.id,
      },
    });

    // Add creator as first member
    await this.prisma.chatMember.create({
      data: {
        chatId: chat.id,
        userId: userId,
      },
    });

    // Return topic with all relations for frontend
    return this.prisma.topic.findUnique({
      where: { id: topic.id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        chat: {
          include: {
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
          },
        },
      },
    });
  }

  async getAllTopics() {
    return this.prisma.topic.findMany({
      where: {
        isActive: true,
        deleted: false, // Only show non-deleted topics
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        chat: {
          include: {
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
            members: {
              where: { isActive: true },
              select: {
                id: true,
                userId: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        discussions: {
          where: { deleted: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            _count: {
              select: {
                messages: true,
              },
            },
          },
        },
        _count: {
          select: {
            discussions: {
              where: { deleted: false }, // Count only non-deleted discussions
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTopic(userId: string, topicId: string, dto: UpdateTopicDto) {
    // Only SUPERADMIN can update topics
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !this.isSuperAdminRole(user.role)) {
      throw new ForbiddenException('Only super admins can update topics');
    }

    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    return this.prisma.topic.update({
      where: { id: topicId },
      data: {
        title: dto.title ?? topic.title,
        description: dto.description ?? topic.description,
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        chat: {
          include: {
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteTopic(userId: string, topicId: string) {
    // Only SUPERADMIN can delete topics
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !this.isSuperAdminRole(user.role)) {
      throw new ForbiddenException('Only super admins can delete topics');
    }

    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    // Soft delete - mark as deleted
    await this.prisma.topic.update({
      where: { id: topicId },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        isActive: false, // Also mark as inactive for backward compatibility
      },
    });

    // Audit log
    await this.auditService.log(
      'DELETE_TOPIC',
      'Topic',
      topicId,
      JSON.stringify({ adminId: userId, topicTitle: topic.title }),
      userId,
    );

    return { message: 'Topic deleted successfully' };
  }

  async getTopicById(topicId: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        chat: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!topic || topic.deleted) {
      throw new NotFoundException('Topic not found');
    }

    return topic;
  }

  // Discussion Management
  async createDiscussion(userId: string, dto: CreateDiscussionDto, userEmail?: string) {
    // Admin and Users can create discussions
    let user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user && userEmail) {
      user = await this.prisma.user.findUnique({ where: { email: userEmail } });
    }

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Verify topic exists and is not deleted
    const topic = await this.prisma.topic.findUnique({
      where: { id: dto.topicId },
    });

    if (!topic || topic.deleted || !topic.isActive) {
      throw new NotFoundException('Topic not found or is inactive');
    }

    // Create discussion
    const discussion = await this.prisma.discussion.create({
      data: {
        title: dto.title,
        description: dto.description,
        topicId: dto.topicId,
        createdBy: userId,
      },
    });

    // Create a chat for this discussion
    const chat = await this.prisma.chat.create({
      data: {
        type: 'GROUP',
        discussionId: discussion.id,
      },
    });

    // Add creator as first member
    await this.prisma.chatMember.create({
      data: {
        chatId: chat.id,
        userId: userId,
      },
    });

    // Return discussion with all relations
    return this.prisma.discussion.findUnique({
      where: { id: discussion.id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        topic: {
          select: {
            id: true,
            title: true,
          },
        },
        chat: {
          include: {
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
          },
        },
      },
    });
  }

  async getDiscussionsByTopic(topicId: string) {
    // Verify topic exists and is not deleted
    const topic = await this.prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic || topic.deleted || !topic.isActive) {
      throw new NotFoundException('Topic not found or is inactive');
    }

    return this.prisma.discussion.findMany({
      where: {
        topicId,
        deleted: false, // Only show non-deleted discussions
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        chat: {
          include: {
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDiscussionById(discussionId: string) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        topic: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        chat: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!discussion || discussion.deleted) {
      throw new NotFoundException('Discussion not found');
    }

    return discussion;
  }

  async updateDiscussion(userId: string, discussionId: string, dto: UpdateDiscussionDto) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion || discussion.deleted) {
      throw new NotFoundException('Discussion not found');
    }

    // Only creator or admin can update
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (discussion.createdBy !== userId && !this.isAdminRole(user.role)) {
      throw new ForbiddenException('Only the creator or admin can update this discussion');
    }

    return this.prisma.discussion.update({
      where: { id: discussionId },
      data: {
        title: dto.title ?? discussion.title,
        description: dto.description ?? discussion.description,
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        topic: {
          select: {
            id: true,
            title: true,
          },
        },
        chat: {
          include: {
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteDiscussion(userId: string, discussionId: string) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion || discussion.deleted) {
      throw new NotFoundException('Discussion not found');
    }

    // Only creator or admin can delete
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (discussion.createdBy !== userId && !this.isAdminRole(user.role)) {
      throw new ForbiddenException('Only the creator or admin can delete this discussion');
    }

    // Soft delete
    await this.prisma.discussion.update({
      where: { id: discussionId },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log(
      'DELETE_DISCUSSION',
      'Discussion',
      discussionId,
      JSON.stringify({ userId, discussionTitle: discussion.title, topicId: discussion.topicId }),
      userId,
    );

    return { message: 'Discussion deleted successfully' };
  }

  // Message Management
  async sendMessage(userId: string, dto: SendMessageDto, userEmail?: string, userRole?: string, username?: string, skipBroadcast: boolean = false) {
    // Check if user exists
    let user = await this.prisma.user.findUnique({ where: { id: userId } });

    // If not found by ID, try by email
    if (!user && userEmail) {
      user = await this.prisma.user.findUnique({ where: { email: userEmail } });
    }

    // If still not found, auto-create from JWT payload
    if (!user) {
      this.logger.log(`User ${userId} not found, auto-creating from JWT payload...`);
      await this.ensureUserExists(userId, userEmail, userRole, username);

      // Try to find again after auto-create
      user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user && userEmail) {
        user = await this.prisma.user.findUnique({ where: { email: userEmail } });
      }

      // If still not found after auto-create attempt, throw error
      if (!user) {
        throw new ForbiddenException('User not found and could not be auto-created. Please contact an administrator.');
      }
    }

    if (user.suspended) {
      throw new ForbiddenException('Your account is suspended');
    }

    // Check rate limit before allowing message
    const rateLimitCheck = await this.rateLimitService.checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      const error = new ForbiddenException(rateLimitCheck.reason || 'Rate limit exceeded');
      // Attach retryAfter to error for WebSocket gateway
      (error as any).retryAfter = rateLimitCheck.retryAfter;
      throw error;
    }

    if (dto.discussionId) {
      // Discussion group chat message
      const discussion = await this.prisma.discussion.findUnique({
        where: { id: dto.discussionId },
        include: { chat: true },
      });

      if (!discussion || discussion.deleted) {
        throw new NotFoundException('Discussion not found');
      }

      if (!discussion.chat) {
        throw new BadRequestException('Chat not found for this discussion');
      }

      // Check if user is a member
      const member = await this.prisma.chatMember.findUnique({
        where: {
          chatId_userId: {
            chatId: discussion.chat.id,
            userId: userId,
          },
        },
      });

      if (!member || !member.isActive) {
        // Auto-join user to discussion chat
        try {
          await this.prisma.chatMember.upsert({
            where: {
              chatId_userId: {
                chatId: discussion.chat.id,
                userId: userId,
              },
            },
            update: {
              isActive: true,
              leftAt: null,
            },
            create: {
              chatId: discussion.chat.id,
              userId: userId,
            },
          });
        } catch (error: any) {
          console.error('Failed to add user to chat:', error);
          if (error?.code === 'P2003' || error?.message?.includes('Foreign key constraint')) {
            throw new BadRequestException('Your user account is not synced in the admin service. Please contact an administrator to sync your account.');
          }
          throw new BadRequestException('Failed to join chat. Please ensure your account is synced in the admin service.');
        }
      }

      let message;
      try {
        message = await this.prisma.message.create({
          data: {
            chatId: discussion.chat.id,
            discussionId: dto.discussionId,
            userId: userId,
            content: dto.content,
            replyToId: dto.replyToId,
            deliveredAt: new Date(), // Mark as delivered immediately for own messages
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            readBy: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        });
      } catch (error: any) {
        console.error('Failed to create message:', error);
        if (error?.code === 'P2003' || error?.message?.includes('Foreign key constraint')) {
          throw new BadRequestException('Your user account is not synced in the admin service. Please contact an administrator to sync your account.');
        }
        throw new BadRequestException('Failed to send message. Please try again.');
      }

      // Update chat last message time
      await this.prisma.chat.update({
        where: { id: discussion.chat.id },
        data: { lastMessageAt: new Date() },
      });

      // Emit message via socket for real-time updates
      const room = `discussion:${dto.discussionId}`;
      if (!skipBroadcast && this.chatGateway?.server?.sockets?.adapter) {
        const roomSize = this.chatGateway.server.sockets.adapter.rooms?.get(room)?.size || 0;
        console.log(`[Service] 📤 Broadcasting message to room ${room} (${roomSize} clients)`);
        this.chatGateway.server.in(room).emit('new-message', message);
        this.chatGateway.server.to(`user:${userId}`).emit('new-message', message);
        console.log(`[Service] ✅ Message broadcasted to room ${room} (${roomSize} clients should receive it)`);
      } else {
        console.error('[Service] ❌ ChatGateway server not available for broadcasting');
      }

      return message;
    } else if (dto.topicId) {
      // Group chat message
      const topic = await this.prisma.topic.findUnique({
        where: { id: dto.topicId },
        include: { chat: true },
      });

      if (!topic) {
        throw new NotFoundException('Topic not found');
      }

      if (!topic.chat) {
        throw new BadRequestException('Chat not found for this topic');
      }

      // Check if user is a member
      const member = await this.prisma.chatMember.findUnique({
        where: {
          chatId_userId: {
            chatId: topic.chat.id,
            userId: userId,
          },
        },
      });

      if (!member || !member.isActive) {
        // Auto-join user to topic chat
        try {
          await this.prisma.chatMember.upsert({
            where: {
              chatId_userId: {
                chatId: topic.chat.id,
                userId: userId,
              },
            },
            update: {
              isActive: true,
              leftAt: null,
            },
            create: {
              chatId: topic.chat.id,
              userId: userId,
            },
          });
        } catch (error: any) {
          console.error('Failed to add user to chat:', error);
          // Check if it's a foreign key constraint error
          if (error?.code === 'P2003' || error?.message?.includes('Foreign key constraint')) {
            throw new BadRequestException('Your user account is not synced in the admin service. Please contact an administrator to sync your account.');
          }
          throw new BadRequestException('Failed to join chat. Please ensure your account is synced in the admin service.');
        }
      }

      let message;
      try {
        message = await this.prisma.message.create({
          data: {
            chatId: topic.chat.id,
            topicId: dto.topicId,
            userId: userId,
            content: dto.content,
            replyToId: dto.replyToId,
            deliveredAt: new Date(), // Mark as delivered immediately for own messages
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
            readBy: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        });
      } catch (error: any) {
        console.error('Failed to create message:', error);
        // Check if it's a foreign key constraint error
        if (error?.code === 'P2003' || error?.message?.includes('Foreign key constraint')) {
          throw new BadRequestException('Your user account is not synced in the admin service. Please contact an administrator to sync your account.');
        }
        throw new BadRequestException('Failed to send message. Please try again.');
      }

      // Update chat last message time
      await this.prisma.chat.update({
        where: { id: topic.chat.id },
        data: { lastMessageAt: new Date() },
      });

      // Emit message via socket for real-time updates
      // Note: Broadcasting is handled by the WebSocket gateway to avoid duplicates
      // Only broadcast here if called directly (not via gateway)
      const room = `topic:${dto.topicId}`;
      if (!skipBroadcast && this.chatGateway?.server?.sockets?.adapter) {
        const roomSize = this.chatGateway.server.sockets.adapter.rooms?.get(room)?.size || 0;
        console.log(`[Service] 📤 Broadcasting message to room ${room} (${roomSize} clients)`);
        console.log(`[Service] Message details:`, {
          id: message.id,
          userId: message.userId,
          content: message.content.substring(0, 50),
          room,
          roomSize,
        });

        // Get all sockets in the room for logging
        const roomSockets = this.chatGateway.server.sockets.adapter.rooms?.get(room);
        if (roomSockets) {
          console.log(`[Service] Room ${room} contains sockets:`, Array.from(roomSockets));
        }

        // Broadcast to all clients in the room (including sender)
        // Use .in() which is equivalent to .to() but more explicit
        this.chatGateway.server.in(room).emit('new-message', message);

        // Also emit to sender's personal room as fallback (if they're not in the main room)
        // This ensures the sender always receives their message
        this.chatGateway.server.to(`user:${userId}`).emit('new-message', message);

        console.log(`[Service] ✅ Message broadcasted to room ${room} (${roomSize} clients should receive it)`);
      } else {
        console.error('[Service] ❌ ChatGateway server not available for broadcasting');
      }

      return message;
    } else if (dto.chatId) {
      // One-to-one or existing chat
      const chat = await this.prisma.chat.findUnique({
        where: { id: dto.chatId },
      });

      if (!chat) {
        throw new NotFoundException('Chat not found');
      }

      // Check if user is a member
      const member = await this.prisma.chatMember.findUnique({
        where: {
          chatId_userId: {
            chatId: dto.chatId,
            userId: userId,
          },
        },
      });

      if (!member || !member.isActive) {
        throw new ForbiddenException('You are not a member of this chat');
      }

      const message = await this.prisma.message.create({
        data: {
          chatId: dto.chatId,
          userId: userId,
          content: dto.content,
          replyToId: dto.replyToId,
          deliveredAt: new Date(), // Mark as delivered immediately for own messages
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          readBy: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      // Update chat last message time
      await this.prisma.chat.update({
        where: { id: dto.chatId },
        data: { lastMessageAt: new Date() },
      });

      // Emit message via socket for real-time updates
      // Note: Broadcasting is handled by the WebSocket gateway to avoid duplicates
      // Only broadcast here if called directly (not via gateway)
      const room = `chat:${dto.chatId}`;
      if (!skipBroadcast && this.chatGateway?.server?.sockets?.adapter) {
        const roomSize = this.chatGateway.server.sockets.adapter.rooms?.get(room)?.size || 0;
        console.log(`[Service] 📤 Broadcasting message to room ${room} (${roomSize} clients)`);
        console.log(`[Service] Message details:`, {
          id: message.id,
          userId: message.userId,
          content: message.content.substring(0, 50),
          room,
          roomSize,
        });

        // Get all sockets in the room for logging
        const roomSockets = this.chatGateway.server.sockets.adapter.rooms?.get(room);
        if (roomSockets) {
          console.log(`[Service] Room ${room} contains sockets:`, Array.from(roomSockets));
        }

        // Broadcast to all clients in the room (including sender)
        // Use .in() which is equivalent to .to() but more explicit
        this.chatGateway.server.in(room).emit('new-message', message);

        // Also emit to sender's personal room as fallback (if they're not in the main room)
        // This ensures the sender always receives their message
        this.chatGateway.server.to(`user:${userId}`).emit('new-message', message);

        console.log(`[Service] ✅ Message broadcasted to room ${room} (${roomSize} clients should receive it)`);
      } else {
        console.error('[Service] ❌ ChatGateway server not available for broadcasting');
      }

      return message;
    } else {
      throw new BadRequestException('Either discussionId, topicId, or chatId must be provided');
    }
  }

  async getMessages(topicId?: string, chatId?: string, discussionId?: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (discussionId) {
      where.discussionId = discussionId;
    } else if (topicId) {
      where.topicId = topicId;
    } else if (chatId) {
      where.chatId = chatId;
    } else {
      throw new BadRequestException('Either discussionId, topicId, or chatId must be provided');
    }

    where.deleted = false;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.message.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        pageSize: limit, // Alias for frontend compatibility
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // User Blocking
  async blockUser(blockerId: string, dto: BlockUserDto) {
    if (blockerId === dto.blockedId) {
      throw new BadRequestException('Cannot block yourself');
    }

    // Check if already blocked
    const existing = await this.prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: dto.blockedId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already blocked');
    }

    return this.prisma.userBlock.create({
      data: {
        blockerId,
        blockedId: dto.blockedId,
        reason: dto.reason,
      },
    });
  }

  async unblockUser(blockerId: string, blockedId: string) {
    return this.prisma.userBlock.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });
  }

  async getBlockedUsers(userId: string) {
    return this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  // Check if user is blocked
  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });
    return !!block;
  }

  // Create one-to-one chat
  async createOneToOneChat(
    userId1: string,
    userId2: string,
    user1Email?: string,
    user1Role?: string,
    user1Username?: string
  ) {
    // Ensure both users exist in the database
    try {
      await this.ensureUserExists(userId1, user1Email, user1Role, user1Username);
      const user1Check = await this.prisma.user.findUnique({ where: { id: userId1 } });
      if (!user1Check) {
        throw new Error(`Failed to ensure User 1 (${userId1}) exists`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring user 1 exists: ${error.message}`);
      throw new InternalServerErrorException(`Failed to synchronize admin user: ${error.message}`);
    }

    // Try to get user2 info from database, if not found we'll create a basic entry
    let user2 = await this.prisma.user.findUnique({ where: { id: userId2 } });
    if (!user2) {
      this.logger.log(`User ${userId2} not found, creating basic entry...`);
      await this.ensureUserExists(userId2);
      user2 = await this.prisma.user.findUnique({ where: { id: userId2 } });

      if (!user2) {
        throw new NotFoundException(`User ${userId2} not found and could not be created despite sync attempt`);
      }
    }

    // Check if chat already exists
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        type: 'ONE_TO_ONE',
        members: {
          every: {
            userId: {
              in: [userId1, userId2],
            },
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (existingChat && existingChat.members.length === 2) {
      return existingChat;
    }

    // Check if users are blocked
    const isBlocked1 = await this.isUserBlocked(userId1, userId2);
    const isBlocked2 = await this.isUserBlocked(userId2, userId1);

    if (isBlocked1 || isBlocked2) {
      throw new ForbiddenException('Cannot create chat with blocked user');
    }

    const chat = await this.prisma.chat.create({
      data: {
        type: 'ONE_TO_ONE',
        members: {
          create: [
            { userId: userId1 },
            { userId: userId2 },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return chat;
  }

  // Get user chats
  async getUserChats(userId: string) {
    return this.prisma.chat.findMany({
      where: {
        members: {
          some: {
            userId: userId,
            isActive: true,
          },
        },
      },
      include: {
        topic: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        members: {
          where: {
            userId: { not: userId },
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  // Get all users for chatting (excluding current user and blocked users)
  async getUsersForChat(userId: string) {
    // Get blocked user IDs (both ways)
    const blockedByMe = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blockedMe = await this.prisma.userBlock.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    });

    const blockedIds = [
      ...blockedByMe.map(b => b.blockedId),
      ...blockedMe.map(b => b.blockerId),
      userId, // Exclude current user
    ];

    // Get all users excluding blocked ones and current user
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: blockedIds },
        suspended: false, // Exclude suspended users
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { username: 'asc' },
    });

    // Check existing chats with each user
    const usersWithChatStatus = await Promise.all(
      users.map(async (user) => {
        const existingChat = await this.prisma.chat.findFirst({
          where: {
            type: 'ONE_TO_ONE',
            members: {
              every: {
                userId: { in: [userId, user.id] },
              },
            },
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        return {
          ...user,
          existingChatId: existingChat?.id || null,
          hasExistingChat: !!existingChat,
        };
      })
    );

    return usersWithChatStatus;
  }

  // Mark message as read
  async markMessageAsRead(messageId: string, userId: string) {
    // Check if message exists and user is not the sender
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { userId: true, id: true, readBy: { select: { userId: true } } },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.userId === userId) {
      // User is the sender, don't mark as read
      return;
    }

    // Check if already read
    const alreadyRead = message.readBy.some(read => read.userId === userId);
    if (alreadyRead) {
      return;
    }

    // Mark as read
    await this.prisma.messageRead.create({
      data: {
        messageId,
        userId,
      },
    });

    // Emit read receipt via socket
    if (this.chatGateway?.server) {
      // Notify the sender that their message was read
      this.chatGateway.server.to(`user:${message.userId}`).emit('message-read', {
        messageId,
        readBy: userId,
        readAt: new Date().toISOString(),
      });
    }

    return { messageId, readBy: userId };
  }

  // Mark all messages in a chat as read for a user
  async markChatAsRead(chatId: string, userId: string) {
    // Get all unread messages in the chat (not sent by user)
    const unreadMessages = await this.prisma.message.findMany({
      where: {
        OR: [
          { chatId },
          { topicId: chatId }, // For topic chats
          { discussionId: chatId }, // For discussion chats
        ],
        userId: { not: userId }, // Messages not sent by this user
        deleted: false,
        readBy: {
          none: {
            userId,
          },
        },
      },
      select: { id: true },
    });

    if (unreadMessages.length === 0) {
      return { markedCount: 0 };
    }

    // Mark all as read
    const readData = unreadMessages.map(msg => ({
      messageId: msg.id,
      userId,
    }));

    await this.prisma.messageRead.createMany({
      data: readData,
      skipDuplicates: true,
    });

    // Emit read receipts for all messages
    if (this.chatGateway?.server) {
      unreadMessages.forEach(message => {
        this.chatGateway!.server!.to(`user:${userId}`).emit('message-read', {
          messageId: message.id,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      });
    }

    return { markedCount: unreadMessages.length };
  }

  // Update user online status
  async updateUserOnlineStatus(userId: string, isOnline: boolean) {
    try {
      const updateData: any = {
        isOnline,
      };

      if (isOnline) {
        updateData.lastSeen = null; // Clear last seen when coming online
      } else {
        updateData.lastSeen = new Date(); // Set last seen when going offline
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, isOnline: true, lastSeen: true },
      });

      // Broadcast online status change
      if (this.chatGateway?.server) {
        this.chatGateway.server.emit('user-status-changed', {
          userId,
          isOnline,
          lastSeen: updatedUser.lastSeen,
        });
      }

      return updatedUser;
    } catch (error) {
      this.logger.warn(`Failed to update online status for user ${userId}: ${error.message}`);
      return null;
    }
  }

  // Get online users
  async getOnlineUsers(): Promise<string[]> {
    try {
      const keys = await this.redis.keys('online:*');
      return keys.map(key => key.replace('online:', ''));
    } catch (error) {
      this.logger.error('Error getting online users:', error);
      return [];
    }
  }

  // Get user online status
  async getUserOnlineStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isOnline: true, lastSeen: true },
    });

    if (!user) {
      // throw new NotFoundException('User not found');
      // Return default offline status instead of error to prevent frontend polling noise
      return { id: userId, isOnline: false, lastSeen: null };
    }

    return user;
  }

  // Suspend user (admin only)
  async suspendUser(adminId: string, userId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new ForbiddenException('Admin not found');
    }

    // Check if admin or super admin (role is checked by RolesGuard in controller)
    if (!this.isAdminRole(admin.role)) {
      throw new ForbiddenException('Only admins can suspend users');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { suspended: true },
    });

    // Audit log
    await this.auditService.log(
      'SUSPEND_USER',
      'User',
      userId,
      JSON.stringify({ adminId, adminEmail: admin.email, targetEmail: targetUser.email }),
      adminId,
    );

    return updatedUser;
  }

  // Unsuspend user (admin only)
  async unsuspendUser(adminId: string, userId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new ForbiddenException('Admin not found');
    }

    // Check if admin or super admin (role is checked by RolesGuard in controller)
    if (!this.isAdminRole(admin.role)) {
      throw new ForbiddenException('Only admins can unsuspend users');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { suspended: false },
    });

    // Audit log
    await this.auditService.log(
      'UNSUSPEND_USER',
      'User',
      userId,
      JSON.stringify({ adminId, adminEmail: admin.email }),
      adminId,
    );


    return updatedUser;
  }

  /**
   * Edit a message (user can edit their own messages within 15 minutes)
   * @param userId User ID
   * @param messageId Message ID to edit
   * @param newContent New message content
   * @returns Updated message
   */
  async editMessage(userId: string, messageId: string, newContent: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.suspended) {
      throw new ForbiddenException('Your account is suspended');
    }

    // Get the message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          select: { type: true, topicId: true, discussionId: true },
        },
      },
    });

    if (!message || message.deleted) {
      throw new NotFoundException('Message not found');
    }

    // Only message owner can edit
    if (message.userId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Check if message is within edit time limit (15 minutes)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes
    if (messageAge > editTimeLimit) {
      throw new ForbiddenException('Messages can only be edited within 15 minutes of sending');
    }

    // Update the message
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        edited: true,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        readBy: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Emit socket event to notify clients that message was edited
    if (this.chatGateway?.server) {
      let room: string;
      if (message.discussionId) {
        room = `discussion:${message.discussionId}`;
      } else if (message.topicId) {
        room = `topic:${message.topicId}`;
      } else if (message.chatId) {
        room = `chat:${message.chatId}`;
      }

      if (room) {
        this.chatGateway.server.in(room).emit('message-edited', updatedMessage);
      }
    }

    this.logger.log(`User ${userId} edited message ${messageId}`);

    return updatedMessage;
  }

  /**
   * Delete a message (user can delete their own messages within 1 hour)
   * @param userId User ID
   * @param messageId Message ID to delete
   * @returns Deleted message
   */
  async deleteUserMessage(userId: string, messageId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.suspended) {
      throw new ForbiddenException('Your account is suspended');
    }

    // Get the message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          select: { type: true, topicId: true, discussionId: true },
        },
      },
    });

    if (!message || message.deleted) {
      throw new NotFoundException('Message not found');
    }

    // Only message owner can delete (or admins via separate endpoint)
    if (message.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Check if message is within delete time limit (1 hour)
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const deleteTimeLimit = 60 * 60 * 1000; // 1 hour
    if (messageAge > deleteTimeLimit) {
      throw new ForbiddenException('Messages can only be deleted within 1 hour of sending');
    }

    // Soft delete the message
    const deletedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Emit socket event to notify clients that message was deleted
    if (this.chatGateway?.server) {
      let room: string;
      if (message.discussionId) {
        room = `discussion:${message.discussionId}`;
      } else if (message.topicId) {
        room = `topic:${message.topicId}`;
      } else if (message.chatId) {
        room = `chat:${message.chatId}`;
      }

      if (room) {
        this.chatGateway.server.in(room).emit('message-deleted', {
          messageId,
          deletedBy: userId,
          deletedAt: deletedMessage.deletedAt,
        });
      }
    }

    this.logger.log(`User ${userId} deleted message ${messageId}`);

    return deletedMessage;
  }

  /**
   * Delete a message (admin only, group chat only)
   * @param adminId Admin user ID
   * @param messageId Message ID to delete
   * @returns Deleted message
   */
  async deleteMessage(adminId: string, messageId: string) {

    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new ForbiddenException('Admin not found');
    }

    // Check if admin or super admin
    if (!this.isAdminRole(admin.role)) {
      throw new ForbiddenException('Only admins can delete messages');
    }

    // Get the message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          select: { type: true, topicId: true },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Restrictions removed: Admins can moderate ANY chat type (including private messages)
    // if (!message.topicId || !message.chat || message.chat.type !== 'GROUP') {
    //   throw new ForbiddenException('Only group chat messages can be deleted by admins. Private messages cannot be moderated.');
    // }

    // Soft delete the message
    const deletedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: adminId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Audit log
    await this.auditService.log(
      'DELETE_MESSAGE',
      'Message',
      messageId,
      JSON.stringify({
        adminId,
        adminEmail: admin.email,
        messageUserId: message.userId,
        topicId: message.topicId,
        chatId: message.chatId,
        contentPreview: message.content.substring(0, 100),
      }),
      adminId,
    );

    // Emit socket event to notify clients that message was deleted
    if (this.chatGateway?.server) {
      const room = `topic:${message.topicId}`;
      this.chatGateway.server.in(room).emit('message-deleted', {
        messageId,
        deletedBy: adminId,
        deletedAt: deletedMessage.deletedAt,
      });
    }

    this.logger.log(`Admin ${adminId} deleted message ${messageId} from topic ${message.topicId}`);

    return { message: 'Message deleted successfully' };
  }

  /**
   * Admin edit message (bypasses time limits and ownership checks)
   * @param adminId Admin user ID
   * @param messageId Message ID to edit
   * @param newContent New message content
   * @returns Updated message
   */
  async adminEditMessage(adminId: string, messageId: string, newContent: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || !this.isSuperAdminRole(admin.role)) {
      throw new ForbiddenException('Only super admins can edit any message');
    }

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          select: { type: true, topicId: true, discussionId: true },
        },
      },
    });

    if (!message || message.deleted) {
      throw new NotFoundException('Message not found');
    }

    // Update the message (no time limit or ownership check for admin)
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        edited: true,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        readBy: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Emit socket event
    if (this.chatGateway?.server) {
      let room: string;
      if (message.discussionId) {
        room = `discussion:${message.discussionId}`;
      } else if (message.topicId) {
        room = `topic:${message.topicId}`;
      } else if (message.chatId) {
        room = `chat:${message.chatId}`;
      }

      if (room) {
        this.chatGateway.server.in(room).emit('message-edited', updatedMessage);
      }
    }

    this.logger.log(`Admin ${adminId} edited message ${messageId}`);

    return updatedMessage;
  }

  /**
   * Get all one-to-one chats with optional date filtering and search (admin only)
   */
  async getAdminOneToOneChats(startDate?: string, endDate?: string, page: number = 1, limit: number = 50, search?: string) {
    const where: any = {
      type: 'ONE_TO_ONE',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.members = {
        some: {
          user: {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { id: { equals: search } }, // Exact match for ID
            ],
          },
        },
      };
    }

    const [chats, total] = await Promise.all([
      this.prisma.chat.findMany({
        where,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.chat.count({ where }),
    ]);



    return {
      data: chats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete a one-to-one chat and all its messages (admin only)
   */
  async deleteOneToOneChat(adminId: string, chatId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin || !this.isAdminRole(admin.role)) {
      throw new ForbiddenException('Only admins can delete chats');
    }

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.type !== 'ONE_TO_ONE') {
      throw new BadRequestException('This endpoint is only for one-to-one chats');
    }

    // Use a transaction to ensure all related data is deleted
    await this.prisma.$transaction(async (prisma) => {
      // 1. Delete all message read receipts
      await prisma.messageRead.deleteMany({
        where: {
          message: {
            chatId: chatId
          }
        }
      });

      // 2. Delete all messages
      await prisma.message.deleteMany({
        where: { chatId }
      });

      // 3. Delete chat members
      await prisma.chatMember.deleteMany({
        where: { chatId }
      });

      // 4. Delete the chat itself
      await prisma.chat.delete({
        where: { id: chatId }
      });
    });

    this.logger.log(`Admin ${adminId} deleted chat ${chatId}`);
    return { success: true, message: 'Chat deleted successfully' };
  }

  /**
   * Get all topics with optional date filtering (admin only)
   */
  async getAdminTopics(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    return this.prisma.topic.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        chat: {
          include: {
            _count: {
              select: {
                members: true,
                messages: true,
              },
            },
          },
        },
        _count: {
          select: {
            discussions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all discussions with optional date filtering (admin only)
   */
  async getAdminDiscussions(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    return this.prisma.discussion.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        topic: {
          select: {
            id: true,
            title: true,
          },
        },
        chat: {
          include: {
            _count: {
              select: {
                messages: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Block user from group chat (admin only)
   * This is different from suspend - it blocks the user from a specific topic/group
   * @param adminId Admin user ID
   * @param userId User ID to block
   * @param topicId Topic ID (optional, if not provided, blocks from all topics)
   * @param reason Reason for blocking
   */
  async blockUserFromGroup(adminId: string, userId: string, topicId?: string, reason?: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new ForbiddenException('Admin not found');
    }

    // Check if admin or super admin
    if (!this.isAdminRole(admin.role)) {
      throw new ForbiddenException('Only admins can block users from group chats');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Don't allow blocking admins
    if (this.isAdminRole(targetUser.role)) {
      throw new ForbiddenException('Cannot block admin users');
    }

    let result: any;

    if (topicId) {
      // Block from specific topic
      const topic = await this.prisma.topic.findUnique({
        where: { id: topicId },
        include: { chat: true },
      });

      if (!topic || !topic.chat) {
        throw new NotFoundException('Topic or chat not found');
      }

      // Remove user from chat members (deactivate membership)
      await this.prisma.chatMember.updateMany({
        where: {
          chatId: topic.chat.id,
          userId: userId,
        },
        data: {
          isActive: false,
          leftAt: new Date(),
        },
      });

      result = { userId, topicId, blocked: true };
    } else {
      // Block from all group chats (suspend user)
      await this.prisma.user.update({
        where: { id: userId },
        data: { suspended: true },
      });

      result = { userId, blocked: true, suspended: true };
    }

    // Audit log
    await this.auditService.log(
      'BLOCK_USER_FROM_GROUP',
      'User',
      userId,
      JSON.stringify({
        adminId,
        adminEmail: admin.email,
        topicId: topicId || 'ALL_TOPICS',
        reason: reason || 'No reason provided',
      }),
      adminId,
    );

    this.logger.log(`Admin ${adminId} blocked user ${userId} from ${topicId || 'all group chats'}`);

    return result;
  }

  // Reaction Management
  async addReaction(userId: string, messageId: string, emoji: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if message exists and is not deleted
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { user: true }
    });

    if (!message || message.deleted) {
      throw new NotFoundException('Message not found');
    }

    // Check if user already reacted with this emoji
    const existingReaction = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existingReaction) {
      throw new BadRequestException('You have already reacted with this emoji');
    }

    // Create reaction
    const reaction = await this.prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Emit socket event for real-time updates
    if (this.chatGateway?.server) {
      let room: string;
      if (message.discussionId) {
        room = `discussion:${message.discussionId}`;
      } else if (message.topicId) {
        room = `topic:${message.topicId}`;
      } else if (message.chatId) {
        room = `chat:${message.chatId}`;
      } else {
        return reaction; // No room to broadcast to
      }

      this.chatGateway.server.in(room).emit('reaction-added', {
        messageId,
        reaction: {
          emoji,
          userId,
          username: reaction.user.username,
          createdAt: reaction.createdAt,
        },
      });
    }

    return reaction;
  }

  async removeReaction(userId: string, messageId: string, emoji: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if message exists
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Find and delete the reaction
    const reaction = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prisma.messageReaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    // Emit socket event for real-time updates
    if (this.chatGateway?.server) {
      let room: string;
      if (message.discussionId) {
        room = `discussion:${message.discussionId}`;
      } else if (message.topicId) {
        room = `topic:${message.topicId}`;
      } else if (message.chatId) {
        room = `chat:${message.chatId}`;
      } else {
        return { messageId, emoji, userId };
      }

      this.chatGateway.server.in(room).emit('reaction-removed', {
        messageId,
        reaction: {
          emoji,
          userId,
          username: user.username,
        },
      });
    }

    return { messageId, emoji, userId };
  }

  async getMessageReactions(messageId: string) {
    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group reactions by emoji
    const groupedReactions: { [emoji: string]: { users: string[], count: number } } = {};

    reactions.forEach(reaction => {
      if (!groupedReactions[reaction.emoji]) {
        groupedReactions[reaction.emoji] = { users: [], count: 0 };
      }
      groupedReactions[reaction.emoji].users.push(reaction.user.username);
      groupedReactions[reaction.emoji].count++;
    });

    return groupedReactions;
  }

  // Mute/Unmute Chat
  async muteChat(userId: string, chatId: string) {
    const chatMember = await this.prisma.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });

    if (!chatMember) {
      throw new NotFoundException('Chat member not found');
    }

    const updatedMember = await this.prisma.chatMember.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        isMuted: true,
      } as any,
    });

    return updatedMember;
  }

  async unmuteChat(userId: string, chatId: string) {
    const chatMember = await this.prisma.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });

    if (!chatMember) {
      throw new NotFoundException('Chat member not found');
    }

    const updatedMember = await this.prisma.chatMember.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        isMuted: false,
      } as any,
    });

    return updatedMember;
  }
}

