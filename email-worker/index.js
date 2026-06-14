import express from 'express';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(express.json());

// Simple auth using shared secret header
app.use((req, res, next) => {
  const expected = process.env.EMAIL_WORKER_SECRET;
  if (!expected) {
    console.error('[Worker] EMAIL_WORKER_SECRET is not set.');
    return res.status(500).json({ error: 'worker not configured' });
  }
  if (req.headers['x-worker-secret'] !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

const port = process.env.PORT || 4000;

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('[Worker] ⚠️ SMTP env vars not fully set. Emails will fail until configured.');
}

const smtpPort = Number(process.env.SMTP_PORT) || 587;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post('/internal/send-email', async (req, res) => {
  try {
    const { to, subject, html, text, from } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'to, subject and html/text are required' });
    }

    const mailFrom =
      from ||
      process.env.SMTP_FROM ||
      (process.env.SMTP_USER ? `PWIOI Portal <${process.env.SMTP_USER}>` : undefined);

    const info = await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      html,
      text,
    });

    console.log('[Worker] Email sent:', info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('[Worker] Email error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`[Worker] Email worker listening on port ${port}`);
});

