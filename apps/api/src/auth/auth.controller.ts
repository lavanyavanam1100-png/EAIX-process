import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('roleCode') roleCode: string,
    @Body('password') password: string,
  ) {
    if (!username || !roleCode || !password) {
      throw new BadRequestException(
        'username, roleCode, and password are required',
      );
    }

    try {
      return await this.authService.login({
        username,
        roleCode,
        password,
      });
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get('profile')
  async profile(@Query('username') username?: string) {
    return this.authService.profile(username);
  }

  @Get('validate-role')
  async validateRole(
    @Query('username') username: string,
    @Query('roles') rolesParam: string,
  ) {
    const roles = rolesParam.split(',').map((r) => r.trim());
    return {
      username,
      roles,
      isValid: await this.authService.validateUserRole(username, roles),
    };
  }

  @Get('validate-permission')
  async validatePermission(
    @Query('username') username: string,
    @Query('permission') permission: string,
  ) {
    return {
      username,
      permission,
      isValid: await this.authService.validateUserPermission(
        username,
        permission,
      ),
    };
  }

  @Get('users')
  async users(@Query('actor') actor?: string) {
    if (!actor) {
      throw new UnauthorizedException('FORBIDDEN');
    }

    try {
      return await this.authService.listUsers(actor);
    } catch (error) {
      throw new UnauthorizedException((error as Error).message);
    }
  }

  @Post('register')
  async register(
    @Body('username') username: string,
    @Body('departmentCode') departmentCode: string,
    @Body('roleCode') roleCode: string,
    @Body('password') password: string,
  ) {
    if (!username || !departmentCode || !roleCode || !password) {
      throw new BadRequestException(
        'username, departmentCode, roleCode, and password are required',
      );
    }

    try {
      const user = await this.authService.onboardUser({
        username,
        departmentCode,
        roleCode,
        password,
      });
      return { ok: true, user };
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
