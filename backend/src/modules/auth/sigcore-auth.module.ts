import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../../database/entities';
import { SigcoreAuthGuard } from './sigcore-auth.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  providers: [SigcoreAuthGuard],
  exports: [SigcoreAuthGuard],
})
export class SigcoreAuthModule {}
