const express = require("express");
const router = express.Router();
const Expense = require("../models/expense");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { logSuccess, logFailed } = require("../utils/logHelper");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ============================================
// MULTER CONFIGURATION
// ============================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "../uploads/expense");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `expense-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp',
        'application/pdf'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF and image files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
});

// ============================================
// AUTH MIDDLEWARE
// ============================================
const auth = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ userId: decoded.userId });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

// ============================================
// CHECK PERMISSION
// ============================================
const checkExpensePermission = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes('admin') || permissions.includes('expense')) {
        next();
    } else {
        return res.status(403).json({
            message: 'Access denied. Expense permission required.'
        });
    }
};

// ============================================
// POST CREATE EXPENSE
// ============================================
router.post("/create-expense", auth, checkExpensePermission, upload.single('document'), async (req, res) => {
    try {
        const {
            date,
            title,
            description,
            amount,
            paymentMode,
            paymentStatus
        } = req.body;

        // ✅ Validate required fields
        if (!date || !title || !amount || !paymentMode) {
            return res.status(400).json({
                success: false,
                message: "Date, Title, Amount and Payment Mode are required"
            });
        }

        // ✅ Process document if uploaded
        let documentData = null;
        if (req.file) {
            documentData = {
                fileName: req.file.originalname,
                fileUrl: `/uploads/expense/${req.file.filename}`,
                fileSize: req.file.size,
                fileType: req.file.mimetype
            };
        }

        // ✅ Create expense
        const expenseData = {
            date: new Date(date),
            title,
            description: description || '',
            amount: parseFloat(amount),
            paymentMode,
            paymentStatus: paymentStatus || 'Paid',
            document: documentData,
            createdBy: {
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email
            }
        };

        const expense = new Expense(expenseData);
        const savedExpense = await expense.save();

        await logSuccess({
            module: 'Expense',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Create',
            heading: 'Expense Created Successfully',
            description: `Expense ${savedExpense.expenseNumber} created for ${title} - ₹${amount}`
        });

        res.status(201).json({
            success: true,
            message: "Expense created successfully",
            data: savedExpense
        });

    } catch (error) {
        console.error("Error creating expense:", error);

        // ✅ Delete uploaded file if error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        }

        await logFailed({
            module: 'Expense',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Create',
            heading: 'Expense Creation Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to create expense",
            error: error.message
        });
    }
});

// ============================================
// GET ALL EXPENSES (PAGINATED) - UPDATED WITH IST DATE FILTER
// ============================================
router.get("/get-expenses", auth, checkExpensePermission, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            startDate = '',
            endDate = '',
            paymentMode = '',
            paymentStatus = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = {};

        // Search by title or description
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query.$or = [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { expenseNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        // ✅ FIXED: Date filter with IST timezone - EXACT DATE MATCH
        if (startDate && endDate) {
            // Parse start date
            const startParts = startDate.split('-');
            const start = new Date(Date.UTC(
                parseInt(startParts[0]),
                parseInt(startParts[1]) - 1,
                parseInt(startParts[2]),
                0, 0, 0
            ));
            start.setHours(start.getHours() + 5, start.getMinutes() + 30);

            // Parse end date
            const endParts = endDate.split('-');
            const end = new Date(Date.UTC(
                parseInt(endParts[0]),
                parseInt(endParts[1]) - 1,
                parseInt(endParts[2]),
                23, 59, 59
            ));
            end.setHours(end.getHours() + 5, end.getMinutes() + 30);

            query.date = { $gte: start, $lte: end };

        } else if (startDate) {
            // If only startDate provided, filter for that exact day in IST
            const dateParts = startDate.split('-');
            const start = new Date(Date.UTC(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2]),
                0, 0, 0
            ));
            start.setHours(start.getHours() + 5, start.getMinutes() + 30);

            const end = new Date(Date.UTC(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2]),
                23, 59, 59
            ));
            end.setHours(end.getHours() + 5, end.getMinutes() + 30);

            query.date = { $gte: start, $lte: end };
        }

        // Payment mode filter
        if (paymentMode) {
            query.paymentMode = paymentMode;
        }

        // Payment status filter
        if (paymentStatus) {
            query.paymentStatus = paymentStatus;
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [expenses, total] = await Promise.all([
            Expense.find(query)
                .select('-__v')
                .sort(sortObj)
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .lean(),
            Expense.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: expenses,
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
        console.error("Error fetching expenses:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch expenses",
            error: error.message
        });
    }
});

// ============================================
// GET EXPENSE BY ID
// ============================================
router.get("/get-expense/:id", auth, checkExpensePermission, async (req, res) => {
    try {
        const expense = await Expense.findOne({ expenseId: req.params.id }).lean();

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        res.status(200).json({
            success: true,
            data: expense
        });

    } catch (error) {
        console.error("Error fetching expense:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch expense",
            error: error.message
        });
    }
});

// ============================================
// UPDATE EXPENSE
// ============================================
router.put("/update-expense/:id", auth, checkExpensePermission, upload.single('document'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const existingExpense = await Expense.findOne({ expenseId: id });
        if (!existingExpense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        // ✅ Parse date
        if (updateData.date) {
            updateData.date = new Date(updateData.date);
        }

        // ✅ Parse amount
        if (updateData.amount) {
            updateData.amount = parseFloat(updateData.amount);
        }

        // ✅ Handle document upload
        if (req.file) {
            // Delete old document if exists
            if (existingExpense.document && existingExpense.document.fileUrl) {
                const oldFilePath = path.join(__dirname, `../${existingExpense.document.fileUrl}`);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }

            // Add new document
            updateData.document = {
                fileName: req.file.originalname,
                fileUrl: `/uploads/expense/${req.file.filename}`,
                fileSize: req.file.size,
                fileType: req.file.mimetype
            };
        }

        // ✅ Update audit
        updateData.updatedBy = {
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email
        };

        const updatedExpense = await Expense.findOneAndUpdate(
            { expenseId: id },
            updateData,
            { new: true, runValidators: true }
        );

        await logSuccess({
            module: 'Expense',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Expense Updated Successfully',
            description: `Expense ${updatedExpense.expenseNumber} updated`
        });

        res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            data: updatedExpense
        });

    } catch (error) {
        console.error("Error updating expense:", error);

        // ✅ Delete uploaded file if error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        }

        await logFailed({
            module: 'Expense',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Update',
            heading: 'Expense Update Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to update expense",
            error: error.message
        });
    }
});

// ============================================
// DELETE EXPENSE
// ============================================
router.delete("/delete-expense/:id", auth, checkExpensePermission, async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await Expense.findOne({ expenseId: id });
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        // ✅ Delete document if exists
        if (expense.document && expense.document.fileUrl) {
            const filePath = path.join(__dirname, `../${expense.document.fileUrl}`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Expense.findOneAndDelete({ expenseId: id });

        await logSuccess({
            module: 'Expense',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Delete',
            heading: 'Expense Deleted Successfully',
            description: `Expense ${expense.expenseNumber} deleted`
        });

        res.status(200).json({
            success: true,
            message: "Expense deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting expense:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete expense",
            error: error.message
        });
    }
});

// ============================================
// DELETE DOCUMENT FROM EXPENSE
// ============================================
router.delete("/delete-document/:id", auth, checkExpensePermission, async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await Expense.findOne({ expenseId: id });
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        if (!expense.document || !expense.document.fileUrl) {
            return res.status(400).json({
                success: false,
                message: "No document found for this expense"
            });
        }

        // ✅ Delete file
        const filePath = path.join(__dirname, `../${expense.document.fileUrl}`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // ✅ Remove document from expense
        expense.document = null;
        expense.updatedBy = {
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email
        };
        await expense.save();

        await logSuccess({
            module: 'Expense',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Document Deleted Successfully',
            description: `Document deleted from expense ${expense.expenseNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Document deleted successfully",
            data: expense
        });

    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete document",
            error: error.message
        });
    }
});

// ============================================
// GET EXPENSE SUMMARY
// ============================================
router.get("/summary", auth, checkExpensePermission, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let matchQuery = {};
        if (startDate && endDate) {
            matchQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        // ✅ Total expenses
        const totalExpenses = await Expense.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // ✅ By payment mode
        const byPaymentMode = await Expense.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: "$paymentMode",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // ✅ By payment status
        const byPaymentStatus = await Expense.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: "$paymentStatus",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // ✅ Daily expenses (last 30 days)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyExpenses = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: thirtyDaysAgo, $lte: today }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalExpenses: totalExpenses[0]?.totalAmount || 0,
                totalCount: totalExpenses[0]?.count || 0,
                byPaymentMode: byPaymentMode,
                byPaymentStatus: byPaymentStatus,
                dailyExpenses: dailyExpenses
            }
        });

    } catch (error) {
        console.error("Error fetching expense summary:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch expense summary",
            error: error.message
        });
    }
});

// ============================================
// EXPORT EXPENSES (Excel)
// ============================================
router.get("/export", auth, checkExpensePermission, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = {};
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const expenses = await Expense.find(query)
            .sort({ date: -1 })
            .lean();

        // Format data for export
        const exportData = expenses.map(item => ({
            'Expense #': item.expenseNumber,
            'Date': item.date ? new Date(item.date).toLocaleDateString('en-IN') : 'N/A',
            'Title': item.title,
            'Description': item.description || 'N/A',
            'Amount': item.amount || 0,
            'Payment Mode': item.paymentMode || 'N/A',
            'Payment Status': item.paymentStatus || 'N/A',
            'Document': item.document?.fileName || 'No document',
            'Created By': item.createdBy?.userName || 'N/A',
            'Created At': new Date(item.createdAt).toLocaleString('en-IN')
        }));

        res.status(200).json({
            success: true,
            data: exportData,
            filename: `expenses_${new Date().toISOString().split('T')[0]}`
        });

    } catch (error) {
        console.error("Error exporting expenses:", error);
        res.status(500).json({
            success: false,
            message: "Failed to export expenses",
            error: error.message
        });
    }
});

module.exports = router;