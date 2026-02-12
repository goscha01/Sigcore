import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Needed for webhook signature verification
  });

  const logger = new Logger('HTTP');

  // Ensure all API responses have Content-Type: application/json
  // (prevents double-encoding when downstream consumers like Callio don't get the header)
  app.use('/api', (req: any, res: any, next: () => void) => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (!res.getHeader('content-type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      return originalJson(body);
    };
    next();
  });

  // Request/Response logging middleware
  app.use((req: { method: string; originalUrl: string; body: unknown }, res: { statusCode: number; on: (event: string, cb: () => void) => void }, next: () => void) => {
    const startTime = Date.now();
    logger.log(`[Request] ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
      logger.log(`[Request Body] ${JSON.stringify(req.body)}`);
    }

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.log(`[Response] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });

    next();
  });

  const configService = app.get(ConfigService);

  // Enable CORS for Callio backend and other allowed origins
  const callioBackendUrl = configService.get('CALLIO_BACKEND_URL') || 'http://localhost:3001';
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    callioBackendUrl,
    /\.railway\.app$/,
    /\.vercel\.app$/,
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(null, true); // Allow anyway for now
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'x-api-key', 'x-sigcore-key', 'x-workspace-id'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false, // Allow extra fields (needed for webhook payloads)
    }),
  );

  // API prefix - exclude health check endpoints
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health'],
  });

  const port = configService.get('PORT') || 3002;
  await app.listen(port, '0.0.0.0');

  const baseUrl = configService.get('BASE_URL') || process.env.BASE_URL || '(not set)';
  console.log(`Sigcore Backend running on port ${port}, BASE_URL=${baseUrl} (config=${configService.get('BASE_URL')}, env=${process.env.BASE_URL})`);
}

bootstrap();
