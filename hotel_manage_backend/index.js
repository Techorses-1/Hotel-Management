const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./config/mongodb");
require("dotenv").config();
const path = require("path");

process.env.TZ = 'Asia/Kolkata';

const app = express();

// Connect to MongoDB
connectDB();

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://hotel-management-lovat.vercel.app",
            "https://hotel-site-alpha-sepia.vercel.app",
        ],
        credentials: true,
    })
);

// Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ SERVE STATIC FILES - ADD THIS!
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== IMPORT ROUTES ==========
const customerRoutes = require("./routes/customerRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require('./routes/admin');
const promoCodesRoutes = require('./routes/promoCodes');

// ========== NEW ROUTES FOR HOTEL MANAGEMENT ==========
const categoryRoutes = require("./routes/categoryRoutes");
const roomRoutes = require("./routes/roomRoutes");
const checkinRoutes = require("./routes/checkInRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const checkoutRoutes = require("./routes/checkOutRoutes");
const houseKeepingRoutes = require("./routes/housekeepingRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const expenseRoutes = require("./routes/expenseRoutes");


// HOTEL WEBSITE BOOKING AND NEWSLETTER ROUTES

const websiteBookingRoutes = require("./routes/websiteBookingRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const contactRoutes = require("./routes/contactRoutes");



// ========== USE ROUTES ==========
app.use('/customer', customerRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/promo', promoCodesRoutes);

// ========== USE NEW ROUTES ==========
app.use('/category', categoryRoutes);    // Category routes
app.use('/room', roomRoutes);            // Room routes
app.use('/checkin', checkinRoutes);
app.use('/booking', bookingRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/housekeeping', houseKeepingRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/reports', reportsRoutes);
app.use('/expense', expenseRoutes);


app.use('/website-booking', websiteBookingRoutes);
app.use('/newsletter', newsletterRoutes);
app.use('/contact', contactRoutes);



// Test route
app.get("/", (req, res) => {
    res.send("Hotel Management Software is Running OK! 🏨");
});

const PORT = process.env.PORT || 4060;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:4060`);
    console.log(`📁 Uploads folder: ${path.join(__dirname, 'uploads')}`);
});