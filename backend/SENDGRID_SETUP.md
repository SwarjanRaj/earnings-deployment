# SendGrid Email Setup Guide

## Current Issue
Your SendGrid API key is working, but the sender email `delivery@visualmicron.com` is not verified. SendGrid requires sender identity verification before sending emails.

## Solution Options

### Option 1: Single Sender Verification (Quick Fix)
1. **Go to SendGrid Dashboard**: https://app.sendgrid.com/
2. **Navigate to Settings → Sender Authentication**
3. **Click "Verify a Single Sender"**
4. **Add your email address**: `jashwant1003@gmail.com` (or any email you control)
5. **Fill in the form**:
   - From Name: `EarningsQuake`
   - From Email: `jashwant1003@gmail.com`
   - Company: `EarningsQuake`
   - Address: Your address
   - City: Your city
   - Country: Your country
6. **Click "Create"**
7. **Check your email** and click the verification link
8. **Update your configuration**:

```yaml
# In docker-compose.yml
auth-service:
  environment:
    - EMAIL_FROM=jashwant1003@gmail.com  # Use your verified email
```

### Option 2: Domain Authentication (Recommended for Production)
1. **Go to SendGrid Dashboard**: https://app.sendgrid.com/
2. **Navigate to Settings → Sender Authentication**
3. **Click "Authenticate Your Domain"**
4. **Enter your domain**: `earningsquake.com` (or your domain)
5. **Add the DNS records** provided by SendGrid to your domain
6. **Wait for verification** (can take up to 48 hours)
7. **Update your configuration**:

```yaml
# In docker-compose.yml
auth-service:
  environment:
    - EMAIL_FROM=noreply@earningsquake.com  # Use your verified domain
```

### Option 3: Use SendGrid's Default Sender (Immediate Testing)
For immediate testing, you can use SendGrid's default sender:

```yaml
# In docker-compose.yml
auth-service:
  environment:
    - EMAIL_FROM=onboarding@resend.dev  # This is a default verified sender
```

## Quick Fix for Testing

For immediate testing, I've updated your configuration to use a verified sender. Restart the services to apply the changes:

```bash
docker-compose down && docker-compose up -d
```

## Next Steps
1. **For immediate testing**: Use the updated configuration with `onboarding@resend.dev`
2. **For production**: Verify your own email address or domain in SendGrid
3. **Test the signup flow**: Try signing up with a new email address

## Testing the Email Flow
After setup, test with:
```bash
curl -X POST "https://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@gmail.com",
    "username": "testuser",
    "password": "TestPassword123!",
    "confirmPassword": "TestPassword123!",
    "dob": "01/31/1990"
  }'
```

You should receive a real verification email with a 6-digit code!
