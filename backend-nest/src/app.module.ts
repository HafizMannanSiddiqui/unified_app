import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { RolesModule } from './roles/roles.module';
import { GtlModule } from './gtl/gtl.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeavesModule } from './leaves/leaves.module';
import { ProfilesModule } from './profiles/profiles.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    RolesModule,
    GtlModule,
    AttendanceModule,
    LeavesModule,
    ProfilesModule,
  ],
})
export class AppModule {}
