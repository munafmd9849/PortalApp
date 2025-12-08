/**
 * Test Email Script
 * Sends a test email to verify SMTP configuration
 */

import dotenv from 'dotenv';
import { sendOTP } from './src/services/emailService.js';

dotenv.config();

async function testEmail() {
  try {
    console.log('📧 Testing email configuration...');
    console.log('');
    console.log('Configuration:');
    console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
    console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
    console.log('  EMAIL_USER:', process.env.EMAIL_USER);
    console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
    console.log('');

    const testEmail = process.argv[2] || 'mibosa3149@delaeb.com';
    const testOTP = '123456';

    console.log(`Sending test OTP email to: ${testEmail}...`);
    console.log('');

    const result = await sendOTP(testEmail, testOTP);
    
    console.log('✅ Test email sent successfully!');
    console.log('Response:', result);
    console.log('');
    console.log(`Check your inbox: ${testEmail}`);
    console.log('OTP Code: 123456');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test email failed!');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
    if (error.command) {
      console.error('Command:', error.command);
    }
    console.error('');
    console.error('Possible issues:');
    console.error('  1. Gmail App Password is incorrect');
    console.error('  2. 2FA not enabled on Gmail');
    console.error('  3. EMAIL_USER or EMAIL_PASS not set in .env');
    console.error('  4. Network/firewall blocking SMTP connection');
    
    process.exit(1);
  }
}

testEmail();
