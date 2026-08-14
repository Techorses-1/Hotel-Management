// routes/contactRoutes.js
const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");
const { sendContactUserThankYou, sendContactAdminNotification } = require("../utils/contactEmailService");

// ============================================
// POST /create-contact - Create new contact form submission
// ============================================
router.post("/create-contact", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Validate email format
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Create new contact
        const contact = new Contact({
            name,
            email,
            subject,
            message
        });

        const savedContact = await contact.save();

        // Send emails
        try {
            await Promise.all([
                sendContactUserThankYou(savedContact),
                sendContactAdminNotification(savedContact)
            ]);
        } catch (emailError) {
            console.error("Email sending error:", emailError);
            // Continue even if email fails - contact is saved
        }

        res.status(201).json({
            success: true,
            message: "Message sent successfully! We'll get back to you within 2 hours.",
            data: {
                contactId: savedContact.contactId,
                name: savedContact.name,
                email: savedContact.email,
                subject: savedContact.subject,
                status: savedContact.status
            }
        });

    } catch (error) {
        console.error("Error creating contact:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send message",
            error: error.message
        });
    }
});

// ============================================
// GET /get-contacts - Get all contacts (Admin)
// ============================================
router.get("/get-contacts", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            isRead = '',
            startDate = '',
            endDate = '',
            sortBy = 'submittedAt',
            sortOrder = 'desc'
        } = req.query;

        let query = {};

        // Search by name, email, subject
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query.$or = [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { subject: { $regex: searchTerm, $options: 'i' } },
                { message: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        if (status && status !== 'all') {
            query.status = status;
        }

        if (isRead !== '') {
            query.isRead = isRead === 'true';
        }

        // ✅ FIXED: Date filter with IST timezone - EXACT DATE MATCH
        if (startDate || endDate) {
            query.submittedAt = {};

            if (startDate) {
                const dateParts = startDate.split('-');
                const start = new Date(Date.UTC(
                    parseInt(dateParts[0]),
                    parseInt(dateParts[1]) - 1,
                    parseInt(dateParts[2]),
                    0, 0, 0
                ));
                start.setHours(start.getHours() + 5, start.getMinutes() + 30);
                query.submittedAt.$gte = start;
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
                query.submittedAt.$lte = end;
            }
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const total = await Contact.countDocuments(query);

        const contacts = await Contact.find(query)
            .sort(sortObj)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .select('-__v')
            .lean();

        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: contacts,
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
        console.error("Error fetching contacts:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch contacts",
            error: error.message
        });
    }
});

// ============================================
// GET /get-contact/:id - Get single contact
// ============================================
router.get("/get-contact/:id", async (req, res) => {
    try {
        const contact = await Contact.findOne({ contactId: req.params.id });

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found"
            });
        }

        // Mark as read
        if (!contact.isRead) {
            contact.isRead = true;
            await contact.save();
        }

        res.status(200).json({
            success: true,
            data: contact
        });

    } catch (error) {
        console.error("Error fetching contact:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch contact",
            error: error.message
        });
    }
});

// ============================================
// PUT /update-contact/:id - Update contact status
// ============================================
router.put("/update-contact/:id", async (req, res) => {
    try {
        const { status, adminNotes } = req.body;

        const contact = await Contact.findOne({ contactId: req.params.id });
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found"
            });
        }

        if (status) contact.status = status;
        if (adminNotes !== undefined) contact.adminNotes = adminNotes;
        contact.updatedAt = new Date();

        await contact.save();

        res.status(200).json({
            success: true,
            message: "Contact updated successfully",
            data: contact
        });

    } catch (error) {
        console.error("Error updating contact:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update contact",
            error: error.message
        });
    }
});

// ============================================
// DELETE /delete-contact/:id - Delete contact
// ============================================
router.delete("/delete-contact/:id", async (req, res) => {
    try {
        const contact = await Contact.findOne({ contactId: req.params.id });
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found"
            });
        }

        await Contact.findOneAndDelete({ contactId: req.params.id });

        res.status(200).json({
            success: true,
            message: "Contact deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting contact:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete contact",
            error: error.message
        });
    }
});

// ============================================
// GET /get-contact-stats - Get contact statistics
// ============================================
router.get("/get-contact-stats", async (req, res) => {
    try {
        const total = await Contact.countDocuments();
        const pending = await Contact.countDocuments({ status: 'Pending' });
        const read = await Contact.countDocuments({ isRead: true });
        const unread = await Contact.countDocuments({ isRead: false });

        // Get today's submissions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayCount = await Contact.countDocuments({
            submittedAt: { $gte: today, $lt: tomorrow }
        });

        res.status(200).json({
            success: true,
            data: {
                total,
                pending,
                read,
                unread,
                today: todayCount
            }
        });

    } catch (error) {
        console.error("Error fetching contact stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch contact stats",
            error: error.message
        });
    }
});

module.exports = router;