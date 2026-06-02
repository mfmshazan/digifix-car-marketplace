# Deployment Guide

Production deployment guide for the Delivery Partner Application.

## Overview

This guide covers deploying the backend API and preparing the mobile app for production use.

---

## Backend Deployment

### Option 1: Deploy to Heroku

#### Prerequisites
- Heroku account
- Heroku CLI installed

#### Steps

1. **Prepare the application**

Create `Procfile` in backend directory:
```
web: node server.js
```

2. **Create Heroku app**
```bash
cd backend
heroku create delivery-partner-api
```

3. **Add PostgreSQL addon**
```bash
heroku addons:create heroku-postgresql:mini
```

4. **Set environment variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_ACCESS_SECRET=<generate-strong-secret>
heroku config:set JWT_REFRESH_SECRET=<generate-strong-secret>
heroku config:set ADMIN_API_KEY=<generate-strong-key>
```

5. **Deploy**
```bash
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

6. **Initialize database**
```bash
heroku run node scripts/initDatabase.js
```

7. **Verify deployment**
```bash
heroku open
# Visit https://your-app.herokuapp.com/health
```

---

### Option 2: Deploy to AWS EC2

#### Prerequisites
- AWS account
- EC2 instance (Ubuntu 20.04 LTS recommended)
- Domain name (optional)

#### Steps

1. **Connect to EC2 instance**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

2. **Install Node.js and PostgreSQL**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2
```

3. **Setup PostgreSQL**
```bash
sudo -u postgres psql

CREATE DATABASE delivery_partner_db;
CREATE USER delivery_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE delivery_partner_db TO delivery_user;
\q
```

4. **Clone and setup application**
```bash
# Clone your repository
git clone https://github.com/yourusername/delivery-partner-app.git
cd delivery-partner-app/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
```

Add production environment variables:
```
PORT=3000
NODE_ENV=production

DB_HOST=localhost
DB_PORT=5432
DB_NAME=delivery_partner_db
DB_USER=delivery_user
DB_PASSWORD=strong_password

JWT_ACCESS_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

ADMIN_API_KEY=<generate-strong-key>
```

5. **Initialize database**
```bash
node scripts/initDatabase.js
```

6. **Start with PM2**
```bash
pm2 start server.js --name delivery-api
pm2 save
pm2 startup
```

7. **Setup Nginx reverse proxy**
```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/delivery-api
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/delivery-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

8. **Setup SSL with Let's Encrypt**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### Option 3: Deploy to DigitalOcean App Platform

#### Steps

1. **Create account** at DigitalOcean

2. **Create new app**
- Choose "GitHub" as source
- Select your repository
- Choose "backend" directory

3. **Configure app**
- Build Command: `npm install`
- Run Command: `node server.js`
- HTTP Port: 3000

4. **Add PostgreSQL database**
- Add "Database" component
- Choose PostgreSQL
- Note connection details

5. **Set environment variables**
- Add all variables from `.env.example`
- Use database connection string from step 4

6. **Deploy**
- Click "Create Resources"
- Wait for deployment

---

## Mobile App Deployment

### iOS Deployment (App Store)

#### Prerequisites
- Apple Developer account ($99/year)
- Mac with Xcode installed
- Expo account

#### Steps

1. **Configure app.json**
```json
{
  "expo": {
    "name": "Delivery Partner",
    "slug": "delivery-partner",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.deliverypartner",
      "buildNumber": "1",
      "supportsTablet": true
    }
  }
}
```

2. **Update API URL**

In `mobile/config.js`:
```javascript
export const API_BASE_URL = 'https://your-production-api.com/api';
```

3. **Build with EAS**
```bash
cd mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios
```

4. **Submit to App Store**
```bash
eas submit --platform ios
```

5. **Follow App Store review process**
- Provide screenshots
- Write app description
- Set pricing (free)
- Submit for review

---

### Android Deployment (Google Play)

#### Prerequisites
- Google Play Developer account ($25 one-time)
- Expo account

#### Steps

1. **Configure app.json**
```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.deliverypartner",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA"
      ]
    }
  }
}
```

2. **Update API URL** (same as iOS)

3. **Build with EAS**
```bash
# Build for Android
eas build --platform android
```

4. **Submit to Google Play**
```bash
eas submit --platform android
```

5. **Complete Play Store listing**
- Upload screenshots
- Write description
- Set content rating
- Publish

---

## Environment Variables Reference

### Backend (.env)

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=delivery_partner_db
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# JWT
JWT_ACCESS_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Admin
ADMIN_API_KEY=<32-char-random-string>
```

### Mobile (config.js)

```javascript
export const API_BASE_URL = 'https://api.yourcompany.com/api';
export const ADMIN_API_KEY = '<same-as-backend>';
```

---

## Security Checklist

### Backend
- [ ] Change all default secrets and keys
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain only
- [ ] Set up rate limiting
- [ ] Enable request logging
- [ ] Set up monitoring (e.g., Sentry)
- [ ] Regular security updates
- [ ] Database backups configured
- [ ] Environment variables secured

### Mobile
- [ ] API URL points to production
- [ ] Remove debug logs
- [ ] Enable ProGuard (Android)
- [ ] Code obfuscation enabled
- [ ] Secure storage implemented
- [ ] SSL pinning (optional)

---

## Monitoring & Logging

### Backend Monitoring

**Option 1: PM2 Monitoring**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Option 2: Sentry**
```bash
npm install @sentry/node

# Add to server.js
const Sentry = require("@sentry/node");
Sentry.init({ dsn: "your-sentry-dsn" });
```

### Database Backups

**Automated PostgreSQL backups**:
```bash
# Create backup script
nano /home/ubuntu/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -U delivery_user delivery_partner_db > $BACKUP_DIR/backup_$TIMESTAMP.sql
find $BACKUP_DIR -type f -mtime +7 -delete
```

```bash
chmod +x /home/ubuntu/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/ubuntu/backup-db.sh
```

---

## Scaling Considerations

### Database
- Use connection pooling (already implemented)
- Add read replicas for high traffic
- Consider managed database (AWS RDS, DigitalOcean Managed DB)

### Backend
- Use load balancer for multiple instances
- Implement caching (Redis)
- CDN for static assets

### Mobile
- Implement pagination for large lists
- Cache API responses
- Optimize images

---

## Rollback Procedure

### Backend
```bash
# With PM2
pm2 stop delivery-api
git checkout previous-commit
npm install
pm2 restart delivery-api

# With Heroku
heroku rollback
```

### Mobile
- Submit new build to app stores
- Users will update gradually
- Consider forced update mechanism

---

## Support & Maintenance

### Regular Tasks
- Monitor error logs daily
- Review performance metrics weekly
- Update dependencies monthly
- Security patches as needed
- Database backups verified weekly

### Emergency Contacts
- Backend issues: Check PM2 logs, server status
- Database issues: Check PostgreSQL logs
- Mobile issues: Check app store reviews, crash reports

---

## Cost Estimates

### Backend Hosting
- **Heroku**: $7-25/month (Hobby to Standard tier)
- **AWS EC2**: $10-50/month (t2.micro to t2.medium)
- **DigitalOcean**: $12-24/month (Basic to Professional)

### Database
- **Heroku Postgres**: $9-50/month
- **AWS RDS**: $15-100/month
- **DigitalOcean Managed**: $15-40/month

### Mobile
- **Apple Developer**: $99/year
- **Google Play**: $25 one-time
- **Expo EAS**: $29/month (optional, for builds)

### Total Estimated: $50-200/month + $124/year

---

## Additional Resources

- [Expo Deployment Docs](https://docs.expo.dev/distribution/introduction/)
- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/deploying-nodejs)
- [AWS EC2 Tutorial](https://docs.aws.amazon.com/ec2/)
- [Let's Encrypt SSL](https://letsencrypt.org/getting-started/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

## Conclusion

This deployment guide covers the essential steps for production deployment. Adjust configurations based on your specific requirements and scale.

For questions or issues, refer to the main README.md or create an issue in the repository.
