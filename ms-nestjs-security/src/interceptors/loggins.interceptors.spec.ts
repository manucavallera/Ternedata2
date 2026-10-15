import { of, lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './loggins.interceptors';

describe('LoggingInterceptor', () => {
  it('logs method and path without headers or query string', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const request = {
      method: 'GET',
      url: '/users/5?email=privado@example.com',
      headers: { authorization: 'Bearer secreto' },
    };
    const context: any = {
      switchToHttp: () => ({ getRequest: () => request }),
    };

    await lastValueFrom(
      new LoggingInterceptor().intercept(context, { handle: () => of(1) }),
    );

    const salida = log.mock.calls.flat().join('\n');
    expect(salida).toContain('GET /users/5');
    expect(salida).not.toContain('secreto');
    expect(salida).not.toContain('privado@example.com');
    log.mockRestore();
  });
});
