# Deploy Higo Backend to Railway

## Quick Deploy Steps

### 1. Prepare Repository
```bash
git add .
git commit -m "Setup Railway deployment"
git push origin main
```

### 2. Railway Setup
1. Go to [railway.app](https://railway.app)
2. Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository

### 3. Add Services

#### MongoDB Service
1. Click "New" → "Database" → "Add MongoDB"
2. Note the connection string from Variables tab

#### Redis Service  
1. Click "New" → "Database" → "Add Redis"
2. Note the connection string from Variables tab

### 4. Configure Environment Variables
In your main service → Variables tab, add:

```env
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-here-min-32-chars
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=200
```

Railway will automatically provide:
- `PORT` (dynamic)
- `MONGODB_URL` (from MongoDB service)  
- `REDIS_URL` (from Redis service)

### 5. Deploy Settings
- Build Command: `npm run build`
- Start Command: `npm start`
- Root Directory: `/` (default)

### 6. Domain Setup
1. Go to Settings → Networking
2. Click "Generate Domain" for public access
3. Or add custom domain

## File Structure for Railway
```
backend/
├── railway.json          # Railway configuration
├── nixpacks.toml         # Build configuration  
├── .env.railway         # Environment template
├── src/                 # Source code
├── package.json         # Dependencies & scripts
└── README.railway.md    # This file
```

## Important Notes

### Database Connections
- MongoDB and Redis will be internal Railway services
- Connection strings are automatically provided
- No need to configure network/firewall

### File Uploads
- Railway has persistent storage at `/app`
- Upload directory: `/app/uploads/csv/`
- Max file size: 200MB (configurable)

### Environment Variables
- `MONGODB_URL` - Provided by Railway MongoDB service
- `REDIS_URL` - Provided by Railway Redis service  
- `PORT` - Provided by Railway (dynamic)
- `JWT_SECRET` - **You MUST set this manually**

### Scaling
- Railway auto-scales based on traffic
- CPU/Memory limits can be configured
- Multiple replicas supported

## Troubleshooting

### Build Fails
- Check `npm run build` works locally
- Verify all dependencies in package.json
- Check Railway build logs

### Database Connection Issues  
- Verify MongoDB service is running
- Check connection string in Variables
- Ensure MongoDB service is linked

### Upload Issues
- Verify UPLOAD_DIR is set to `/app/uploads`
- Check file permissions
- Monitor disk usage

### Performance
- Monitor memory usage in Railway dashboard
- Configure appropriate CPU/memory limits
- Use Redis caching effectively

## Cost Optimization
- Railway has generous free tier
- Monitor usage in dashboard
- Scale down unused services
- Use MongoDB Atlas free tier if needed

## Security
- Always use strong JWT_SECRET (32+ characters)
- Set proper CORS origins (FRONTEND_URL)
- Enable rate limiting
- Monitor access logs