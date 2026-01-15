# OTP System Documentation

## Overview
Industry-standard OTP (One-Time Password) implementation with rate limiting and automatic expiration.

## Configuration

All OTP settings are configurable via `.env` file:

```env
# OTP expires after 5 minutes (industry standard: 2-10 minutes)
OTP_EXPIRATION_MINUTES=5

# Cooldown between requests: 60 seconds (prevents spam)
OTP_COOLDOWN_SECONDS=60

# Rate limit: 5 OTP requests per 10 minutes per email
OTP_MAX_ATTEMPTS=5
OTP_DECAY_MINUTES=10

# Auto cleanup expired OTPs (runs hourly via scheduler)
OTP_AUTO_CLEANUP=true

# Pending user registration expires after 24 hours
PENDING_USER_EXPIRATION_HOURS=24
```

## Rate Limits

### OTP Generation Endpoints
- **Register**: 5 requests per 10 minutes
- **Resend OTP**: 5 requests per 10 minutes
- **Forgot Password**: 5 requests per 10 minutes
- **Cooldown**: 60 seconds between successive requests

### Verification Endpoints
- **Verify OTP**: 10 attempts per minute
- **Verify Reset OTP**: 10 attempts per minute
- **Login**: 5 attempts per minute
- **Reset Password**: 5 attempts per minute

## Automatic Cleanup

Expired OTPs are automatically deleted:

### Via Scheduler (Recommended)
Runs every hour automatically:
```bash
# Ensure Laravel scheduler is running
php artisan schedule:work
```

### Manual Cleanup
```bash
php artisan otp:cleanup
```

## API Responses

### Rate Limit Exceeded (429)
```json
{
  "message": "Too many OTP requests. Please try again in 8 minute(s).",
  "retry_after": 480
}
```

### Cooldown Active (429)
```json
{
  "message": "Please wait 45 seconds before requesting another OTP.",
  "retry_after": 45
}
```

### Expired OTP (422)
```json
{
  "message": "Invalid or expired OTP"
}
```

## Security Features

1. **Email-based rate limiting** - Prevents spam to specific email addresses
2. **Cooldown periods** - Forces wait time between requests
3. **Automatic expiration** - OTPs expire after configured time
4. **One-time use** - OTPs are marked as used after verification
5. **Purpose-specific** - Different OTP types (GENERAL, PASSWORD_RESET, RESET_TOKEN)

## Production Setup

### Enable Scheduler
Add to your crontab:
```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

### Adjust Limits for Production
Consider stricter limits for production:
```env
OTP_EXPIRATION_MINUTES=3
OTP_COOLDOWN_SECONDS=90
OTP_MAX_ATTEMPTS=3
OTP_DECAY_MINUTES=15
```

## Monitoring

Check logs for OTP cleanup activity:
```bash
tail -f storage/logs/laravel.log | grep "OTP Cleanup"
```
