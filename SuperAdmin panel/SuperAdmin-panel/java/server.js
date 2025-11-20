import express from 'express';
import nodemailer from 'nodemailer';

const app = express();

// Manual CORS middleware - MUST be first
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS preflight');
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

var transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "dc1dce1b7c750e",
    pass: "04d62face03156"
  }
});

app.post('/api/send-email', async (req, res) => {
  console.log('📧 Received email request:', req.body);
  
  try {
    const result = await transport.sendMail({
      from: '"UDM Facility Reservation" <facility.reservation12@gmail.com>',
      to: req.body.to,
      subject: req.body.subject,
      html: req.body.html
    });
    
    console.log('✅ Email sent:', result.messageId);
    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(8000, () => {
  console.log('🚀 Server running on http://localhost:8000');
});