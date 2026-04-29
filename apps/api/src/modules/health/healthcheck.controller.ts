import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

type HealthcheckResponse = {
  status: 'ok';
  timestamp: string;
};

@ApiTags('health')
@Controller('health')
export class HealthcheckController {
  @Get()
  @ApiOperation({ summary: 'Verifica se a API esta disponivel' })
  @ApiOkResponse({ description: 'Healthcheck executado com sucesso' })
  check(): HealthcheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
