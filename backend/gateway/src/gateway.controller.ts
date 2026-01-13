import { Controller, Post, Body, Get, Patch, Put, Delete, Param, Query, Req, UploadedFile, UseInterceptors, Res, HttpStatus, HttpException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GatewayService } from './gateway.service';
import { Request, Response } from 'express';
import * as multer from 'multer';

@Controller()
export class GatewayController {
  constructor(private readonly svc: GatewayService) { }

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'gateway' };
  }

  @Get('gateway-sanity')
  async getGatewaySanity() {
    console.log('[Gateway] 🛡️ Root sanity check hit');
    return { status: 'ok', source: 'gateway-root', timestamp: new Date().toISOString() };
  }

  // --- AuthService routes ---
  @Post('api/auth/signup')
  async signup(@Body() dto: any, @Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.svc.signup(dto);
      res.status(200).send(result);
    } catch (error) {
      res.status(error.status || 500).send(error);
    }
  }

  @Post('api/auth/login')
  async login(@Body() dto: any, @Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.svc.login(dto);
      res.status(200).send(result);
    } catch (error) {
      res.status(error.status || 500).send(error);
    }
  }

  @Post('api/auth/refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    try {
      const refreshToken = req.body.refreshToken ||
        req.headers.authorization?.replace('Bearer ', '') ||
        req.cookies?.refresh;
      const result = await this.svc.refresh(refreshToken);
      res.status(200).send(result);
    } catch (error) {
      res.status(error.status || 500).send(error);
    }
  }

  @Post('api/auth/verify')
  async verify(@Body() dto: any, @Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.svc.verify(dto);
      res.status(200).send(result);
    } catch (error) {
      res.status(error.status || 500).send(error);
    }
  }

  @Post('api/auth/forgot')
  async forgot(@Body() dto: any, @Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.svc.forgot(dto);
      res.status(200).send(result);
    } catch (error) {
      res.status(error.status || 500).send(error);
    }
  }

  @Post('api/auth/reset')
  async reset(@Body() dto: any, @Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.svc.reset(dto);

      // Set authentication cookies if tokens are present
      if (result.success && result.accessToken && result.refreshId) {
        const ACCESS_TTL = 15 * 60 * 1000;           // 15 minutes
        const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

        res
          .cookie('access', result.accessToken, {
            httpOnly: true,
            maxAge: ACCESS_TTL,
            secure: false, // Allow HTTP for local development
            sameSite: 'lax',
            domain: undefined,
          })
          .cookie('refresh', result.refreshId, {
            httpOnly: true,
            maxAge: REFRESH_TTL,
            secure: false, // Allow HTTP for local development
            sameSite: 'lax',
            domain: undefined,
          })
          .cookie('csrf_refresh', result.csrf || '', {
            httpOnly: false,
            maxAge: REFRESH_TTL,
            secure: false, // Allow HTTP for local development
            sameSite: 'lax',
            domain: undefined,
          });
      }

      res.status(200).send(result);
    } catch (error) {
      res.status(error.status || 500).send(error);
    }
  }

  @Get('api/auth/oauth/google')
  async oauthGoogle(@Req() req: Request, @Res() res: Response) {
    console.log('[Gateway] 🌐 oauthGoogle hit');
    try {
      const result = await this.svc.oauthGoogle(req);
      res.status(200).send(result);
    } catch (error) {
      console.error('[Gateway] ❌ oauthGoogle error:', error);
      res.status(error.status || 500).send(error);
    }
  }

  @Get('api/auth/oauth/google/callback')
  async oauthGoogleCallback(@Query() query: any, @Req() req: Request, @Res() res: Response) {
    console.log('[Gateway] 🌐 oauthGoogleCallback hit');
    try {
      const result = await this.svc.oauthGoogleCallback(query, req);
      res.status(200).send(result);
    } catch (error) {
      console.error('[Gateway] ❌ oauthGoogleCallback error:', error);
      res.status(error.status || 500).send(error);
    }
  }

  @Get('api/users/me') usersMe(@Req() req: any) { return this.svc.usersMe(req.headers); }

  // --- AdminService routes ---
  @Get('api/admin/users') listUsers(@Query() query: any, @Req() req: Request) {
    return this.svc.listUsers(query, req.headers);
  }
  @Patch('api/admin/promote') promote(@Body('email') email: string) { return this.svc.promoteToAdmin({ email }); }
  @Post('api/admin/users/:userId/block') blockAdminUser(@Param('userId') userId: string) {
    return this.svc.blockUser(userId);
  }
  @Post('api/admin/users/:userId/unblock') unblockAdminUser(@Param('userId') userId: string) {
    return this.svc.unblockUser(userId);
  }
  @Patch('api/admin/demote') demote(@Body('email') email: string) { return this.svc.demoteToUser({ email }); }
  @Delete('api/admin/users/:id') deleteUser(@Param('id') id: string) {
    return this.svc.deleteUser(id);
  }
  @Delete('api/admin/users/bulk/delete') bulkDeleteUsers(@Body() body: { ids: string[] }) { return this.svc.bulkDeleteUsers(body.ids); }
  @Patch('api/admin/set-role') setUserRole(@Body() dto: any) { return this.svc.setUserRole(dto); }
  @Get('api/admin/login-activity') getLoginActivity(@Query('email') email: string) { return this.svc.getLoginActivity(email); }
  @Post('api/admin/sync-users') syncUsers(@Req() req: Request) { return this.svc.syncUsers(req.headers); }

  // --- StockService routes ---
  @Get('api/stock/test')
  testRoute() {
    return { message: 'Gateway is working' };
  }

  @Post('api/stock/upload-earnings-test')
  testUploadRoute(@Req() req: Request) {
    return { message: 'Test upload route reached', headers: req.headers };
  }

  @Post('api/stock/upload-earnings')
  async uploadEarningsFile(@Req() req: Request) {

    // Manual file upload handling using raw multer
    const multer = require('multer');
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
      },
    });

    return new Promise((resolve, reject) => {
      upload.single('file')(req, {} as any, async (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        const file = (req as any).file;

        if (!file) {
          reject(new Error('No file received'));
          return;
        }

        try {
          const result = await this.svc.uploadEarningsFile(file);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  @Post('api/stock/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadStockFile(@UploadedFile() file: any) { return this.svc.uploadStockFile(file); }
  @Post('api/stock/add') addStockRecord(@Body() dto: any) { return this.svc.addStockRecord(dto); }
  @Post('api/stock/bulk') bulkUpload(@Body() rows: any[]) { return this.svc.bulkUploadEarnings(rows); }
  @Post('api/stock/chunked-bulk') chunkedUpload(@Body() chunk: any[]) { return this.svc.chunkedUploadEarnings(chunk); }
  @Get('api/stock') getAllStock() { return this.svc.getAllStock(); }
  @Get('api/stock/all') getAllStockRecords() { return this.svc.getAllStock(); }
  @Get('api/stock/today') getToday() { return this.svc.getToday(); }
  @Get('api/stock/yesterday') getYesterday() { return this.svc.getYesterday(); }
  @Get('api/stock/tomorrow') getTomorrow() { return this.svc.getTomorrow(); }
  @Get('api/stock/this-week') getThisWeek() { return this.svc.getThisWeek(); }
  @Get('api/stock/next-week') getNextWeek() { return this.svc.getNextWeek(); }
  @Get('api/stock/public-preview') getPublicPreview() { return this.svc.getPublicPreview(); }
  @Get('api/stock/search') searchStock(@Query('q') query: string) { return this.svc.searchEarnings(query); }
  @Get('api/stock') getStock(@Query() query: any) { return this.svc.getPaginatedStock(query); }
  @Get('api/stock/paginated') getPaginatedStock(@Query() query: any) { return this.svc.getPaginatedStock(query); }

  // Bulk delete must come before the generic ID route to prevent conflicts
  @Delete('api/stock/bulk/delete') bulkDeleteStock(@Body() body: { ids: string[] }) { return this.svc.bulkDeleteStockRecords(body.ids); }
  @Delete('api/stock/delete-all') deleteAllStockRecords() { return this.svc.deleteAllStockRecords(); }
  @Delete('api/stock/:id') deleteStock(@Param('id') id: string) { return this.svc.deleteStockRecord(id); }
  @Patch('api/stock/:id') updateStockRecord(@Param('id') id: string, @Body() dto: any) { return this.svc.updateStockRecord(id, dto); }

  // New date range routes
  @Get('api/stock/date-range') getByDateRange(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.svc.getByDateRange(startDate, endDate);
  }
  @Get('api/stock/specific-date') getBySpecificDate(@Query('date') date: string) {
    return this.svc.getBySpecificDate(date);
  }
  @Get('api/stock/month') getByMonth(@Query('year') year: string, @Query('month') month: string) {
    return this.svc.getByMonth(parseInt(year), parseInt(month));
  }
  @Get('api/stock/quarter') getByQuarter(@Query('year') year: string, @Query('quarter') quarter: string) {
    return this.svc.getByQuarter(parseInt(year), parseInt(quarter));
  }

  // --- Chat routes (AdminService) ---
  @Get('api/chat/sanity')
  async getChatSanity() {
    console.log('[Gateway] 🛡️ Chat sanity check hit');
    return { status: 'ok', message: 'Gateway Chat proxy is active' };
  }

  @Get('api/chat/users') getUsers(@Query() query: any, @Req() req: any) {
    console.log('[Gateway] 👥 getUsers proxy hit - Query:', JSON.stringify(query));
    return this.svc.proxyToAdminService('GET', '/chat/users', query, req);
  }

  @Get('api/chat/topics') getTopics(@Query() query: any, @Req() req: any) {
    console.log('[Gateway] 📚 getTopics proxy hit');
    return this.svc.proxyToAdminService('GET', '/chat/topics', query, req);
  }
  // Discussion routes - must come before generic topic routes to avoid route conflicts
  @Get('api/chat/topics/:topicId/discussions') getDiscussionsByTopic(@Param('topicId') topicId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('GET', `/chat/topics/${topicId}/discussions`, {}, req);
  }
  @Get('api/chat/topics/:id') getTopicById(@Param('id') id: string, @Req() req: any) {
    return this.svc.proxyToAdminService('GET', `/chat/topics/${id}`, {}, req);
  }
  @Post('api/chat/topics') createTopic(@Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', '/chat/topics', dto, req);
  }
  @Put('api/chat/topics/:id') updateTopic(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('PUT', `/chat/topics/${id}`, dto, req);
  }
  @Delete('api/chat/topics/:id') deleteTopic(@Param('id') id: string, @Req() req: any) {
    return this.svc.proxyToAdminService('DELETE', `/chat/topics/${id}`, {}, req);
  }

  // Discussion routes
  @Post('api/chat/discussions') createDiscussion(@Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', '/chat/discussions', dto, req);
  }
  @Get('api/chat/discussions/:id') getDiscussionById(@Param('id') id: string, @Req() req: any) {
    return this.svc.proxyToAdminService('GET', `/chat/discussions/${id}`, {}, req);
  }
  @Put('api/chat/discussions/:id') updateDiscussion(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('PUT', `/chat/discussions/${id}`, dto, req);
  }
  @Delete('api/chat/discussions/:id') deleteDiscussion(@Param('id') id: string, @Req() req: any) {
    return this.svc.proxyToAdminService('DELETE', `/chat/discussions/${id}`, {}, req);
  }

  @Get('api/chat/messages') getMessages(@Query() query: any, @Req() req: any) {
    return this.svc.proxyToAdminService('GET', '/chat/messages', query, req);
  }
  @Post('api/chat/messages') sendMessage(@Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', '/chat/messages', dto, req);
  }
  @Get('api/chat/chats') getUserChats(@Query() query: any, @Req() req: any) {
    return this.svc.proxyToAdminService('GET', '/chat/chats', query, req);
  }
  @Post('api/chat/chats/one-to-one/:userId') createOneToOneChat(@Param('userId') userId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', `/chat/chats/one-to-one/${userId}`, {}, req);
  }
  @Post('api/chat/block') blockUser(@Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', '/chat/block', dto, req);
  }
  @Delete('api/chat/block/:blockedId') unblockUser(@Param('blockedId') blockedId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('DELETE', `/chat/block/${blockedId}`, {}, req);
  }
  @Get('api/chat/blocked') getBlockedUsers(@Req() req: any) {
    return this.svc.proxyToAdminService('GET', '/chat/blocked', {}, req);
  }
  @Put('api/chat/users/:userId/suspend') suspendUser(@Param('userId') userId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('PUT', `/chat/users/${userId}/suspend`, {}, req);
  }
  @Put('api/chat/users/:userId/unsuspend') unsuspendUser(@Param('userId') userId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('PUT', `/chat/users/${userId}/unsuspend`, {}, req);
  }
  @Delete('api/chat/messages/:messageId') deleteMessage(@Param('messageId') messageId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('DELETE', `/chat/messages/${messageId}`, {}, req);
  }
  @Post('api/chat/users/block-from-group') blockUserFromGroup(@Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', '/chat/users/block-from-group', dto, req);
  }

  // --- Message Management ---
  @Put('api/chat/messages/:messageId') editMessage(@Param('messageId') messageId: string, @Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('PUT', `/chat/messages/${messageId}`, dto, req);
  }
  @Delete('api/chat/messages/:messageId/user') deleteUserMessage(@Param('messageId') messageId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('DELETE', `/chat/messages/${messageId}/user`, {}, req);
  }

  // --- Reactions ---
  @Post('api/chat/reactions') addReaction(@Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', '/chat/reactions', dto, req);
  }
  @Delete('api/chat/reactions/:messageId/:emoji') removeReaction(@Param('messageId') messageId: string, @Param('emoji') emoji: string, @Req() req: any) {
    return this.svc.proxyToAdminService('DELETE', `/chat/reactions/${messageId}/${encodeURIComponent(emoji)}`, {}, req);
  }

  // Admin chat management routes
  @Get('api/chat/admin/topics') getAdminTopics(@Query() query: any, @Req() req: any) {
    return this.svc.proxyToAdminService('GET', '/chat/admin/topics', query, req);
  }
  @Get('api/chat/admin/discussions') getAdminDiscussions(@Query() query: any, @Req() req: any) {
    return this.svc.proxyToAdminService('GET', '/chat/admin/discussions', query, req);
  }
  @Get('api/chat/admin/one-to-one') getAdminOneToOneChats(@Query() query: any, @Req() req: any) {
    return this.svc.proxyToAdminService('GET', '/chat/admin/one-to-one', query, req);
  }
  @Put('api/chat/admin/messages/:messageId') adminEditMessage(@Param('messageId') messageId: string, @Body() dto: any, @Req() req: any) {
    return this.svc.proxyToAdminService('PUT', `/chat/admin/messages/${messageId}`, dto, req);
  }
  @Delete('api/chat/admin/chats/:chatId') deleteAdminOneToOneChat(@Param('chatId') chatId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('DELETE', `/chat/admin/chats/${chatId}`, {}, req);
  }

  // WhatsApp-like features
  @Post('api/chat/messages/:messageId/read') markMessageRead(@Param('messageId') messageId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', `/chat/messages/${messageId}/read`, {}, req);
  }
  @Post('api/chat/chats/:chatId/read') markChatRead(@Param('chatId') chatId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', `/chat/chats/${chatId}/read`, {}, req);
  }
  @Post('api/chat/chats/:chatId/mute') muteChat(@Param('chatId') chatId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', `/chat/chats/${chatId}/mute`, {}, req);
  }
  @Post('api/chat/chats/:chatId/unmute') unmuteChat(@Param('chatId') chatId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('POST', `/chat/chats/${chatId}/unmute`, {}, req);
  }
  @Get('api/chat/users/:userId/status') getUserOnlineStatus(@Param('userId') userId: string, @Req() req: any) {
    return this.svc.proxyToAdminService('GET', `/chat/users/${userId}/status`, {}, req);
  }

  @Get('api/chat/*')
  catchAllChat(@Req() req: any) {
    console.log('[Gateway] ⚠️ UNMATCHED Chat route hit:', req.method, req.url);
    throw new HttpException(`Gateway Chat Proxy: ${req.url} not matched`, HttpStatus.NOT_FOUND);
  }
}
