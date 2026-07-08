import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/db')
  getDatabaseHealth() {
    return {
      mysqlConnected: this.databaseService.isConnected(),
      schema: process.env.MYSQL_DATABASE ?? 'enterprise_app',
      mode: this.databaseService.isConnected()
        ? 'database'
        : 'in-memory-fallback',
    };
  }
}
