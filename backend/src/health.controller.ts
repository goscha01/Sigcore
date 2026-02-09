import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  healthCheck() {
    return { status: 'ok', service: 'sigcore', timestamp: new Date().toISOString() };
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'sigcore', timestamp: new Date().toISOString() };
  }
}
