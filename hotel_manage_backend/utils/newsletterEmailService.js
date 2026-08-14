// utils/newsletterEmailService.js
const nodemailer = require("nodemailer");

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send newsletter welcome email to user
const sendNewsletterWelcomeEmail = async (email) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Newsletter Subscription</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f7fa;
          padding: 40px 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: #3d52a0;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .header p {
          color: rgba(255, 255, 255, 0.85);
          font-size: 16px;
          margin: 8px 0 0;
        }
        .content {
          padding: 40px 35px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #24243e;
          margin-bottom: 12px;
        }
        .greeting span {
          color: #3d52a0;
        }
        .sub-text {
          color: #55556a;
          font-size: 15px;
          line-height: 1.7;
          margin-bottom: 24px;
        }
        .message-box {
          background: #f8f9fa;
          border-left: 4px solid #3d52a0;
          padding: 16px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .message-box p {
          color: #55556a;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
        }
        .features {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .feature-icon {
          color: #3d52a0;
          font-size: 20px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .feature-text {
          color: #55556a;
          font-size: 14px;
          line-height: 1.6;
        }
        .footer {
          text-align: center;
          padding: 24px 35px 30px;
          border-top: 1px solid #ede8f5;
        }
        .footer p {
          color: #8697c4;
          font-size: 13px;
          margin: 0 0 6px;
        }
        .footer .brand {
          color: #3d52a0;
          font-weight: 700;
          font-size: 16px;
        }
        .footer .brand span {
          color: #7091e6;
        }
        @media (max-width: 480px) {
          .content { padding: 24px 20px; }
          .header h1 { font-size: 22px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Welcome to Techorses!</h1>
          <p>You're now subscribed to our newsletter</p>
        </div>
        <div class="content">
          <p class="greeting">Hello <span>${email.split('@')[0]}</span>,</p>
          <p class="sub-text">
            Thank you for subscribing to the Techorses Hotel newsletter! 
            You'll now receive exclusive offers, updates, and special deals 
            straight to your inbox.
          </p>

          <div class="message-box">
            <p><strong>🎉 What to expect:</strong></p>
          </div>

          <div class="features">
            <div class="feature-item">
              <span class="feature-icon">✨</span>
              <span class="feature-text">Exclusive discounts and special offers</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🏨</span>
              <span class="feature-text">New room updates and availability alerts</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎪</span>
              <span class="feature-text">Events, promotions, and local recommendations</span>
            </div>
          </div>

        
        </div>
        <div class="footer">
          <p class="brand">Techorses <span>Hotel</span></p>
          <p>B-224, Samanvay Silicon, Opp Kalyan Hotel, Vadodara</p>
          <p style="margin-top: 8px;">© ${new Date().getFullYear()} Techorses. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: `"Techorses Hotel" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to Techorses Newsletter! 🎉",
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Newsletter welcome email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Newsletter email sending failed:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNewsletterWelcomeEmail
};