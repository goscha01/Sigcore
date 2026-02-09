import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoinWorkspace(client: Socket, workspaceId: string) {
    client.join(`workspace:${workspaceId}`);
    this.logger.log(`Client ${client.id} joined workspace: ${workspaceId}`);
    return { event: 'joined', data: { workspaceId } };
  }

  @SubscribeMessage('leave')
  handleLeaveWorkspace(client: Socket, workspaceId: string) {
    client.leave(`workspace:${workspaceId}`);
    this.logger.log(`Client ${client.id} left workspace: ${workspaceId}`);
    return { event: 'left', data: { workspaceId } };
  }

  emitNewMessage(workspaceId: string, message: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('message:new', message);
    this.logger.log(`Emitted new message to workspace: ${workspaceId}`);
  }

  emitNewCall(workspaceId: string, call: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('call:new', call);
    this.logger.log(`Emitted new call to workspace: ${workspaceId}`);
  }

  emitConversationUpdate(workspaceId: string, conversation: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('conversation:update', conversation);
    this.logger.log(`Emitted conversation update to workspace: ${workspaceId}`);
  }

  emitNewConversation(workspaceId: string, conversation: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('conversation:new', conversation);
    this.logger.log(`Emitted new conversation to workspace: ${workspaceId}`);
  }

  emitCallUpdate(workspaceId: string, call: unknown) {
    this.server.to(`workspace:${workspaceId}`).emit('call:update', call);
    this.logger.log(`Emitted call update to workspace: ${workspaceId}`);
  }
}
