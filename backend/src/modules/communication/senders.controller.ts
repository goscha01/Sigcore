import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SendersService } from './senders.service';
import { CreateSenderDto, UpdateSenderDto } from './dto/sender.dto';
import { SigcoreAuthGuard } from '../auth/sigcore-auth.guard';
import { WorkspaceId } from '../auth/decorators/workspace-id.decorator';
import { ChannelType } from '../../database/entities/sender.entity';

@Controller('senders')
@UseGuards(SigcoreAuthGuard)
export class SendersController {
  constructor(private readonly sendersService: SendersService) {}

  @Get()
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query('channel') channel?: ChannelType,
  ) {
    const senders = await this.sendersService.findAll(workspaceId, channel);
    return { data: senders };
  }

  @Get(':id')
  async findOne(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    const sender = await this.sendersService.findOne(workspaceId, id);
    return { data: sender };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateSenderDto,
  ) {
    const sender = await this.sendersService.create(workspaceId, dto);
    return { data: sender };
  }

  @Patch(':id')
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSenderDto,
  ) {
    const sender = await this.sendersService.update(workspaceId, id, dto);
    return { data: sender };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.sendersService.delete(workspaceId, id);
  }
}
