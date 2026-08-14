// routes/websiteBookingRoutes.js
const express = require("express");
const router = express.Router();
const WebsiteBooking = require("../models/WebsiteBooking");
const { sendWebsiteUserConfirmation, sendWebsiteAdminNotification } = require("../utils/websiteEmailService");

// ============================================
// POST /create-website-booking - Create new website booking
// ============================================
router.post("/create-website-booking", async (req, res) => {
    try {
        const { name, phone, email } = req.body;

        // Validate required fields
        if (!name || !phone || !email) {
            return res.status(400).json({
                success: false,
                message: "Name, phone and email are required"
            });
        }

        // Validate phone number format (exactly 10 digits)
        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be exactly 10 digits"
            });
        }

        // Validate email format
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Check for duplicate booking with same phone within 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingBooking = await WebsiteBooking.findOne({
            phone: phone,
            createdAt: { $gte: twentyFourHoursAgo }
        });

        if (existingBooking) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted a booking request within the last 24 hours. Please wait before submitting again.",
                existingBooking: {
                    bookingNumber: existingBooking.bookingNumber,
                    createdAt: existingBooking.createdAt
                }
            });
        }

        // Create new booking
        const booking = new WebsiteBooking({
            name,
            phone,
            email
        });

        const savedBooking = await booking.save();

        // Send emails (don't wait for response, but catch errors)
        try {
            await Promise.all([
                sendWebsiteUserConfirmation(savedBooking),
                sendWebsiteAdminNotification(savedBooking)
            ]);
        } catch (emailError) {
            console.error("Email sending error:", emailError);
            // Continue even if email fails - booking is saved
        }

        res.status(201).json({
            success: true,
            message: "Booking created successfully! We'll get back to you within 2 hours.",
            data: {
                bookingId: savedBooking.bookingId,
                bookingNumber: savedBooking.bookingNumber,
                name: savedBooking.name,
                phone: savedBooking.phone,
                email: savedBooking.email,
                status: savedBooking.status,
                bookingDate: savedBooking.bookingDate,
                bookingTime: savedBooking.bookingTime
            }
        });

    } catch (error) {
        console.error("Error creating website booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create booking",
            error: error.message
        });
    }
});

// ============================================
// GET /get-website-bookings - Get all website bookings (Admin only)
// ============================================
router.get("/get-website-bookings", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            startDate = '',
            endDate = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = {};

        // Search by name, phone, email, or booking number
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query.$or = [
                { name: { $regex: searchTerm, $options: 'i' } },
                { phone: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { bookingNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        // ✅ FIXED: Date filter with IST timezone - EXACT DATE MATCH
        if (startDate || endDate) {
            query.bookingDate = {};

            if (startDate) {
                const dateParts = startDate.split('-');
                const start = new Date(Date.UTC(
                    parseInt(dateParts[0]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[2]),
                    0, 0, 0
                ));
                start.setHours(start.getHours() + 5, start.getMinutes() + 30);
                query.bookingDate.$gte = start;
            }

            if (endDate) {
                const dateParts = endDate.split('-');
                const end = new Date(Date.UTC(
                    parseInt(dateParts[0]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[2]),
                    23, 59, 59
                ));
                end.setHours(end.getHours() + 5, end.getMinutes() + 30);
                query.bookingDate.$lte = end;
            }
        }

        // Build sort object
        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Get total count for pagination
        const total = await WebsiteBooking.countDocuments(query);

        // Get paginated results
        const bookings = await WebsiteBooking.find(query)
            .sort(sortObj)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .select('-__v')
            .lean();

        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: bookings,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            },
            filters: {
                search: search || null,
                status: status || null,
                startDate: startDate || null,
                endDate: endDate || null,
                sortBy,
                sortOrder
            }
        });

    } catch (error) {
        console.error("Error fetching website bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch bookings",
            error: error.message
        });
    }
});

// ============================================
// GET /get-website-booking/:id - Get single website booking
// ============================================
router.get("/get-website-booking/:id", async (req, res) => {
    try {
        const booking = await WebsiteBooking.findOne({
            $or: [
                { bookingId: req.params.id },
                { bookingNumber: req.params.id }
            ]
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.error("Error fetching website booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking",
            error: error.message
        });
    }
});

// ============================================
// PUT /update-website-booking/:id - Update website booking status
// ============================================
router.put("/update-website-booking/:id", async (req, res) => {
    try {
        const { status, adminNotes } = req.body;

        const booking = await WebsiteBooking.findOne({ bookingId: req.params.id });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const oldStatus = booking.status;

        // Update fields
        if (status) booking.status = status;
        if (adminNotes !== undefined) booking.adminNotes = adminNotes;
        booking.updatedAt = new Date();

        await booking.save();

        res.status(200).json({
            success: true,
            message: "Booking updated successfully",
            data: booking
        });

    } catch (error) {
        console.error("Error updating website booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking",
            error: error.message
        });
    }
});

// ============================================
// DELETE /delete-website-booking/:id - Delete website booking
// ============================================
router.delete("/delete-website-booking/:id", async (req, res) => {
    try {
        const booking = await WebsiteBooking.findOne({ bookingId: req.params.id });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        await WebsiteBooking.findOneAndDelete({ bookingId: req.params.id });

        res.status(200).json({
            success: true,
            message: "Booking deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting website booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete booking",
            error: error.message
        });
    }
});

// ============================================
// GET /get-website-booking-stats - Get website booking statistics
// ============================================
router.get("/get-website-booking-stats", async (req, res) => {
    try {
        const stats = await WebsiteBooking.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = await WebsiteBooking.countDocuments();

        // Get today's bookings
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayCount = await WebsiteBooking.countDocuments({
            createdAt: { $gte: today, $lt: tomorrow }
        });

        res.status(200).json({
            success: true,
            data: {
                total,
                today: todayCount,
                byStatus: stats.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error("Error fetching website booking stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking stats",
            error: error.message
        });
    }
});

module.exports = router;