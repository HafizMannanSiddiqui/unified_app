import { Module } from '@nestjs/common';
import { AttendanceController, PublicAttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { ZktecoService } from './zkteco.service';

@Module({
  controllers: [AttendanceController, PublicAttendanceController],
  providers: [AttendanceService, ZktecoService],
})
export class AttendanceModule {}
