import {
    Controller,
    Get,
    Delete,
    Patch,
    Param,
    Query,
    UseGuards,
    ParseBoolPipe,
    ParseIntPipe,
    DefaultValuePipe
} from '@nestjs/common';
import { AdminChatService } from './admin-chat.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

@Controller('admin/chat')
export class AdminChatController {
    constructor(
        private readonly adminChatService: AdminChatService
    ) {
        console.log('✅ AdminChatController Initialized');
    }

    @Get('topics')
    async getAllTopics(@Query('includeDeleted', new DefaultValuePipe(false), ParseBoolPipe) includeDeleted: boolean) {
        return this.adminChatService.getAllTopics(includeDeleted);
    }

    @Delete('topics/:id/hard')
    async hardDeleteTopic(@Param('id') id: string) {
        return this.adminChatService.hardDeleteTopic(id);
    }

    @Patch('topics/:id/restore')
    async restoreTopic(@Param('id') id: string) {
        return this.adminChatService.restoreTopic(id);
    }

    @Get('discussions')
    async getAllDiscussions(@Query('includeDeleted', new DefaultValuePipe(false), ParseBoolPipe) includeDeleted: boolean) {
        return this.adminChatService.getAllDiscussions(includeDeleted);
    }

    @Delete('discussions/:id/hard')
    async hardDeleteDiscussion(@Param('id') id: string) {
        return this.adminChatService.hardDeleteDiscussion(id);
    }

    @Patch('discussions/:id/restore')
    async restoreDiscussion(@Param('id') id: string) {
        return this.adminChatService.restoreDiscussion(id);
    }

    @Get('private')
    async getPrivateChats(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
        @Query('search') search?: string
    ) {
        return this.adminChatService.getPrivateChats(page, limit, search);
    }

    @Get('messages/:chatId')
    async getChatMessages(
        @Param('chatId') chatId: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number
    ) {
        return this.adminChatService.getChatMessages(chatId, page, limit);
    }

    @Delete('messages/:id/hard')
    async hardDeleteMessage(@Param('id') id: string) {
        return this.adminChatService.hardDeleteMessage(id);
    }

    @Get('audit-logs')
    async getAuditLogs(
        @Query('entity') entity?: string,
        @Query('entityId') entityId?: string,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number
    ) {
        return this.adminChatService.getAuditLogs(entity, entityId, limit);
    }
}
