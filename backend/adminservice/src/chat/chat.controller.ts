import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { BlockUserFromGroupDto } from './dto/block-user-group.dto';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) { }

  @Get('sanity')
  sanityCheck() {
    console.log('[AdminService] 🩺 Chat sanity check hit');
    return { status: 'ok', service: 'adminservice', message: 'Chat controller is responsive' };
  }

  // Topics
  @Post('topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async createTopic(@Request() req, @Body() dto: CreateTopicDto) {
    console.log('createTopic controller - req.user:', JSON.stringify(req.user, null, 2));
    return this.chatService.createTopic(req.user.userId, dto, req.user.email);
  }

  @Get('topics')
  async getAllTopics(@Request() req) {
    // Public endpoint - no auth required to view topics
    return this.chatService.getAllTopics();
  }

  // Discussions route must come before generic topic route to avoid route conflicts
  @Get('topics/:topicId/discussions')
  async getDiscussionsByTopic(@Param('topicId') topicId: string) {
    // Public endpoint - no auth required to view discussions
    return this.chatService.getDiscussionsByTopic(topicId);
  }

  @Get('topics/:id')
  async getTopicById(@Param('id') id: string) {
    // Public endpoint - no auth required to view topic details
    return this.chatService.getTopicById(id);
  }

  @Put('topics/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async updateTopic(@Request() req, @Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.chatService.updateTopic(req.user.userId, id, dto);
  }

  @Delete('topics/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async deleteTopic(@Request() req, @Param('id') id: string) {
    return this.chatService.deleteTopic(req.user.userId, id);
  }

  // Messages
  @Post('messages')
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    try {
      // When called via HTTP API (fallback), skip broadcast to avoid duplicates
      // The WebSocket gateway handles broadcasting, so HTTP should only save
      return await this.chatService.sendMessage(
        req.user.userId,
        dto,
        req.user.email,
        req.user.role,
        req.user.username || req.user.email?.split('@')[0], // Use email prefix if username not available
        true // skipBroadcast = true for HTTP API calls
      );
    } catch (error: any) {
      // Re-throw NestJS exceptions as-is
      if (error?.status || error?.statusCode) {
        throw error;
      }
      // Wrap unexpected errors
      console.error('Unexpected error in sendMessage controller:', error);
      throw new BadRequestException(error?.message || 'Failed to send message');
    }
  }

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  async getMessages(
    @Request() req,
    @Query('topicId') topicId?: string,
    @Query('chatId') chatId?: string,
    @Query('discussionId') discussionId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(
      topicId,
      chatId,
      discussionId,
      parseInt(page || '1'),
      parseInt(limit || '50'),
    );
  }

  // Discussions
  @Post('discussions')
  @UseGuards(JwtAuthGuard)
  async createDiscussion(@Request() req, @Body() dto: CreateDiscussionDto) {
    return this.chatService.createDiscussion(req.user.userId, dto, req.user.email);
  }

  @Get('discussions/:id')
  async getDiscussionById(@Param('id') id: string) {
    // Public endpoint - no auth required to view discussion details
    return this.chatService.getDiscussionById(id);
  }

  @Put('discussions/:id')
  @UseGuards(JwtAuthGuard)
  async updateDiscussion(@Request() req, @Param('id') id: string, @Body() dto: UpdateDiscussionDto) {
    return this.chatService.updateDiscussion(req.user.userId, id, dto);
  }

  @Delete('discussions/:id')
  @UseGuards(JwtAuthGuard)
  async deleteDiscussion(@Request() req, @Param('id') id: string) {
    return this.chatService.deleteDiscussion(req.user.userId, id);
  }

  // User Blocking
  @Post('block')
  @UseGuards(JwtAuthGuard)
  async blockUser(@Request() req, @Body() dto: BlockUserDto) {
    return this.chatService.blockUser(req.user.userId, dto);
  }

  @Delete('block/:blockedId')
  @UseGuards(JwtAuthGuard)
  async unblockUser(@Request() req, @Param('blockedId') blockedId: string) {
    return this.chatService.unblockUser(req.user.userId, blockedId);
  }

  @Get('blocked')
  @UseGuards(JwtAuthGuard)
  async getBlockedUsers(@Request() req) {
    return this.chatService.getBlockedUsers(req.user.userId);
  }

  // Chats
  @Post('chats/one-to-one/:userId')
  @UseGuards(JwtAuthGuard)
  async createOneToOneChat(@Request() req, @Param('userId') userId: string) {
    return this.chatService.createOneToOneChat(
      req.user.userId,
      userId,
      req.user.email,
      req.user.role,
      req.user.username || req.user.email?.split('@')[0]
    );
  }

  @Get('chats')
  @UseGuards(JwtAuthGuard)
  async getUserChats(@Request() req) {
    return this.chatService.getUserChats(req.user.userId);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getUsersForChat(@Request() req) {
    console.log('[AdminService] 👥 getUsersForChat hit for user:', req?.user?.userId);
    return this.chatService.getUsersForChat(req.user.userId);
  }

  @Get('users/online')
  @UseGuards(JwtAuthGuard)
  async getOnlineUsers(@Request() req) {
    return this.chatService.getOnlineUsers();
  }

  // WhatsApp-like features
  @Post('messages/:messageId/read')
  @UseGuards(JwtAuthGuard)
  async markMessageRead(@Request() req, @Param('messageId') messageId: string) {
    return this.chatService.markMessageAsRead(messageId, req.user.userId);
  }

  @Post('chats/:chatId/read')
  @UseGuards(JwtAuthGuard)
  async markChatRead(@Request() req, @Param('chatId') chatId: string) {
    return this.chatService.markChatAsRead(chatId, req.user.userId);
  }

  @Post('chats/:chatId/mute')
  @UseGuards(JwtAuthGuard)
  async muteChat(@Request() req, @Param('chatId') chatId: string) {
    console.log(`[ChatController] 🤫 Mute request received for chat: ${chatId} by user: ${req.user.userId}`);
    return this.chatService.muteChat(req.user.userId, chatId);
  }

  @Post('chats/:chatId/unmute')
  @UseGuards(JwtAuthGuard)
  async unmuteChat(@Request() req, @Param('chatId') chatId: string) {
    console.log(`[ChatController] 🔊 Unmute request received for chat: ${chatId} by user: ${req.user.userId}`);
    return this.chatService.unmuteChat(req.user.userId, chatId);
  }

  @Get('users/:userId/status')
  @UseGuards(JwtAuthGuard)
  async getUserOnlineStatus(@Param('userId') userId: string) {
    return this.chatService.getUserOnlineStatus(userId);
  }

  // Admin functions
  @Put('users/:userId/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async suspendUser(@Request() req, @Param('userId') userId: string) {
    return this.chatService.suspendUser(req.user.userId, userId);
  }

  @Put('users/:userId/unsuspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async unsuspendUser(@Request() req, @Param('userId') userId: string) {
    return this.chatService.unsuspendUser(req.user.userId, userId);
  }

  // User message management
  @Put('messages/:messageId')
  @UseGuards(JwtAuthGuard)
  async editMessage(@Request() req, @Param('messageId') messageId: string, @Body('content') content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }
    return this.chatService.editMessage(req.user.userId, messageId, content);
  }

  @Delete('messages/:messageId/user')
  @UseGuards(JwtAuthGuard)
  async deleteUserMessage(@Request() req, @Param('messageId') messageId: string) {
    return this.chatService.deleteUserMessage(req.user.userId, messageId);
  }

  // Admin message management
  @Put('admin/messages/:messageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async adminEditMessage(@Request() req, @Param('messageId') messageId: string, @Body('content') content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }
    return this.chatService.adminEditMessage(req.user.userId, messageId, content);
  }

  @Delete('messages/:messageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    return this.chatService.deleteMessage(req.user.userId, messageId);
  }

  // Admin data fetching with filters
  @Get('admin/one-to-one')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getAdminOneToOneChats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.chatService.getAdminOneToOneChats(
      startDate,
      endDate,
      parseInt(page || '1'),
      parseInt(limit || '50'),
      search,
    );
  }

  @Delete('admin/chats/:chatId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async deleteOneToOneChat(@Request() req, @Param('chatId') chatId: string) {
    return this.chatService.deleteOneToOneChat(req.user.userId, chatId);
  }

  @Get('admin/topics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getAdminTopics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.chatService.getAdminTopics(startDate, endDate);
  }

  @Get('admin/discussions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getAdminDiscussions(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.chatService.getAdminDiscussions(startDate, endDate);
  }

  // Admin user blocking from group chats
  @Post('users/block-from-group')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async blockUserFromGroup(@Request() req, @Body() dto: BlockUserFromGroupDto) {
    return this.chatService.blockUserFromGroup(req.user.userId, dto.userId, dto.topicId, dto.reason);
  }

  // Reactions
  @Post('reactions')
  @UseGuards(JwtAuthGuard)
  async addReaction(@Request() req, @Body() dto: { messageId: string; emoji: string }) {
    return this.chatService.addReaction(req.user.userId, dto.messageId, dto.emoji);
  }

  @Delete('reactions/:messageId/:emoji')
  @UseGuards(JwtAuthGuard)
  async removeReaction(@Request() req, @Param('messageId') messageId: string, @Param('emoji') emoji: string) {
    return this.chatService.removeReaction(req.user.userId, messageId, emoji);
  }
}

