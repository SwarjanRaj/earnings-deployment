// src/users/users.controller.ts
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  me(@Req() req) {
    return req.user;
  }

  @Get('all')
  async getAllUsers() {
    // Only return safe fields
    return this.users.getAllSafe();
  }
}
