import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new PinoLogger({ renameContext: 'LoggingInterceptor' });

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, headers } = request;
    const requestId = headers['x-request-id'] || require('crypto').randomUUID();
    const start = Date.now();

    this.logger.setContext(requestId);

    this.logger.info(`Incoming request: ${method} ${url} - Request ID: ${requestId}`);

    return next
      .handle()
      .pipe(
        tap(() => {
          const duration = Date.now() - start;
          this.logger.info(`Request completed: ${method} ${url} - Status: ${response.statusCode} - Duration: ${duration}ms - Request ID: ${requestId}`);
        }),
        catchError((error) => {
          const duration = Date.now() - start;
          this.logger.error(`Request failed: ${method} ${url} - Error: ${error.message} - Duration: ${duration}ms - Request ID: ${requestId}`);
          return throwError(() => error);
        }),
      );
  }
}