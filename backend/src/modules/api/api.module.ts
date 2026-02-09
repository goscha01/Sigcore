import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiController } from './api.controller';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from '../../database/entities/api-key.entity';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey]),
    forwardRef(() => CommunicationModule),
  ],
  controllers: [ApiController, ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiModule {}
