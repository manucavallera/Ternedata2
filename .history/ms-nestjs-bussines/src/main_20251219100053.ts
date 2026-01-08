import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './interceptors/loggins.interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new LoggingInterceptor());

  const configService = app.get(ConfigService);

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ganaderia-pevs.vercel.app',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permite Postman / Thunder
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

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
