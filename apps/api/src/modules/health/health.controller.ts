import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.decorators';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Comprueba que la API está disponible' })
  check() {
    return { status: 'ok', service: 'wavecrm-api', timestamp: new Date().toISOString() };
  }
}

