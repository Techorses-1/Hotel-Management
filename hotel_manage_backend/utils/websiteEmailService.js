// utils/websiteEmailService.js - FIXED
const nodemailer = require("nodemailer");

// Create transporter function
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

// Send booking confirmation to user
const sendWebsiteUserConfirmation = async (bookingData) => {
    const { name, email, phone, bookingNumber, bookingDate, bookingTime } = bookingData;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
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
          margin-bottom: 8px;
        }
        .greeting span {
          color: #3d52a0;
        }
        .sub-text {
          color: #55556a;
          font-size: 15px;
          line-height: 1.7;
          margin-bottom: 30px;
        }
        .booking-details {
          background: #ede8f5;
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 30px;
        }
        .booking-details .row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(61, 82, 160, 0.1);
        }
        .booking-details .row:last-child {
          border-bottom: none;
        }
        .booking-details .label {
          font-weight: 600;
          color: #3d52a0;
          font-size: 14px;
        }
        .booking-details .value {
          color: #24243e;
          font-weight: 500;
          font-size: 14px;
        }
        .status-badge {
          display: inline-block;
          background: #f39c12;
          color: #ffffff;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .message-box {
          background: #f8f9fa;
          border-left: 4px solid #3d52a0;
          padding: 16px 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .message-box p {
          color: #55556a;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
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
          .booking-details { padding: 18px 16px; }
          .booking-details .row { flex-direction: column; gap: 4px; }
          .header h1 { font-size: 22px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Booking Received!</h1>
          <p>We're excited to have you with us</p>
        </div>
        <div class="content">
          <p class="greeting">Dear <span>${name}</span>,</p>
          <p class="sub-text">
            Thank you for choosing Techorses! We've received your booking request and our team will get back to you within 2 hours.
          </p>

          <div class="booking-details">
            <div class="row">
              <span class="label">Booking ID :</span>
              <span class="value">${bookingNumber}</span>
            </div>
            <div class="row">
              <span class="label">Date :</span>
              <span class="value">${new Date(bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div class="row">
              <span class="label">Time :</span>
              <span class="value">${bookingTime}</span>
            </div>
            <div class="row">
              <span class="label">Phone :</span>
              <span class="value">${phone}</span>
            </div>
            <div class="row">
              <span class="label">Email :</span>
              <span class="value">${email}</span>
            </div>
            <div class="row">
              <span class="label">Status :</span>
              <span class="value"><span class="status-badge">Pending</span></span>
            </div>
          </div>

          <div class="message-box">
            <p><strong>📌 Next Steps:</strong> Our team will review your booking and confirm availability. You'll receive a confirmation email shortly.</p>
          </div>

          <p style="color: #55556a; font-size: 14px; line-height: 1.6;">
            If you have any questions, feel free to reach out to us at 
            <a href="mailto:${process.env.EMAIL_USER}" style="color: #3d52a0; text-decoration: none; font-weight: 600;">${process.env.EMAIL_USER}</a>
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
            subject: `Booking Confirmation - ${bookingNumber}`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ User email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ User email sending failed:", error);
        return { success: false, error: error.message };
    }
};

// Send admin notification
const sendWebsiteAdminNotification = async (bookingData) => {
    const { name, email, phone, bookingNumber, bookingDate, bookingTime } = bookingData;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Booking Alert</title>
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
        .booking-details {
          background: #f8f9fa;
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 24px;
        }
        .booking-details .row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .booking-details .row:last-child { border-bottom: none; }
        .booking-details .label {
          font-weight: 600;
          color: #3d52a0;
          font-size: 14px;
        }
        .booking-details .value {
          color: #24243e;
          font-weight: 500;
          font-size: 14px;
        }
        .status-badge {
          display: inline-block;
          background: #f39c12;
          color: #ffffff;
          padding: 3px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
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
          .booking-details .row { flex-direction: column; gap: 2px; }
          .header h1 { font-size: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking Alert!</h1>
          <p>A new website booking request has been received</p>
        </div>
        <div class="content">
          <div class="alert-box">
            <p><strong>⚠️ Action Required:</strong> A new booking needs your attention. Please review and confirm availability.</p>
          </div>

          <div class="booking-details">
            <div class="row">
              <span class="label">Booking ID :</span>
              <span class="value">${bookingNumber}</span>
            </div>
            <div class="row">
              <span class="label">Guest Name :</span>
              <span class="value">${name}</span>
            </div>
            <div class="row">
              <span class="label">Phone :</span>
              <span class="value">${phone}</span>
            </div>
            <div class="row">
              <span class="label">Email :</span>
              <span class="value">${email}</span>
            </div>
            <div class="row">
              <span class="label">Booking :</span>
              <span class="value">${new Date(bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div class="row">
              <span class="label">Booking Time :</span>
              <span class="value">${bookingTime}</span>
            </div>
            <div class="row">
              <span class="label">Status</span>
              <span class="value"><span class="status-badge">Pending</span></span>
            </div>
          </div>

          <p style="color: #55556a; font-size: 14px; line-height: 1.6;">
            Please log in to the admin panel to view and manage this booking.
          </p>
        </div>
        <div class="footer">
          <p>Techorses Hotel Website Booking System</p>
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
            subject: `New Website Booking Alert - ${bookingNumber}`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Admin email sent: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Admin email sending failed:", error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendWebsiteUserConfirmation,
    sendWebsiteAdminNotification
};