import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'; // Added for Swagger later

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Get health status' })
  @ApiResponse({ status: 200, description: 'Health status' })
  getHealth() {
    return {
      status: 'OK',
      uptime: process.uptime(),
      env: process.env.NODE_ENV ,
      version: '1.0.0', // Update as needed
    };
  }
}