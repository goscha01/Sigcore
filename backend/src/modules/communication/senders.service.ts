import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sender, ChannelType, SenderStatus } from '../../database/entities/sender.entity';
import { CreateSenderDto, UpdateSenderDto } from './dto/sender.dto';

@Injectable()
export class SendersService {
  constructor(
    @InjectRepository(Sender)
    private readonly senderRepository: Repository<Sender>,
  ) {}

  async findAll(workspaceId: string, channel?: ChannelType): Promise<Sender[]> {
    const query = this.senderRepository
      .createQueryBuilder('sender')
      .where('sender.workspaceId = :workspaceId', { workspaceId });

    if (channel) {
      query.andWhere('sender.channel = :channel', { channel });
    }

    return query.orderBy('sender.createdAt', 'DESC').getMany();
  }

  async findOne(workspaceId: string, id: string): Promise<Sender> {
    const sender = await this.senderRepository.findOne({
      where: { id, workspaceId },
    });

    if (!sender) {
      throw new NotFoundException(`Sender with ID ${id} not found`);
    }

    return sender;
  }

  async findByAddress(
    workspaceId: string,
    channel: ChannelType,
    address: string,
  ): Promise<Sender | null> {
    return this.senderRepository.findOne({
      where: { workspaceId, channel, address },
    });
  }

  async create(workspaceId: string, dto: CreateSenderDto): Promise<Sender> {
    // Check if sender already exists
    const existing = await this.findByAddress(workspaceId, dto.channel, dto.address);
    if (existing) {
      throw new ConflictException(
        `Sender with address ${dto.address} already exists for channel ${dto.channel}`,
      );
    }

    const sender = this.senderRepository.create({
      workspaceId,
      ...dto,
      status: SenderStatus.ACTIVE,
    });

    return this.senderRepository.save(sender);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateSenderDto,
  ): Promise<Sender> {
    const sender = await this.findOne(workspaceId, id);

    Object.assign(sender, dto);
    return this.senderRepository.save(sender);
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    const sender = await this.findOne(workspaceId, id);
    await this.senderRepository.remove(sender);
  }

  async findOrCreateFromPhoneNumber(
    workspaceId: string,
    phoneNumber: string,
    provider: string,
    channel: ChannelType = ChannelType.SMS,
  ): Promise<Sender> {
    // Normalize phone number
    const address = phoneNumber.replace(/\D/g, '');
    const normalizedAddress = address.startsWith('+') ? address : `+${address}`;

    let sender = await this.findByAddress(workspaceId, channel, normalizedAddress);

    if (!sender) {
      sender = await this.create(workspaceId, {
        channel,
        address: normalizedAddress,
        provider,
      });
    }

    return sender;
  }
}
