import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
        'com prevenção de sobreposição de horários. Para testar rotas ' +
        'protegidas, faça login em "Auth" e clique em "Authorize" com o ' +
        'token retornado (sem o prefixo "Bearer").',
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
    .addTag('Auth', 'Autenticação e emissão de token JWT')
    .addTag('Workspaces', 'Espaços de coworking disponíveis para reserva')
    .addTag('Bookings', 'Reservas de usuários em workspaces')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
