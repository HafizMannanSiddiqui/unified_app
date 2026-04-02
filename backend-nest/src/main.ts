import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger API Documentation — password protected
  const SWAGGER_USER = process.env.SWAGGER_USER || 'admin';
  const SWAGGER_PASS = process.env.SWAGGER_PASS || 'gtl@2026';

  // Basic Auth middleware for Swagger routes only
  app.use('/api/docs', (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="API Documentation"');
      return res.status(401).send('Authentication required');
    }
    const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
    const [user, pass] = decoded.split(':');
    if (user === SWAGGER_USER && pass === SWAGGER_PASS) {
      return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="API Documentation"');
    return res.status(401).send('Invalid credentials');
  });

  const config = new DocumentBuilder()
    .setTitle('GTL & HRMS API')
    .setDescription('Unified GTL (Global Time Logger) & HRMS API Documentation.\n\nAll endpoints require JWT Bearer token unless marked as public.\n\nSession expires after 8 hours.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addTag('Auth', 'Login, logout, password reset')
    .addTag('Users', 'User management, teams, managers, directory')
    .addTag('Attendance', 'Check-in/out, reports, WFH, requests')
    .addTag('GTL', 'Time entries, approvals, reports')
    .addTag('Leaves', 'Leave applications, approvals, balance')
    .addTag('Profiles', 'Employee profiles, education, experience')
    .addTag('Teams', 'Team CRUD, sub-teams')
    .addTag('Roles', 'Role management, permissions')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Set server base URL so Swagger calls go through /api proxy
  document.servers = [{ url: '/api', description: 'Via frontend proxy' }];
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '127.0.0.1');
  console.log(`Backend running on http://127.0.0.1:${port} (localhost only)`);
  console.log(`Swagger docs: http://localhost:3002/api/docs (protected: ${SWAGGER_USER}/${SWAGGER_PASS})`);
}
bootstrap();
