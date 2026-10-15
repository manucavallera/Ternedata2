import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    // Solo método y ruta: los headers llevan el token de sesión (Authorization)
    // y la query string puede llevar datos personales.
    const ruta = `${request.method} ${String(request.url).split('?')[0]}`;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => console.log(`${ruta} ${Date.now() - startTime}ms`),
        error: (err) =>
          console.log(`${ruta} ${err?.status ?? 500} ${Date.now() - startTime}ms`),
      }),
    );
  }
}
