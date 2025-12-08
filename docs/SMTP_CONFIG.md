# 📧 SMTP Email Configuration Guide

Complete guide for setting up SMTP email in the PWIOI Placement Portal backend.

---

## 🔧 Environment Variables

Add these variables to your `backend/.env` file:

```env
# Email Service (SMTP) Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="PWIOI Portal <your-email@gmail.com>"
```

---

## 📋 Gmail SMTP Setup

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter name: "PWIOI Portal"
5. Click **Generate**
6. Copy the 16-character password (spaces will be removed automatically)

### Step 3: Update .env
```env
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-16-character-app-password"  # No spaces needed
```

---

## 📧 Other SMTP Providers

### Outlook/Hotmail
```env
EMAIL_HOST="smtp-mail.outlook.com"
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER="your-email@outlook.com"
EMAIL_PASS="your-password"
EMAIL_FROM="PWIOI Portal <your-email@outlook.com>"
```

### Yahoo Mail
```env
EMAIL_HOST="smtp.mail.yahoo.com"
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER="your-email@yahoo.com"
EMAIL_PASS="your-app-password"  # Requires app password
EMAIL_FROM="PWIOI Portal <your-email@yahoo.com>"
```

### Custom SMTP Server
```env
EMAIL_HOST="smtp.your-domain.com"
EMAIL_PORT=587  # or 465 for SSL
EMAIL_SECURE="false"  # true for port 465, false for 587
EMAIL_USER="noreply@your-domain.com"
EMAIL_PASS="your-smtp-password"
EMAIL_FROM="PWIOI Portal <noreply@your-domain.com>"
```

### SendGrid
```env
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER="apikey"
EMAIL_PASS="your-sendgrid-api-key"
EMAIL_FROM="PWIOI Portal <verified-email@your-domain.com>"
```

### Mailgun
```env
EMAIL_HOST="smtp.mailgun.org"
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER="postmaster@your-domain.mailgun.org"
EMAIL_PASS="your-mailgun-password"
EMAIL_FROM="PWIOI Portal <noreply@your-domain.com>"
```

### AWS SES
```env
EMAIL_HOST="email-smtp.us-east-1.amazonaws.com"  # Change region if needed
EMAIL_PORT=587
EMAIL_SECURE="false"
EMAIL_USER="your-ses-smtp-username"
EMAIL_PASS="your-ses-smtp-password"
EMAIL_FROM="PWIOI Portal <verified-email@your-domain.com>"
```

---

## ⚙️ Configuration Details

### Port & Security
- **Port 587** (TLS) - Recommended: `EMAIL_SECURE="false"`
- **Port 465** (SSL) - Use: `EMAIL_SECURE="true"`
- **Port 25** (Not recommended, often blocked)

### EMAIL_FROM Format
- Must include both name and email: `"Name <email@domain.com>"`
- Email must be verified (for Gmail, use your actual Gmail address)

---

## ✅ Verification

After setting up, restart your backend server:

```bash
cd backend/
npm run dev
```

You should see in the logs:
- `✅ Email transporter is ready` - Configuration is correct
- `❌ Email transporter verification failed: ...` - Check credentials

---

## 🧪 Testing

Test the email configuration:

```bash
# Using curl
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Or use the frontend registration form - it will automatically send an OTP email.

---

## 🔒 Security Notes

1. **Never commit `.env` file** to version control
2. **Use App Passwords** for Gmail (not your regular password)
3. **Rotate passwords** regularly
4. **Use environment-specific** email accounts for production

---

## ❌ Common Issues

### "Missing credentials for PLAIN"
- **Solution**: Check that `EMAIL_USER` and `EMAIL_PASS` are set in `.env`
- Restart backend server after updating `.env`

### "Invalid login"
- **Solution**: Use App Password for Gmail, not regular password
- Make sure 2FA is enabled

### "Connection timeout"
- **Solution**: Check firewall/network settings
- Try port 465 with `EMAIL_SECURE="true"`

### "Self-signed certificate"
- **Solution**: Already handled in code with `rejectUnauthorized: false`
- For production, use proper SSL certificates

---

## 📝 Current Configuration

Check your current configuration:

```bash
cd backend/
grep "^EMAIL_" .env
```

---

**Need help?** Check backend server logs for detailed error messages.
