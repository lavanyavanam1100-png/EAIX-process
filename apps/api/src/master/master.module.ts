import { Module } from '@nestjs/common';
import { MasterController } from './master.controller';
import { MasterService } from './master.service';
import { DepartmentsModule } from '../departments/departments.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [DepartmentsModule, RolesModule],
  controllers: [MasterController],
  providers: [MasterService],
  exports: [MasterService],
})
export class MasterModule {}
