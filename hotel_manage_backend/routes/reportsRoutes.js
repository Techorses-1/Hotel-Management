const express = require("express");
const router = express.Router();
const Room = require("../models/room");
const CheckIn = require("../models/checkIn");
const CheckOut = require("../models/checkOut");
const Booking = require("../models/booking");
const Category = require("../models/category");
const Customer = require("../models/customer");
const Expense = require("../models/expense");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { logSuccess, logFailed } = require("../utils/logHelper");

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
const checkReportsPermission = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes('admin') || permissions.includes('reports')) {
        next();
    } else {
        return res.status(403).json({
            message: 'Access denied. Reports permission required.'
        });
    }
};

// ============================================
// HELPER: Get Date Range with IST timezone fix
// ============================================
const getDateRange = (filter, customStart, customEnd) => {
    const now = new Date();
    // ✅ Set to IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    let startDate = new Date(istNow);
    let endDate = new Date(istNow);

    switch (filter) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;

        case 'yesterday':
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            break;

        case 'this_month':
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
            break;

        case '6_months':
            startDate.setMonth(startDate.getMonth() - 6);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;

        case 'this_year':
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setMonth(11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;

        case 'last_year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setFullYear(endDate.getFullYear() - 1);
            endDate.setMonth(11, 31);
            endDate.setHours(23, 59, 59, 999);
            break;

        case 'custom':
            startDate = new Date(customStart);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customEnd);
            endDate.setHours(23, 59, 59, 999);
            break;

        default:
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
    }

    // Convert back to UTC for MongoDB queries
    return {
        startDate: new Date(startDate.getTime() - istOffset),
        endDate: new Date(endDate.getTime() - istOffset)
    };
};

// ============================================
// HELPER: Calculate Actual Revenue based on payment status
// ============================================
const calculateActualRevenue = (finalTotal, amountPaid, paymentStatus) => {
    if (paymentStatus === 'Paid') {
        return finalTotal || 0;
    } else if (paymentStatus === 'Partial Paid') {
        return amountPaid || 0;
    } else {
        return 0;
    }
};

// ============================================
// GET REVENUE REPORT - UPDATED
// ============================================
router.get("/revenue", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate, categoryId } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        let matchQuery = {
            status: 'Completed',
            completedAt: {
                $gte: dateRange.startDate,
                $lte: dateRange.endDate
            }
        };

        if (categoryId) {
            matchQuery.categoryId = categoryId;
        }

        const [revenueData, summary, dailyData] = await Promise.all([
            CheckOut.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
                            roomNumber: "$roomNumber",
                            categoryName: "$categoryName"
                        },
                        totalRevenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$paymentStatus", "Paid"] },
                                    "$finalTotal",
                                    {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Partial Paid"] },
                                            "$amountPaid",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        count: { $sum: 1 },
                        totalTax: { $sum: "$taxAmount" },
                        totalDiscount: { $sum: "$discountAmount" },
                        totalRemovedRooms: { $sum: "$removedRoomsTotal" },
                        totalBillAmount: { $sum: "$finalTotal" }
                    }
                },
                { $sort: { "_id.date": 1 } }
            ]),
            CheckOut.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$paymentStatus", "Paid"] },
                                    "$finalTotal",
                                    {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Partial Paid"] },
                                            "$amountPaid",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        totalTax: { $sum: "$taxAmount" },
                        totalDiscount: { $sum: "$discountAmount" },
                        totalBookings: { $sum: 1 },
                        avgRevenue: {
                            $avg: {
                                $cond: [
                                    { $eq: ["$paymentStatus", "Paid"] },
                                    "$finalTotal",
                                    {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Partial Paid"] },
                                            "$amountPaid",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        totalRemovedRoomsRevenue: { $sum: "$removedRoomsTotal" },
                        totalBillAmount: { $sum: "$finalTotal" }
                    }
                }
            ]),
            CheckOut.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
                        revenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$paymentStatus", "Paid"] },
                                    "$finalTotal",
                                    {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Partial Paid"] },
                                            "$amountPaid",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary: summary[0] || {
                    totalRevenue: 0,
                    totalTax: 0,
                    totalDiscount: 0,
                    totalBookings: 0,
                    avgRevenue: 0,
                    totalRemovedRoomsRevenue: 0,
                    totalBillAmount: 0
                },
                dailyData: dailyData,
                revenueData: revenueData,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching revenue report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch revenue report",
            error: error.message
        });
    }
});

// ============================================
// GET OCCUPANCY REPORT
// ============================================
router.get("/occupancy", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate, categoryId } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        const totalRooms = await Room.countDocuments({ isActive: true });

        const occupancyData = [];
        let currentDate = new Date(dateRange.startDate);

        while (currentDate <= dateRange.endDate) {
            const occupied = await CheckIn.countDocuments({
                status: 'Active',
                checkInDate: { $lte: currentDate },
                checkOutDate: { $gte: currentDate }
            });

            occupancyData.push({
                date: currentDate.toISOString().split('T')[0],
                occupied: occupied,
                available: totalRooms - occupied,
                occupancyRate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        const totalOccupied = occupancyData.reduce((sum, day) => sum + day.occupied, 0);
        const totalDays = occupancyData.length;
        const avgOccupancy = totalDays > 0 ? Math.round((totalOccupied / (totalDays * totalRooms)) * 100) : 0;

        const roomOccupancy = await CheckIn.aggregate([
            {
                $match: {
                    status: 'Active',
                    checkInDate: { $lte: dateRange.endDate },
                    checkOutDate: { $gte: dateRange.startDate }
                }
            },
            {
                $group: {
                    _id: "$roomNumber",
                    totalDays: { $sum: 1 },
                    bookings: { $sum: 1 }
                }
            },
            { $sort: { totalDays: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalRooms,
                    avgOccupancy,
                    totalOccupiedDays: totalOccupied,
                    totalDays
                },
                dailyData: occupancyData,
                roomOccupancy: roomOccupancy,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching occupancy report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch occupancy report",
            error: error.message
        });
    }
});

// ============================================
// GET BOOKING REPORT
// ============================================
router.get("/bookings", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate, status } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        let matchQuery = {
            createdAt: {
                $gte: dateRange.startDate,
                $lte: dateRange.endDate
            }
        };

        if (status) {
            matchQuery.status = status;
        }

        const [bookingData, summary, statusBreakdown] = await Promise.all([
            Booking.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            status: "$status"
                        },
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$grandTotal" },
                        totalAdvance: { $sum: "$advancePaid" }
                    }
                },
                { $sort: { "_id.date": 1 } }
            ]),
            Booking.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalBookings: { $sum: 1 },
                        totalAmount: { $sum: "$grandTotal" },
                        totalAdvance: { $sum: "$advancePaid" },
                        avgAmount: { $avg: "$grandTotal" }
                    }
                }
            ]),
            Booking.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$grandTotal" }
                    }
                }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary: summary[0] || {
                    totalBookings: 0,
                    totalAmount: 0,
                    totalAdvance: 0,
                    avgAmount: 0
                },
                statusBreakdown: statusBreakdown,
                bookingData: bookingData,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching booking report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking report",
            error: error.message
        });
    }
});

// ============================================
// GET ROOM REPORT - UPDATED
// ============================================
router.get("/rooms", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate, categoryId } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        let roomMatch = { isActive: true };
        if (categoryId) {
            roomMatch.categoryId = categoryId;
        }

        const rooms = await Room.find(roomMatch).lean();

        if (rooms.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        totalRooms: 0,
                        totalBookings: 0,
                        totalRevenue: 0,
                        avgRevenuePerRoom: 0
                    },
                    roomPerformance: [],
                    dateRange: {
                        start: dateRange.startDate,
                        end: dateRange.endDate
                    }
                }
            });
        }

        const roomPerformance = await Promise.all(rooms.map(async (room) => {
            const roomId = room.roomId;

            const bookings = await CheckOut.countDocuments({
                roomIds: { $in: [roomId] },
                status: 'Completed',
                completedAt: {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate
                }
            });

            const revenue = await CheckOut.aggregate([
                {
                    $match: {
                        roomIds: { $in: [roomId] },
                        status: 'Completed',
                        completedAt: {
                            $gte: dateRange.startDate,
                            $lte: dateRange.endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$paymentStatus", "Paid"] },
                                    "$finalTotal",
                                    {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Partial Paid"] },
                                            "$amountPaid",
                                            0
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            ]);

            const occupiedDays = await CheckIn.countDocuments({
                roomIds: { $in: [roomId] },
                status: 'Active',
                checkInDate: { $lte: dateRange.endDate },
                checkOutDate: { $gte: dateRange.startDate }
            });

            // ✅ Get removed rooms count for this room
            const removedRoomsCount = await CheckOut.countDocuments({
                roomIds: { $in: [roomId] },
                'roomDetails.isRemoved': true,
                status: 'Completed',
                completedAt: {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate
                }
            });

            // ✅ Get removed rooms revenue for this room
            const removedRevenue = await CheckOut.aggregate([
                {
                    $match: {
                        roomIds: { $in: [roomId] },
                        status: 'Completed',
                        completedAt: {
                            $gte: dateRange.startDate,
                            $lte: dateRange.endDate
                        }
                    }
                },
                { $unwind: "$roomDetails" },
                {
                    $match: {
                        "roomDetails.isRemoved": true,
                        "roomDetails.roomId": roomId
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$roomDetails.price" }
                    }
                }
            ]);

            return {
                roomNumber: room.roomNumber,
                categoryName: room.categoryName || 'N/A',
                totalBookings: bookings || 0,
                totalRevenue: revenue[0]?.total || 0,
                occupiedDays: occupiedDays || 0,
                status: room.status || 'N/A',
                removedRoomsCount: removedRoomsCount || 0,
                removedRoomsRevenue: removedRevenue[0]?.total || 0
            };
        }));

        const summary = {
            totalRooms: rooms.length,
            totalBookings: roomPerformance.reduce((sum, r) => sum + r.totalBookings, 0),
            totalRevenue: roomPerformance.reduce((sum, r) => sum + r.totalRevenue, 0),
            avgRevenuePerRoom: rooms.length > 0 ? roomPerformance.reduce((sum, r) => sum + r.totalRevenue, 0) / rooms.length : 0,
            totalRemovedRoomsRevenue: roomPerformance.reduce((sum, r) => sum + r.removedRoomsRevenue, 0)
        };

        res.status(200).json({
            success: true,
            data: {
                summary: summary,
                roomPerformance: roomPerformance,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching room report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch room report",
            error: error.message
        });
    }
});

// ============================================
// GET CUSTOMER REPORT - UPDATED
// ============================================
router.get("/customers", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate, search } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        // ✅ STEP 1: Get ALL customers from Customer collection
        let customerQuery = {};
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            customerQuery.$or = [
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { contactNumber: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const allCustomers = await Customer.find(customerQuery).lean();

        if (allCustomers.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        totalCustomers: 0,
                        totalRevenue: 0,
                        totalVisits: 0,
                        avgSpentPerCustomer: 0
                    },
                    customers: [],
                    dateRange: {
                        start: dateRange.startDate,
                        end: dateRange.endDate
                    }
                }
            });
        }

        // ✅ STEP 2: Get checkout data from CheckOut collection
        const checkoutData = await CheckOut.aggregate([
            {
                $match: {
                    status: { $in: ['Completed', 'Partial'] },
                    completedAt: {
                        $gte: dateRange.startDate,
                        $lte: dateRange.endDate
                    }
                }
            },
            {
                $group: {
                    _id: "$customerId",
                    totalSpent: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "Paid"] },
                                "$finalTotal",
                                {
                                    $cond: [
                                        { $eq: ["$paymentStatus", "Partial Paid"] },
                                        "$amountPaid",
                                        0
                                    ]
                                }
                            ]
                        }
                    },
                    totalVisits: { $sum: 1 },
                    totalNights: { $sum: "$totalHours" },
                    totalRemovedRoomsRevenue: { $sum: "$removedRoomsTotal" }
                }
            }
        ]);

        // ✅ STEP 3: Create a map of checkout data by customerId
        const checkoutMap = {};
        checkoutData.forEach(item => {
            checkoutMap[item._id] = {
                totalSpent: item.totalSpent || 0,
                totalVisits: item.totalVisits || 0,
                totalNights: item.totalNights || 0,
                totalRemovedRoomsRevenue: item.totalRemovedRoomsRevenue || 0
            };
        });

        // ✅ STEP 4: Combine customer data with checkout data
        let customerData = allCustomers.map(customer => {
            const data = checkoutMap[customer.customerId] || {};
            return {
                customerName: customer.customerName,
                customerPhone: customer.contactNumber,
                customerEmail: customer.email || 'N/A',
                totalSpent: data.totalSpent || 0,
                totalVisits: data.totalVisits || 0,
                totalNights: Math.round((data.totalNights || 0) / 24) || 0,
                totalRemovedRoomsRevenue: data.totalRemovedRoomsRevenue || 0
            };
        });

        // ✅ STEP 5: Sort by total spent (highest first)
        customerData.sort((a, b) => b.totalSpent - a.totalSpent);

        // ✅ STEP 6: Apply search filter (if provided)
        if (search && search.trim() !== '') {
            const searchTerm = search.toLowerCase();
            customerData = customerData.filter(c =>
                c.customerName?.toLowerCase().includes(searchTerm) ||
                c.customerPhone?.includes(searchTerm) ||
                c.customerEmail?.toLowerCase().includes(searchTerm)
            );
        }

        // ✅ STEP 7: Calculate summary
        const summary = {
            totalCustomers: customerData.length,
            totalRevenue: customerData.reduce((sum, c) => sum + c.totalSpent, 0),
            totalVisits: customerData.reduce((sum, c) => sum + c.totalVisits, 0),
            avgSpentPerCustomer: customerData.length > 0 ?
                Math.round(customerData.reduce((sum, c) => sum + c.totalSpent, 0) / customerData.length) : 0
        };

        res.status(200).json({
            success: true,
            data: {
                summary: summary,
                customers: customerData,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching customer report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch customer report",
            error: error.message
        });
    }
});

// ============================================
// GET CATEGORY REPORT - UPDATED
// ============================================
router.get("/categories", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        const categories = await Category.find({ isActive: true }).lean();

        if (categories.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        totalCategories: 0,
                        totalRevenue: 0,
                        totalBookings: 0,
                        bestPerforming: 'N/A'
                    },
                    categoryPerformance: [],
                    dateRange: {
                        start: dateRange.startDate,
                        end: dateRange.endDate
                    }
                }
            });
        }

        const categoryPerformance = await Promise.all(categories.map(async (category) => {
            const rooms = await Room.find({ categoryId: category.categoryId, isActive: true }).lean();

            const revenue = await CheckOut.aggregate([
                {
                    $match: {
                        categoryId: category.categoryId,
                        status: 'Completed',
                        completedAt: {
                            $gte: dateRange.startDate,
                            $lte: dateRange.endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$paymentStatus", "Paid"] },
                                    "$finalTotal",
                                    {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Partial Paid"] },
                                            "$amountPaid",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        count: { $sum: 1 },
                        removedTotal: { $sum: '$removedRoomsTotal' }
                    }
                }
            ]);

            const occupiedDays = await CheckIn.countDocuments({
                categoryId: category.categoryId,
                status: 'Active',
                checkInDate: { $lte: dateRange.endDate },
                checkOutDate: { $gte: dateRange.startDate }
            });

            return {
                categoryName: category.categoryName,
                totalRooms: rooms.length || 0,
                totalRevenue: revenue[0]?.total || 0,
                totalBookings: revenue[0]?.count || 0,
                occupiedDays: occupiedDays || 0,
                avgPrice: category.pricing?.perDay || 0,
                removedRoomsRevenue: revenue[0]?.removedTotal || 0
            };
        }));

        categoryPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);

        const summary = {
            totalCategories: categories.length,
            totalRevenue: categoryPerformance.reduce((sum, c) => sum + c.totalRevenue, 0),
            totalBookings: categoryPerformance.reduce((sum, c) => sum + c.totalBookings, 0),
            bestPerforming: categoryPerformance[0]?.categoryName || 'N/A'
        };

        res.status(200).json({
            success: true,
            data: {
                summary: summary,
                categoryPerformance: categoryPerformance,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching category report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch category report",
            error: error.message
        });
    }
});

// ============================================
// GET EXPENSE REPORT
// ============================================
router.get("/expenses", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate, paymentMode, paymentStatus } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        let matchQuery = {
            date: {
                $gte: dateRange.startDate,
                $lte: dateRange.endDate
            }
        };

        if (paymentMode) {
            matchQuery.paymentMode = paymentMode;
        }

        if (paymentStatus) {
            matchQuery.paymentStatus = paymentStatus;
        }

        const [expenseData, summary, byPaymentMode, byPaymentStatus, dailyExpenses] = await Promise.all([
            Expense.find(matchQuery)
                .sort({ date: -1 })
                .lean(),
            Expense.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                        avgAmount: { $avg: "$amount" }
                    }
                }
            ]),
            Expense.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: "$paymentMode",
                        total: { $sum: "$amount" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { total: -1 } }
            ]),
            Expense.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: "$paymentStatus",
                        total: { $sum: "$amount" },
                        count: { $sum: 1 }
                    }
                }
            ]),
            Expense.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        total: { $sum: "$amount" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalAmount: summary[0]?.totalAmount || 0,
                    totalCount: summary[0]?.count || 0,
                    avgAmount: summary[0]?.avgAmount || 0
                },
                byPaymentMode: byPaymentMode,
                byPaymentStatus: byPaymentStatus,
                expenses: expenseData,
                dailyExpenses: dailyExpenses,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching expense report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch expense report",
            error: error.message
        });
    }
});

// ============================================
// GET CHECK-IN REPORT - UPDATED with removed rooms
// ============================================
router.get("/checkins", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate, status, categoryId, search } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        let matchQuery = {
            checkInDate: {
                $gte: dateRange.startDate,
                $lte: dateRange.endDate
            }
        };

        if (status) {
            matchQuery.status = status;
        }

        if (categoryId) {
            matchQuery.categoryId = categoryId;
        }

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            matchQuery.$or = [
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { customerPhone: { $regex: searchTerm, $options: 'i' } },
                { checkInNumber: { $regex: searchTerm, $options: 'i' } },
                { roomNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const [checkIns, summary] = await Promise.all([
            CheckIn.find(matchQuery)
                .sort({ checkInDate: -1 })
                .lean(),
            CheckIn.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalCheckIns: { $sum: 1 },
                        active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
                        checkedOut: { $sum: { $cond: [{ $eq: ["$status", "Checked-out"] }, 1, 0] } },
                        extended: { $sum: { $cond: [{ $eq: ["$status", "Extended"] }, 1, 0] } },
                        cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } }
                    }
                }
            ])
        ]);

        const summaryData = summary[0] || {
            totalCheckIns: 0,
            active: 0,
            checkedOut: 0,
            extended: 0,
            cancelled: 0
        };

        // ✅ Calculate removed rooms stats for each check-in
        const checkInsWithRemoved = checkIns.map(checkIn => ({
            ...checkIn,
            removedRoomsCount: (checkIn.removedRooms || []).length,
            removedRoomsTotal: (checkIn.removedRooms || []).reduce((sum, r) => sum + (r.price || 0), 0)
        }));

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalCheckIns: summaryData.totalCheckIns,
                    active: summaryData.active,
                    checkedOut: summaryData.checkedOut,
                    extended: summaryData.extended,
                    cancelled: summaryData.cancelled
                },
                checkIns: checkInsWithRemoved,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching check-in report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch check-in report",
            error: error.message
        });
    }
});

// ============================================
// GET CHECK-OUT REPORT - UPDATED with removed rooms & guestCheckOutAt
// ============================================
router.get("/checkouts", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate, status, categoryId, search } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        let matchQuery = {
            completedAt: {
                $gte: dateRange.startDate,
                $lte: dateRange.endDate
            }
        };

        if (status) {
            matchQuery.status = status;
        }

        if (categoryId) {
            matchQuery.categoryId = categoryId;
        }

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            matchQuery.$or = [
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { customerPhone: { $regex: searchTerm, $options: 'i' } },
                { checkOutNumber: { $regex: searchTerm, $options: 'i' } },
                { checkInNumber: { $regex: searchTerm, $options: 'i' } },
                { roomNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const [checkOuts, summary] = await Promise.all([
            CheckOut.find(matchQuery)
                .sort({ completedAt: -1 })
                .lean(),
            CheckOut.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalCheckOuts: { $sum: 1 },
                        totalRevenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$paymentStatus", "Paid"] },
                                    "$finalTotal",
                                    {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Partial Paid"] },
                                            "$amountPaid",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        totalRemovedRevenue: { $sum: "$removedRoomsTotal" },
                        paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] } },
                        partial: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Partial Paid"] }, 1, 0] } },
                        notPaid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Not Paid"] }, 1, 0] } },
                        totalBillAmount: { $sum: "$finalTotal" }
                    }
                }
            ])
        ]);

        const summaryData = summary[0] || {
            totalCheckOuts: 0,
            totalRevenue: 0,
            totalRemovedRevenue: 0,
            paid: 0,
            partial: 0,
            notPaid: 0,
            totalBillAmount: 0
        };

        // ✅ Add removed rooms info and guestCheckOutAt to each check-out
        const checkOutsWithDetails = checkOuts.map(checkOut => ({
            ...checkOut,
            removedRoomsCount: (checkOut.roomDetails || []).filter(r => r.isRemoved).length,
            removedRoomsTotal: (checkOut.roomDetails || []).filter(r => r.isRemoved).reduce((sum, r) => sum + (r.price || 0), 0),
            guestCheckOutTime: checkOut.guestCheckOutAt || checkOut.checkOutDate,
            actualRevenue: calculateActualRevenue(checkOut.finalTotal, checkOut.amountPaid, checkOut.paymentStatus)
        }));

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalCheckOuts: summaryData.totalCheckOuts,
                    totalRevenue: summaryData.totalRevenue,
                    totalRemovedRevenue: summaryData.totalRemovedRevenue,
                    paid: summaryData.paid,
                    partial: summaryData.partial,
                    notPaid: summaryData.notPaid,
                    totalBillAmount: summaryData.totalBillAmount
                },
                checkOuts: checkOutsWithDetails,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching check-out report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch check-out report",
            error: error.message
        });
    }
});

// ============================================
// GET ALL REPORTS SUMMARY - UPDATED
// ============================================
router.get("/summary", auth, checkReportsPermission, async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        const [revenueSummary, totalRooms, occupiedRooms, uniqueCustomers, expenseSummary] = await Promise.all([
            CheckOut.aggregate([
                {
                    $match: {
                        status: 'Completed',
                        completedAt: {
                            $gte: dateRange.startDate,
                            $lte: dateRange.endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$paymentStatus", "Paid"] },
                                    "$finalTotal",
                                    {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Partial Paid"] },
                                            "$amountPaid",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        totalBookings: { $sum: 1 },
                        avgRevenue: {
                            $avg: {
                                $cond: [
                                    { $eq: ["$paymentStatus", "Paid"] },
                                    "$finalTotal",
                                    {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Partial Paid"] },
                                            "$amountPaid",
                                            0
                                        ]
                                    }
                                ]
                            }
                        },
                        totalRemovedRevenue: { $sum: '$removedRoomsTotal' },
                        totalBillAmount: { $sum: '$finalTotal' }
                    }
                }
            ]),
            Room.countDocuments({ isActive: true }),
            CheckIn.countDocuments({
                status: 'Active',
                checkInDate: { $lte: dateRange.endDate },
                checkOutDate: { $gte: dateRange.startDate }
            }),
            CheckOut.distinct('customerId', {
                status: 'Completed',
                completedAt: {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate
                }
            }),
            Expense.aggregate([
                {
                    $match: {
                        date: {
                            $gte: dateRange.startDate,
                            $lte: dateRange.endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalExpense: { $sum: "$amount" },
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalRevenue: revenueSummary[0]?.totalRevenue || 0,
                totalBookings: revenueSummary[0]?.totalBookings || 0,
                avgRevenue: revenueSummary[0]?.avgRevenue || 0,
                totalRooms,
                occupiedRooms,
                occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
                totalCustomers: uniqueCustomers.length,
                totalExpense: expenseSummary[0]?.totalExpense || 0,
                totalRemovedRevenue: revenueSummary[0]?.totalRemovedRevenue || 0,
                totalBillAmount: revenueSummary[0]?.totalBillAmount || 0,
                dateRange: {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                }
            }
        });

    } catch (error) {
        console.error("Error fetching reports summary:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch reports summary",
            error: error.message
        });
    }
});

// ============================================
// EXPORT REPORT (Excel) - COMPLETE WITH ALL TYPES - UPDATED
// ============================================
router.get("/export/:type", auth, checkReportsPermission, async (req, res) => {
    try {
        const { type } = req.params;
        const { filter, startDate, endDate, categoryId, status, paymentMode, paymentStatus, search } = req.query;
        const dateRange = getDateRange(filter, startDate, endDate);

        let data = [];
        let filename = `report_${type}_${new Date().toISOString().split('T')[0]}`;

        switch (type) {
            case 'revenue': {
                const result = await CheckOut.find({
                    status: 'Completed',
                    completedAt: {
                        $gte: dateRange.startDate,
                        $lte: dateRange.endDate
                    }
                })
                    .select('checkOutNumber customerName customerPhone roomNumber categoryName checkInDate checkOutDate durationLabel basePrice activeRoomsTotal removedRoomsTotal extraRequirementsTotal extraChargesTotal taxAmount discountAmount finalTotal amountPaid paymentStatus completedAt guestCheckOutAt')
                    .lean();

                data = result.map(item => {
                    const actualRevenue = item.paymentStatus === 'Paid' ? item.finalTotal :
                        item.paymentStatus === 'Partial Paid' ? item.amountPaid : 0;
                    return {
                        'Check-out #': item.checkOutNumber,
                        'Guest Name': item.customerName,
                        'Phone': item.customerPhone,
                        'Room': item.roomNumber,
                        'Category': item.categoryName || 'N/A',
                        'Check-in': new Date(item.checkInDate).toLocaleDateString(),
                        'Check-out': new Date(item.checkOutDate).toLocaleDateString(),
                        'Guest Check-out Time': item.guestCheckOutAt ? new Date(item.guestCheckOutAt).toLocaleString() : 'N/A',
                        'Duration': item.durationLabel,
                        'Active Rooms Total': item.activeRoomsTotal || 0,
                        'Removed Rooms Total': item.removedRoomsTotal || 0,
                        'Base Price': item.basePrice || 0,
                        'Extra Requirements': item.extraRequirementsTotal || 0,
                        'Extra Charges': item.extraChargesTotal || 0,
                        'Tax': item.taxAmount || 0,
                        'Discount': item.discountAmount || 0,
                        'Bill Amount': item.finalTotal || 0,
                        'Amount Paid': item.amountPaid || 0,
                        'Actual Revenue': actualRevenue,
                        'Payment Status': item.paymentStatus,
                        'Completed At': new Date(item.completedAt).toLocaleString()
                    };
                });
                filename = `revenue_report_${new Date().toISOString().split('T')[0]}`;
                break;
            }

            case 'bookings': {
                const result = await Booking.find({
                    createdAt: {
                        $gte: dateRange.startDate,
                        $lte: dateRange.endDate
                    }
                })
                    .select('bookingNumber customerName customerPhone roomNumber categoryName checkInDate checkOutDate durationLabel grandTotal advancePaid paymentStatus status createdAt userSelectedCheckOut')
                    .lean();

                data = result.map(item => ({
                    'Booking #': item.bookingNumber,
                    'Guest Name': item.customerName,
                    'Phone': item.customerPhone,
                    'Room': item.roomNumber,
                    'Category': item.categoryName || 'N/A',
                    'Check-in': new Date(item.checkInDate).toLocaleDateString(),
                    'Check-out': new Date(item.checkOutDate).toLocaleDateString(),
                    'User Selected Check-out': item.userSelectedCheckOut ? new Date(item.userSelectedCheckOut).toLocaleString() : 'N/A',
                    'Duration': item.durationLabel,
                    'Grand Total': item.grandTotal || 0,
                    'Advance Paid': item.advancePaid || 0,
                    'Payment Status': item.paymentStatus,
                    'Booking Status': item.status,
                    'Created At': new Date(item.createdAt).toLocaleString()
                }));
                filename = `booking_report_${new Date().toISOString().split('T')[0]}`;
                break;
            }

            case 'customers': {
                const result = await CheckOut.aggregate([
                    {
                        $match: {
                            status: 'Completed',
                            completedAt: {
                                $gte: dateRange.startDate,
                                $lte: dateRange.endDate
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$customerId",
                            customerName: { $first: "$customerName" },
                            customerPhone: { $first: "$customerPhone" },
                            customerEmail: { $first: "$customerEmail" },
                            totalSpent: {
                                $sum: {
                                    $cond: [
                                        { $eq: ["$paymentStatus", "Paid"] },
                                        "$finalTotal",
                                        {
                                            $cond: [
                                                { $eq: ["$paymentStatus", "Partial Paid"] },
                                                "$amountPaid",
                                                0
                                            ]
                                        }
                                    ]
                                }
                            },
                            totalVisits: { $sum: 1 },
                            totalNights: { $sum: "$totalHours" }
                        }
                    },
                    { $sort: { totalSpent: -1 } }
                ]);

                data = result.map(item => ({
                    'Customer Name': item.customerName,
                    'Phone': item.customerPhone,
                    'Email': item.customerEmail || 'N/A',
                    'Total Visits': item.totalVisits,
                    'Total Nights': Math.round(item.totalNights / 24) || 0,
                    'Total Spent': item.totalSpent || 0,
                    'Avg. Per Visit': item.totalVisits > 0 ? Math.round(item.totalSpent / item.totalVisits) : 0
                }));
                filename = `customer_report_${new Date().toISOString().split('T')[0]}`;
                break;
            }

            case 'expenses': {
                let expenseQuery = {
                    date: {
                        $gte: dateRange.startDate,
                        $lte: dateRange.endDate
                    }
                };
                if (paymentMode) expenseQuery.paymentMode = paymentMode;
                if (paymentStatus) expenseQuery.paymentStatus = paymentStatus;

                const result = await Expense.find(expenseQuery)
                    .sort({ date: -1 })
                    .lean();

                data = result.map(item => ({
                    'Expense #': item.expenseNumber,
                    'Date': new Date(item.date).toLocaleDateString(),
                    'Title': item.title,
                    'Description': item.description || 'N/A',
                    'Amount': item.amount || 0,
                    'Payment Mode': item.paymentMode || 'N/A',
                    'Payment Status': item.paymentStatus || 'N/A',
                    'Document': item.document?.fileName || 'No Document',
                    'Created By': item.createdBy?.userName || 'N/A',
                    'Created At': new Date(item.createdAt).toLocaleString()
                }));
                filename = `expense_report_${new Date().toISOString().split('T')[0]}`;
                break;
            }

            case 'rooms': {
                let roomMatch = { isActive: true };
                if (categoryId) {
                    roomMatch.categoryId = categoryId;
                }

                const rooms = await Room.find(roomMatch).lean();

                const result = await Promise.all(rooms.map(async (room) => {
                    const bookings = await CheckOut.countDocuments({
                        roomIds: { $in: [room.roomId] },
                        status: 'Completed',
                        completedAt: {
                            $gte: dateRange.startDate,
                            $lte: dateRange.endDate
                        }
                    });

                    const revenue = await CheckOut.aggregate([
                        {
                            $match: {
                                roomIds: { $in: [room.roomId] },
                                status: 'Completed',
                                completedAt: {
                                    $gte: dateRange.startDate,
                                    $lte: dateRange.endDate
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Paid"] },
                                            "$finalTotal",
                                            {
                                                $cond: [
                                                    { $eq: ["$paymentStatus", "Partial Paid"] },
                                                    "$amountPaid",
                                                    0
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    ]);

                    const occupiedDays = await CheckIn.countDocuments({
                        roomIds: { $in: [room.roomId] },
                        status: 'Active',
                        checkInDate: { $lte: dateRange.endDate },
                        checkOutDate: { $gte: dateRange.startDate }
                    });

                    const removedRoomsCount = await CheckOut.countDocuments({
                        roomIds: { $in: [room.roomId] },
                        'roomDetails.isRemoved': true,
                        status: 'Completed',
                        completedAt: {
                            $gte: dateRange.startDate,
                            $lte: dateRange.endDate
                        }
                    });

                    return {
                        'Room Number': room.roomNumber,
                        'Category': room.categoryName || 'N/A',
                        'Total Bookings': bookings || 0,
                        'Occupied Days': occupiedDays || 0,
                        'Removed Rooms Count': removedRoomsCount || 0,
                        'Total Revenue': revenue[0]?.total || 0,
                        'Status': room.status || 'N/A'
                    };
                }));

                data = result;
                filename = `room_report_${new Date().toISOString().split('T')[0]}`;
                break;
            }

            case 'categories': {
                const categories = await Category.find({ isActive: true }).lean();

                const result = await Promise.all(categories.map(async (category) => {
                    const rooms = await Room.find({ categoryId: category.categoryId, isActive: true }).lean();

                    const revenue = await CheckOut.aggregate([
                        {
                            $match: {
                                categoryId: category.categoryId,
                                status: 'Completed',
                                completedAt: {
                                    $gte: dateRange.startDate,
                                    $lte: dateRange.endDate
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$paymentStatus", "Paid"] },
                                            "$finalTotal",
                                            {
                                                $cond: [
                                                    { $eq: ["$paymentStatus", "Partial Paid"] },
                                                    "$amountPaid",
                                                    0
                                                ]
                                            }
                                        ]
                                    }
                                },
                                count: { $sum: 1 },
                                removedTotal: { $sum: '$removedRoomsTotal' }
                            }
                        }
                    ]);

                    const occupiedDays = await CheckIn.countDocuments({
                        categoryId: category.categoryId,
                        status: 'Active',
                        checkInDate: { $lte: dateRange.endDate },
                        checkOutDate: { $gte: dateRange.startDate }
                    });

                    return {
                        'Category Name': category.categoryName,
                        'Total Rooms': rooms.length || 0,
                        'Total Bookings': revenue[0]?.count || 0,
                        'Occupied Days': occupiedDays || 0,
                        'Total Revenue': revenue[0]?.total || 0,
                        'Removed Rooms Revenue': revenue[0]?.removedTotal || 0,
                        'Avg. Price': category.pricing?.perDay || 0
                    };
                }));

                data = result;
                filename = `category_report_${new Date().toISOString().split('T')[0]}`;
                break;
            }

            case 'checkins': {
                let checkInQuery = {
                    checkInDate: {
                        $gte: dateRange.startDate,
                        $lte: dateRange.endDate
                    }
                };
                if (status) checkInQuery.status = status;
                if (categoryId) checkInQuery.categoryId = categoryId;
                if (search && search.trim() !== '') {
                    const searchTerm = search.trim();
                    checkInQuery.$or = [
                        { customerName: { $regex: searchTerm, $options: 'i' } },
                        { customerPhone: { $regex: searchTerm, $options: 'i' } },
                        { checkInNumber: { $regex: searchTerm, $options: 'i' } },
                        { roomNumber: { $regex: searchTerm, $options: 'i' } }
                    ];
                }

                const result = await CheckIn.find(checkInQuery)
                    .sort({ checkInDate: -1 })
                    .lean();

                data = result.map(item => ({
                    'Check-in #': item.checkInNumber,
                    'Guest Name': item.customerName,
                    'Phone': item.customerPhone,
                    'Email': item.customerEmail || 'N/A',
                    'Room': item.roomNumber,
                    'Category': item.categoryName || 'N/A',
                    'Check-in Date': new Date(item.checkInDate).toLocaleString(),
                    'Check-out Date': new Date(item.checkOutDate).toLocaleString(),
                    'Duration': item.durationLabel || 'N/A',
                    'Removed Rooms Count': (item.removedRooms || []).length || 0,
                    'Removed Rooms Total': (item.removedRooms || []).reduce((sum, r) => sum + (r.price || 0), 0) || 0,
                    'Status': item.status || 'N/A'
                }));
                filename = `checkin_report_${new Date().toISOString().split('T')[0]}`;
                break;
            }

            case 'checkouts': {
                let checkOutQuery = {
                    completedAt: {
                        $gte: dateRange.startDate,
                        $lte: dateRange.endDate
                    }
                };
                if (status) checkOutQuery.status = status;
                if (categoryId) checkOutQuery.categoryId = categoryId;
                if (search && search.trim() !== '') {
                    const searchTerm = search.trim();
                    checkOutQuery.$or = [
                        { customerName: { $regex: searchTerm, $options: 'i' } },
                        { customerPhone: { $regex: searchTerm, $options: 'i' } },
                        { checkOutNumber: { $regex: searchTerm, $options: 'i' } },
                        { checkInNumber: { $regex: searchTerm, $options: 'i' } },
                        { roomNumber: { $regex: searchTerm, $options: 'i' } }
                    ];
                }

                const result = await CheckOut.find(checkOutQuery)
                    .sort({ completedAt: -1 })
                    .lean();

                data = result.map(item => ({
                    'Check-out #': item.checkOutNumber,
                    'Guest Name': item.customerName,
                    'Phone': item.customerPhone,
                    'Email': item.customerEmail || 'N/A',
                    'Room': item.roomNumber,
                    'Category': item.categoryName || 'N/A',
                    'Check-in Date': new Date(item.checkInDate).toLocaleString(),
                    'Check-out Date': new Date(item.checkOutDate).toLocaleString(),
                    'Guest Check-out Time': item.guestCheckOutAt ? new Date(item.guestCheckOutAt).toLocaleString() : 'N/A',
                    'Duration': item.durationLabel || 'N/A',
                    'Active Rooms Total': item.activeRoomsTotal || 0,
                    'Removed Rooms Total': item.removedRoomsTotal || 0,
                    'Bill Amount': item.finalTotal || 0,
                    'Amount Paid': item.amountPaid || 0,
                    'Actual Revenue': item.paymentStatus === 'Paid' ? item.finalTotal : item.paymentStatus === 'Partial Paid' ? item.amountPaid : 0,
                    'Payment Status': item.paymentStatus || 'N/A',
                    'Status': item.status || 'N/A'
                }));
                filename = `checkout_report_${new Date().toISOString().split('T')[0]}`;
                break;
            }

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid report type'
                });
        }

        res.status(200).json({
            success: true,
            data: data,
            filename: filename
        });

    } catch (error) {
        console.error("Error exporting report:", error);
        res.status(500).json({
            success: false,
            message: "Failed to export report",
            error: error.message
        });
    }
});

module.exports = router;