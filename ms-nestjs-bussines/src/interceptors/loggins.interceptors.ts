import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Obtiene la solicitud actual
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const headers = JSON.stringify(request.headers);

    // Registra la solicitud
    console.log(`Incoming Request...`);
    console.log(`Method: ${method}`);
    console.log(`URL: ${url}`);
    console.log(`Headers: ${headers}`);

    // Tiempo de inicio para medir la duración de la respuesta
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Calcula el tiempo total y registra la respuesta
        const endTime = Date.now();
        console.log(`Response... ${endTime - startTime}ms`);
      }),
    );
  }
}