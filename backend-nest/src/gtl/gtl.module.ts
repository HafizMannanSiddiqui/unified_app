import { Module } from '@nestjs/common';
import { GtlController } from './gtl.controller';
import { GtlService } from './gtl.service';

@Module({
  controllers: [GtlController],
  providers: [GtlService],
})
export class GtlModule {}
