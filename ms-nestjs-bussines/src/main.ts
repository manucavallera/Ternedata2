import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './interceptors/loggins.interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new LoggingInterceptor());

  const configService = app.get(ConfigService);

  // 👉 DOMINIOS PERMITIDOS (CORS)
 const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173',
    'https://ganaderia-pevs.vercel.app',
    'https://manu-frontendganaderia.gygo4l.easypanel.host',
    process.env.CORS_ORIGIN_DESARROLLO,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Permite llamadas sin origin (Postman, Thunder, Mobile Apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`❌ CORS bloqueó origen en Business: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('BUSSINES API')
    .setDescription('Documentación de la API de BUSSINES')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/nestjs', app, document);

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);

  console.log(`BUSSINES running on port ${port}`);
}

bootstrap();
