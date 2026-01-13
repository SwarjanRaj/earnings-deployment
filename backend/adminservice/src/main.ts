import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { join } from 'path';

// Load environment variables from .env file
dotenv.config();

async function bootstrap() {
  // Create HTTP app
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Enable cookie parser
  app.use(cookieParser());

  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://nailartsdesign.com', 'https://www.nailartsdesign.com'],
    credentials: true,
  });

  // Create gRPC microservice
  const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'admin',
        protoPath: join(__dirname, '../proto/admin.proto'),
        url: '0.0.0.0:50052', // gRPC port
      },
    },
  );

  // Start HTTP server
  const port = parseInt(process.env.PORT ?? '3002', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Admin Service HTTP server running on port ${port}`);

  // Start gRPC server
  await grpcApp.listen();
  console.log('Admin Service gRPC server running on port 50052');
}
bootstrap();
