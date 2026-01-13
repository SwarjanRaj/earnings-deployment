import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatType } from '@prisma/client';

@Injectable()
export class AdminChatService {
    constructor(private prisma: PrismaService) { }

    // Topics
    async getAllTopics(includeDeleted: boolean = false) {
        return this.prisma.topic.findMany({
            where: includeDeleted ? {} : { deleted: false },
            include: {
                creator: { select: { id: true, username: true, email: true } },
                chat: {
                    include: {
                        _count: { select: { members: true, messages: true } }
                    }
                },
                _count: { select: { discussions: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async hardDeleteTopic(id: string) {
        const topic = await this.prisma.topic.findUnique({ where: { id } });
        if (!topic) throw new NotFoundException('Topic not found');

        // Hard delete cascading is handled by Prisma schema usually, but explicit is safer for logs
        // However, Prisma @relation(onDelete: Cascade) handles it.
        await this.prisma.topic.delete({ where: { id } });

        await this.logAction('HARD_DELETE', 'Topic', id, `Hard deleted topic: ${topic.title}`);
        return { success: true, message: 'Topic permanently deleted' };
    }

    async restoreTopic(id: string) {
        const topic = await this.prisma.topic.findUnique({ where: { id } });
        if (!topic) throw new NotFoundException('Topic not found');

        await this.prisma.topic.update({
            where: { id },
            data: { deleted: false, deletedAt: null, deletedBy: null, isActive: true }
        });

        await this.logAction('RESTORE', 'Topic', id, `Restored topic: ${topic.title}`);
        return { success: true, message: 'Topic restored successfully' };
    }

    // Discussions
    async getAllDiscussions(includeDeleted: boolean = false) {
        return this.prisma.discussion.findMany({
            where: includeDeleted ? {} : { deleted: false },
            include: {
                creator: { select: { id: true, username: true, email: true } },
                topic: { select: { id: true, title: true } },
                chat: {
                    include: {
                        _count: { select: { members: true, messages: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async hardDeleteDiscussion(id: string) {
        const discussion = await this.prisma.discussion.findUnique({ where: { id } });
        if (!discussion) throw new NotFoundException('Discussion not found');

        await this.prisma.discussion.delete({ where: { id } });

        await this.logAction('HARD_DELETE', 'Discussion', id, `Hard deleted discussion: ${discussion.title}`);
        return { success: true, message: 'Discussion permanently deleted' };
    }

    async restoreDiscussion(id: string) {
        const discussion = await this.prisma.discussion.findUnique({ where: { id } });
        if (!discussion) throw new NotFoundException('Discussion not found');

        await this.prisma.discussion.update({
            where: { id },
            data: { deleted: false, deletedAt: null, deletedBy: null }
        });

        await this.logAction('RESTORE', 'Discussion', id, `Restored discussion: ${discussion.title}`);
        return { success: true, message: 'Discussion restored successfully' };
    }

    // Private Chats (One-to-One)
    async getPrivateChats(page: number = 1, limit: number = 20, search?: string) {
        const skip = (page - 1) * limit;

        const where: any = { type: ChatType.ONE_TO_ONE };

        if (search) {
            where.members = {
                some: {
                    user: {
                        OR: [
                            { username: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                }
            };
        }

        const [total, chats] = await this.prisma.$transaction([
            this.prisma.chat.count({ where }),
            this.prisma.chat.findMany({
                where,
                skip,
                take: limit,
                include: {
                    members: {
                        include: {
                            user: { select: { id: true, username: true, email: true, isOnline: true } }
                        }
                    },
                    _count: { select: { messages: true } }
                },
                orderBy: { updatedAt: 'desc' }
            })
        ]);

        return {
            data: chats,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // Messages
    async getChatMessages(chatId: string, page: number = 1, limit: number = 50) {
        const skip = (page - 1) * limit;

        // Admin sees ALL messages, including deleted/soft-deleted
        const [total, messages] = await this.prisma.$transaction([
            this.prisma.message.count({ where: { chatId } }),
            this.prisma.message.findMany({
                where: { chatId },
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, username: true, email: true } },
                    readBy: {
                        include: {
                            user: { select: { id: true, username: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return {
            data: messages.reverse(), // Return in chronological order
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    async hardDeleteMessage(id: string) {
        const message = await this.prisma.message.findUnique({ where: { id } });
        if (!message) throw new NotFoundException('Message not found');

        await this.prisma.message.delete({ where: { id } });

        await this.logAction('HARD_DELETE', 'Message', id, `Hard deleted message from user ${message.userId}`);
        return { success: true };
    }

    // Audit Logs
    async getAuditLogs(entity?: string, entityId?: string, limit: number = 50) {
        const where: any = {};
        if (entity) where.entity = entity;
        if (entityId) where.entityId = entityId;

        return this.prisma.auditLog.findMany({
            where,
            take: limit,
            orderBy: { timestamp: 'desc' }
        });
    }

    private async logAction(action: string, entity: string, entityId: string, details?: string) {
        await this.prisma.auditLog.create({
            data: {
                action,
                entity,
                entityId,
                details,
                // userId: TODO: Inject current admin ID if available in service context, 
                // usually passed from controller. For now, we'll keep it simple.
            }
        });
    }
}
