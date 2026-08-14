// routes/newsletterRoutes.js
const express = require("express");
const router = express.Router();
const Newsletter = require("../models/Newsletter");
const { sendNewsletterWelcomeEmail } = require("../utils/newsletterEmailService");

// ============================================
// POST /subscribe - Subscribe to newsletter
// ============================================
router.post("/subscribe", async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Validate email format
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Check if email already exists
        const existingSubscription = await Newsletter.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingSubscription) {
            // If exists but inactive, reactivate
            if (!existingSubscription.isActive) {
                existingSubscription.isActive = true;
                existingSubscription.updatedAt = new Date();
                await existingSubscription.save();

                // Send welcome email
                await sendNewsletterWelcomeEmail(email);

                return res.status(200).json({
                    success: true,
                    message: "You have been resubscribed successfully!",
                    data: existingSubscription
                });
            }

            return res.status(400).json({
                success: false,
                message: "This email is already subscribed to our newsletter."
            });
        }

        // Create new subscription
        const subscription = new Newsletter({
            email: email.toLowerCase().trim()
        });

        const savedSubscription = await subscription.save();

        // Send welcome email
        await sendNewsletterWelcomeEmail(email);

        res.status(201).json({
            success: true,
            message: "Successfully subscribed to our newsletter!",
            data: savedSubscription
        });

    } catch (error) {
        console.error("Error subscribing to newsletter:", error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "This email is already subscribed to our newsletter."
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to subscribe to newsletter",
            error: error.message
        });
    }
});

// ============================================
// POST /unsubscribe - Unsubscribe from newsletter
// ============================================
router.post("/unsubscribe", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const subscription = await Newsletter.findOne({
            email: email.toLowerCase().trim()
        });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Email not found in our subscription list"
            });
        }

        if (!subscription.isActive) {
            return res.status(400).json({
                success: false,
                message: "This email is already unsubscribed"
            });
        }

        subscription.isActive = false;
        subscription.updatedAt = new Date();
        await subscription.save();

        res.status(200).json({
            success: true,
            message: "Successfully unsubscribed from our newsletter"
        });

    } catch (error) {
        console.error("Error unsubscribing from newsletter:", error);
        res.status(500).json({
            success: false,
            message: "Failed to unsubscribe",
            error: error.message
        });
    }
});

// ============================================
// GET /subscribers - Get all subscribers (Admin only)
// ============================================
router.get("/subscribers", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            isActive = '',
            sortBy = 'subscribedAt',
            sortOrder = 'desc'
        } = req.query;

        let query = {};

        if (search && search.trim() !== '') {
            query.email = { $regex: search.trim(), $options: 'i' };
        }

        if (isActive !== '') {
            query.isActive = isActive === 'true';
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const total = await Newsletter.countDocuments(query);

        const subscribers = await Newsletter.find(query)
            .sort(sortObj)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .select('-__v')
            .lean();

        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: subscribers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error("Error fetching subscribers:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subscribers",
            error: error.message
        });
    }
});

// ============================================
// GET /subscriber-count - Get subscriber statistics
// ============================================
router.get("/subscriber-count", async (req, res) => {
    try {
        const total = await Newsletter.countDocuments();
        const active = await Newsletter.countDocuments({ isActive: true });
        const inactive = await Newsletter.countDocuments({ isActive: false });

        // Get today's subscribers
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayCount = await Newsletter.countDocuments({
            subscribedAt: { $gte: today, $lt: tomorrow }
        });

        res.status(200).json({
            success: true,
            data: {
                total,
                active,
                inactive,
                today: todayCount
            }
        });

    } catch (error) {
        console.error("Error fetching subscriber stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subscriber stats",
            error: error.message
        });
    }
});

module.exports = router;