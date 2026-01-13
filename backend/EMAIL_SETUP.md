# Email Service Setup Guide

## Overview
This guide will help you set up real-time email services for the EarningsQuake application using Resend (recommended) or SendGrid.

## Option 1: Resend (Recommended - Free Tier)

### 1. Sign up for Resend
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get your API Key
1. After signing in, go to the API Keys section
2. Create a new API key
3. Copy the API key (starts with `re_`)

### 3. Configure the Application
Update the `docker-compose.yml` file with your real API key:

```yaml
auth-service:
  environment:
    - RESEND_API_KEY=your_actual_resend_api_key_here
    - EMAIL_FROM=onboarding@resend.dev  # This is the default sender
    - NODE_ENV=production
```

### 4. Verify Your Domain (Optional but Recommended)
1. In Resend dashboard, go to Domains
2. Add your domain (e.g., `earningsquake.com`)
3. Follow the DNS verification steps
4. Update `EMAIL_FROM` to use your domain: `noreply@yourdomain.com`

## Option 2: SendGrid

### 1. Sign up for SendGrid
1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up for a free account (100 emails/day)
3. Verify your email address

### 2. Get your API Key
1. Go to Settings > API Keys
2. Create a new API key with "Mail Send" permissions
3. Copy the API key

### 3. Verify Your Sender Identity
1. Go to Settings > Sender Authentication
2. Verify your domain or at least your sender email
3. Follow the verification steps

### 4. Configure the Application
Update the `docker-compose.yml` file:

```yaml
auth-service:
  environment:
    - SENDGRID_API_KEY=your_actual_sendgrid_api_key_here
    - EMAIL_FROM=your_verified_email@yourdomain.com
    - NODE_ENV=production
```

## Testing the Email Service

### 1. Restart Services
```bash
cd backend
docker-compose down
docker-compose up -d
```

### 2. Test Signup
```bash
# Test the signup endpoint
curl -X POST "https://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "username": "testuser"
  }'
```

### 3. Check Email
- Check your email inbox for the verification code
- The email should have a professional design with the 6-digit code
- The code expires in 10 minutes

### 4. Verify Account
```bash
# Test the verify endpoint
curl -X POST "https://localhost:3000/api/auth/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```