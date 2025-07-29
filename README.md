# Higo Backend API

## 📋 Overview

Higo Backend adalah RESTful API yang dibangun dengan **Node.js**, **Express.js**, **TypeScript**, **MongoDB**, dan **Redis** menggunakan arsitektur Docker containerization. Sistem ini menyediakan authentication berbasis JWT, role-based access control, rate limiting, dan health monitoring.

## 🏗️ Arsitektur Sistem

### Tech Stack
- **Runtime**: Node.js 18 (Alpine Linux)
- **Framework**: Express.js 5
- **Language**: TypeScript 5
- **Database**: MongoDB 7.0
- **Cache**: Redis 7.2
- **Authentication**: JWT (Access + Refresh Token)
- **Container**: Docker & Docker Compose
- **Security**: Helmet, CORS, Rate Limiting

### Struktur Direktori
```
backend/
├── src/
│   ├── api/              # API endpoints & routing
│   ├── auth/             # JWT & permissions system
│   ├── core/             # Config, database, redis connections
│   ├── middleware/       # Error handling, logging, rate limiting
│   ├── models/           # MongoDB schemas & enums
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic layer
│   ├── schemas/          # TypeScript interfaces
│   ├── utils/            # Utilities & cache helpers
│   └── app.ts            # Main application entry
├── docker/
│   ├── app/Dockerfile    # Multi-stage Node.js container
│   ├── mongodb/          # Custom MongoDB setup
│   └── redis/            # Custom Redis configuration
├── docker-compose.yml    # Base configuration
├── docker-compose.dev.yml # Development overrides
├── docker-compose.prod.yml # Production configuration
└── tsconfig.json         # TypeScript configuration
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (untuk development tanpa Docker)
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd higo/backend
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env file sesuai kebutuhan
nano .env
```

### 3. Development Mode
```bash
# Start semua services dengan hot reload
npm run docker:dev

# Atau menggunakan docker-compose langsung
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### 4. Production Mode
```bash
# Start production services
npm run docker:prod

# Atau
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 🐳 Docker Services

### Application Service (Node.js)
- **Port**: 3000 (development), 3000 (production)
- **Debug Port**: 9229 (development only)
- **Health Check**: `/health`
- **Features**:
  - Multi-stage build (development/production)
  - Hot reload untuk development
  - Graceful shutdown handling
  - Non-root user security

### MongoDB Service
- **Port**: 27017
- **Database**: `higoapp`
- **Credentials**:
  - Root: `admin:password`
  - App User: `higouser:higopassword`
- **Features**:
  - Persistent data volumes
  - Auto initialization script
  - Health checks
  - Custom indexes

### Redis Service
- **Port**: 6379
- **Password**: `higoredispassword`
- **Features**:
  - Persistent storage
  - Custom configuration
  - Memory optimization
  - Security settings

## 🔐 Authentication System

### JWT Implementation
- **Access Token**: Short-lived (7 days default)
- **Refresh Token**: Long-lived (30 days default)
- **Storage**: Refresh tokens stored in Redis
- **Security**: Token blacklisting, automatic cleanup

### User Roles & Permissions
```typescript
enum UserRole {
  ADMIN = 'admin',        // Full system access
  MODERATOR = 'moderator', // Limited admin functions
  USER = 'user'           // Basic user access
}

enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}
```

### Default Admin User
- **Email**: `admin@higo.com`
- **Password**: `admin123`
- **Role**: `admin`
- **Status**: `active`

## 🛡️ Security Features

### Rate Limiting
- **General**: 100 requests/15 minutes per IP
- **Auth endpoints**: 5 attempts/15 minutes per IP
- **API endpoints**: 200 requests/15 minutes per IP
- **User-based**: 30 requests/minute per user

### Security Headers
- Helmet.js untuk security headers
- CORS configuration
- Input validation & sanitization
- Password hashing dengan bcrypt (12 rounds)

### Error Handling
- Global error handler
- Custom error classes
- Structured logging
- Development vs Production error details

## 📊 Monitoring & Health Checks

### Endpoints
- **Health Check**: `GET /health`
- **Metrics**: `GET /metrics`
- **API Status**: `GET /`

### Health Check Response
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "environment": "development",
    "version": "1.0.0",
    "services": {
      "database": "connected",
      "redis": "connected"
    }
  }
}
```

## 🔧 Development

### Available Scripts
```bash
# Development dengan hot reload
npm run dev

# Build TypeScript
npm run build

# Start production build
npm start

# Docker commands
npm run docker:dev      # Development containers
npm run docker:prod     # Production containers  
npm run docker:build    # Build images only
npm run docker:down     # Stop all containers
```

### Local Development (tanpa Docker)
```bash
# Install dependencies
npm install

# Setup MongoDB & Redis locally
# Update .env dengan local connection strings

# Start development server
npm run dev
```

### Database Operations
```bash
# Connect ke MongoDB container
docker exec -it higo-mongodb mongosh -u admin -p password

# Connect ke Redis container
docker exec -it higo-redis redis-cli -a higoredispassword

# View logs
docker logs higo-app
docker logs higo-mongodb
docker logs higo-redis
```

## 🌐 API Documentation

### Base Response Format
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
```

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile

### User Management
- `GET /users` - List users (admin/moderator)
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user (admin)

## 🔄 CI/CD & Deployment

### Production Deployment
```bash
# Clone repository
git clone <repository-url>
cd higo/backend

# Setup environment
cp .env.example .env
# Edit .env dengan production values

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Check status
docker-compose ps
docker-compose logs -f app
```

### Environment Variables
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://higouser:password@mongodb:27017/higoapp
REDIS_URL=redis://:password@redis:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Scaling
```bash
# Scale application instances
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale app=3

# Load balancer dengan Nginx (included in prod config)
```

## 🧪 Testing

### Health Check Test
```bash
curl http://localhost:3000/health
```

### Authentication Test
```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check container status
   docker-compose ps
   
   # Check MongoDB logs
   docker logs higo-mongodb
   
   # Restart MongoDB
   docker-compose restart mongodb
   ```

2. **Redis Connection Failed**
   ```bash
   # Check Redis container
   docker logs higo-redis
   
   # Test Redis connection
   docker exec higo-redis redis-cli ping
   ```

3. **Application Won't Start**
   ```bash
   # Check app logs
   docker logs higo-app
   
   # Rebuild containers
   docker-compose down
   docker-compose up --build
   ```

4. **Permission Denied**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   
   # Or run with sudo
   sudo docker-compose up
   ```

### Log Locations
- **Application**: `docker logs higo-app`
- **MongoDB**: `docker logs higo-mongodb`
- **Redis**: `docker logs higo-redis`
- **All services**: `docker-compose logs -f`

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License.

---

**Happy Coding! 🚀**