import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const env = process.env.NODE_ENV;

    const errorResponse = {
      message: exception.message || 'Internal server error',
      code: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (env !== 'production') {
      // @ts-ignore
      errorResponse.stack = exception.stack;
    }

    this.logger.error(`${request.method} ${request.url}`, exception.stack);

    response.status(status).json(errorResponse);
  }
}