import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiKeyGuard } from './auth/api-key.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalGuards(new ApiKeyGuard());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Coworking API')
    .setDescription(
      'API de gestão de coworking: autenticação, workspaces e reservas, ' +
        'com prevenção de sobreposição de horários. Toda requisição ' +
        'exige o header "x-api-key" (clique em "Authorize" e preencha ' +
        '"apiKey"). Nas rotas protegidas por login, também é preciso ' +
        'autorizar com o token JWT retornado por POST /auth/login ' +
        '(campo "bearer", sem o prefixo "Bearer").',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Cole aqui o token retornado por POST /auth/login',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Chave de API exigida em toda requisição (ver .env)',
      },
      'apiKey',
    )
    .addTag('Auth', 'Autenticação e emissão de token JWT')
    .addTag('Workspaces', 'Espaços de coworking disponíveis para reserva')
    .addTag('Bookings', 'Reservas de usuários em workspaces')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
