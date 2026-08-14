// utils/contactEmailService.js
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

// Send thank you email to user
const sendContactUserThankYou = async (contactData) => {
    const { name, email, subject, message } = contactData;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Contacting Us</title>
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
        .message-box .label {
          font-weight: 600;
          color: #3d52a0;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .message-box .content-text {
          color: #24243e;
          font-size: 14px;
          line-height: 1.6;
          margin-top: 6px;
        }
        .details {
          background: #ede8f5;
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 24px;
        }
        .details .row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid rgba(61, 82, 160, 0.1);
        }
        .details .row:last-child { border-bottom: none; }
        .details .label {
          font-weight: 600;
          color: #3d52a0;
          font-size: 13px;
        }
        .details .value {
          color: #24243e;
          font-size: 13px;
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
          .details .row { flex-direction: column; gap: 2px; }
          .header h1 { font-size: 22px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Thank You for Reaching Out!</h1>
          <p>We've received your message and will get back to you soon</p>
        </div>
        <div class="content">
          <p class="greeting">Dear <span>${name}</span>,</p>
          <p class="sub-text">
            Thank you for contacting Techorses Hotel. We have received your message 
            and our team will review it shortly. We typically respond within 2 hours.
          </p>

          <div class="message-box">
            <div class="label">Your Message:</div>
            <div class="content-text">"${message}"</div>
          </div>

          <div class="details">
            <div class="row">
              <span class="label">Subject</span>
              <span class="value">${subject}</span>
            </div>
            <div class="row">
              <span class="label">Email</span>
              <span class="value">${email}</span>
            </div>
            <div class="row">
              <span class="label">Submitted</span>
              <span class="value">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <p style="color: #55556a; font-size: 14px; line-height: 1.6;">
            If you need immediate assistance, please call us at 
            <a href="tel:+919876543210" style="color: #3d52a0; text-decoration: none; font-weight: 600;">+91 98765 43210</a>
          </p>
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
            subject: `Thank You for Contacting Us - ${subject}`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Contact user email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Contact user email failed:", error);
        return { success: false, error: error.message };
    }
};

// Send admin notification
const sendContactAdminNotification = async (contactData) => {
    const { name, email, subject, message } = contactData;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission</title>
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
          background: #e74c3c;
          padding: 35px 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          font-size: 26px;
          font-weight: 700;
          margin: 0;
        }
        .header p {
          color: rgba(255, 255, 255, 0.85);
          font-size: 15px;
          margin: 6px 0 0;
        }
        .content { padding: 35px 30px; }
        .alert-box {
          background: #fef9e7;
          border-left: 4px solid #f39c12;
          padding: 14px 18px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .alert-box p {
          color: #7d6608;
          font-size: 14px;
          margin: 0;
        }
        .details {
          background: #f8f9fa;
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 24px;
        }
        .details .row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .details .row:last-child { border-bottom: none; }
        .details .label {
          font-weight: 600;
          color: #3d52a0;
          font-size: 14px;
        }
        .details .value {
          color: #24243e;
          font-weight: 500;
          font-size: 14px;
        }
        .message-box {
          background: #fff5f5;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
          border: 1px solid #fce4e4;
        }
        .message-box .label {
          font-weight: 600;
          color: #c0392b;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .message-box .content-text {
          color: #24243e;
          font-size: 14px;
          line-height: 1.6;
          margin-top: 6px;
        }
        .footer {
          text-align: center;
          padding: 20px 30px 24px;
          border-top: 1px solid #ede8f5;
        }
        .footer p {
          color: #8697c4;
          font-size: 13px;
          margin: 0;
        }
        @media (max-width: 480px) {
          .content { padding: 20px 16px; }
          .details .row { flex-direction: column; gap: 2px; }
          .header h1 { font-size: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📩 New Contact Form Submission</h1>
          <p>A new message has been received from the website</p>
        </div>
        <div class="content">
          <div class="alert-box">
            <p><strong>⚠️ Action Required:</strong> A new contact form submission needs your attention. Please review and respond.</p>
          </div>

          <div class="details">
            <div class="row">
              <span class="label">Name</span>
              <span class="value">${name}</span>
            </div>
            <div class="row">
              <span class="label">Email</span>
              <span class="value">${email}</span>
            </div>
            <div class="row">
              <span class="label">Subject</span>
              <span class="value">${subject}</span>
            </div>
            <div class="row">
              <span class="label">Submitted</span>
              <span class="value">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div class="message-box">
            <div class="label">📝 Message:</div>
            <div class="content-text">${message}</div>
          </div>

          <p style="color: #55556a; font-size: 14px; line-height: 1.6;">
            <strong>Quick Actions:</strong><br/>
            📧 Reply to: <a href="mailto:${email}" style="color: #3d52a0; text-decoration: none; font-weight: 600;">${email}</a><br/>
            📞 Call: <a href="tel:${email}" style="color: #3d52a0; text-decoration: none; font-weight: 600;">Call Customer</a>
          </p>
        </div>
        <div class="footer">
          <p>Techorses Hotel - Contact Form System</p>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Techorses Hotel" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `New Contact Form: ${subject}`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Contact admin email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Contact admin email failed:", error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendContactUserThankYou,
    sendContactAdminNotification
};