# 📧 SMTP Email Configuration Guide

Complete guide for setting up SMTP email in the PWIOI Placement Portal backend.

---

## 🔧 Environment Variables

Add these variables to your `backend/.env` file:

```env
# Email Service (SMTP) Configuration - Required
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_password

# Optional: display name for outgoing emails (defaults to PWIOI Portal <SMTP_USER>)
SMTP_FROM="PWIOI Portal <your@email.com>"
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
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password  # No spaces needed
```

---

## 📧 Other SMTP Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM="PWIOI Portal <your-email@outlook.com>"
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password  # Requires app password
SMTP_FROM="PWIOI Portal <your-email@yahoo.com>"
```

### Custom SMTP Server
```env
SMTP_HOST=smtp.your-domain.com
SMTP_PORT=587  # or 465 for SSL (secure is auto-detected from port)
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-smtp-password
SMTP_FROM="PWIOI Portal <noreply@your-domain.com>"
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM="PWIOI Portal <verified-email@your-domain.com>"
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_FROM="PWIOI Portal <noreply@your-domain.com>"
```

### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Change region if needed
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM="PWIOI Portal <verified-email@your-domain.com>"
```

---

## ⚙️ Configuration Details

### Port & Security
- **Port 587** (TLS) - Recommended, `secure` is auto-set to `false`
- **Port 465** (SSL) - `secure` is auto-set to `true` when port is 465
- **Port 25** (Not recommended, often blocked)

### SMTP_FROM Format
- Must include both name and email: `"Name <email@domain.com>"`
- Email must be verified (for Gmail, use your actual Gmail address)
- Optional; defaults to `PWIOI Portal <SMTP_USER>`

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
- **Solution**: Check that `SMTP_USER` and `SMTP_PASS` are set in `.env`
- Restart backend server after updating `.env`

### "Invalid login"
- **Solution**: Use App Password for Gmail, not regular password
- Make sure 2FA is enabled

### "Connection timeout"
- **Solution**: Check firewall/network settings
- Try port 465 (SSL) instead of 587

### "Self-signed certificate"
- **Solution**: Already handled in code with `rejectUnauthorized: false`
- For production, use proper SSL certificates

---

## 📝 Current Configuration

Check your current configuration:

```bash
cd backend/
grep "^SMTP_" .env
```

---

## 📋 Deployment (Vercel / Production)

Ensure these environment variables are set:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (optional)

**Legacy variables removed** (do not use):
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `EMAIL_SECURE`

---

**Need help?** Check backend server logs for detailed error messages.
