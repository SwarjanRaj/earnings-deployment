import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:5173', 
      'http://localhost:5174', 
      'https://nailartsdesign.com', 
      'https://www.nailartsdesign.com',
      'https://sdnsoftech.info',
      'https://www.sdnsoftech.info',
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
    ],
    credentials: true,
  });

  // Set global body size limit for JSON and file uploads
  const expressApp = app.getHttpAdapter().getInstance();

  // Only apply JSON middleware to non-multipart requests
  expressApp.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // Skip JSON middleware for multipart requests
      return next();
    }
    require('express').json({ limit: '500mb' })(req, res, next);
  });

  expressApp.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // Skip urlencoded middleware for multipart requests
      return next();
    }
    require('express').urlencoded({ limit: '500mb', extended: true })(req, res, next);
  });

  // Remove middleware interference for multipart requests - let multer handle everything
  expressApp.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // Skip all middleware for multipart requests - let multer handle parsing
      return next();
    }
    // For non-multipart requests, use raw body parsing
    require('express').raw({ limit: '500mb' })(req, res, next);
  });

  // Global error handler to catch any unhandled errors
  app.useGlobalFilters(new class {
    catch(exception: any, host: any) {
      const response = host.switchToHttp().getResponse();

      // If it's already an HTTP exception, preserve the status code
      if (exception.status) {
        return response.status(exception.status).json({
          statusCode: exception.status,
          message: exception.message || 'Error',
          details: exception.response?.data || exception.message
        });
      }

      // For other errors, return 500
      return response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        details: exception.message
      });
    }
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Gateway service running on port ${port}`);
}
bootstrap();
