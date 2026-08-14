const express = require("express");
const router = express.Router();
const Room = require("../models/room");
const CheckIn = require("../models/checkIn");
const CheckOut = require("../models/checkOut");
const Booking = require("../models/booking");
const Housekeeping = require("../models/housekeeping");
const Category = require("../models/category");
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
const checkDashboardPermission = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes('admin') || permissions.includes('reception') || permissions.includes('housekeeping')) {
        next();
    } else {
        return res.status(403).json({
            message: 'Access denied. Dashboard permission required.'
        });
    }
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
// GET DASHBOARD STATS - UPDATED
// ============================================
router.get("/stats", auth, checkDashboardPermission, async (req, res) => {
    try {
        // ===== ROOM STATS =====
        const [totalRooms, availableRooms, occupiedRooms, cleaningRooms, maintenanceRooms] = await Promise.all([
            Room.countDocuments({ isActive: true }),
            Room.countDocuments({ status: 'Available', isActive: true }),
            Room.countDocuments({ status: 'Occupied', isActive: true }),
            Room.countDocuments({ status: 'Cleaning', isActive: true }),
            Room.countDocuments({ status: 'Maintenance', isActive: true })
        ]);

        // ===== TODAY'S DATE (IST) =====
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(today);
        monthStart.setDate(1);
        const yearStart = new Date(today);
        yearStart.setMonth(0, 1);

        // ===== TODAY'S ACTIVITY =====
        const [checkInsToday, checkOutsToday, bookingsToday, pendingHousekeeping] = await Promise.all([
            CheckIn.countDocuments({
                checkInDate: { $gte: today, $lt: tomorrow }
            }),
            CheckOut.countDocuments({
                completedAt: { $gte: today, $lt: tomorrow }
            }),
            Booking.countDocuments({
                checkInDate: { $gte: today, $lt: tomorrow },
                status: 'Confirmed'
            }),
            Housekeeping.countDocuments({ status: 'Pending' })
        ]);

        // ===== REVENUE - UPDATED with actual revenue =====
        const [revenueToday, revenueWeek, revenueMonth, revenueYear] = await Promise.all([
            CheckOut.aggregate([
                {
                    $match: {
                        completedAt: { $gte: today, $lt: tomorrow },
                        status: 'Completed'
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
            ]),
            CheckOut.aggregate([
                {
                    $match: {
                        completedAt: { $gte: weekStart, $lt: tomorrow },
                        status: 'Completed'
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
            ]),
            CheckOut.aggregate([
                {
                    $match: {
                        completedAt: { $gte: monthStart, $lt: tomorrow },
                        status: 'Completed'
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
            ]),
            CheckOut.aggregate([
                {
                    $match: {
                        completedAt: { $gte: yearStart, $lt: tomorrow },
                        status: 'Completed'
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
            ])
        ]);

        // ===== OCCUPANCY DATA (Last 7 days) =====
        const occupancyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const occupied = await CheckIn.countDocuments({
                status: 'Active',
                checkInDate: { $lte: date },
                checkOutDate: { $gte: date }
            });

            occupancyData.push({
                date: date.toISOString().split('T')[0],
                occupied: occupied,
                total: totalRooms,
                occupancyRate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0
            });
        }

        // ===== REVENUE BY CATEGORY - UPDATED =====
        const revenueByCategory = await CheckOut.aggregate([
            { $match: { status: 'Completed' } },
            {
                $group: {
                    _id: '$categoryName',
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
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        // ===== UPCOMING BOOKINGS (Tomorrow default) =====
        const tomorrowBookings = await Booking.find({
            checkInDate: { $gte: tomorrow, $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) },
            status: 'Confirmed'
        })
            .select('bookingNumber customerName customerPhone roomNumber checkInDate')
            .sort({ checkInDate: 1 })
            .lean();

        // ===== UPCOMING CHECK-OUTS (Today default) =====
        const todayCheckOuts = await CheckIn.find({
            status: 'Active',
            checkOutDate: { $gte: today, $lt: tomorrow }
        })
            .select('checkInNumber customerName customerPhone roomNumber checkOutDate')
            .sort({ checkOutDate: 1 })
            .lean();

        // ===== OCCUPANCY RATE =====
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

        // ===== SEND RESPONSE =====
        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalRooms,
                    availableRooms,
                    occupiedRooms,
                    cleaningRooms,
                    maintenanceRooms,
                    occupancyRate
                },
                revenue: {
                    today: revenueToday[0]?.total || 0,
                    week: revenueWeek[0]?.total || 0,
                    month: revenueMonth[0]?.total || 0,
                    year: revenueYear[0]?.total || 0
                },
                todayActivity: {
                    checkIns: checkInsToday,
                    checkOuts: checkOutsToday,
                    bookings: bookingsToday,
                    pendingHousekeeping
                },
                occupancyData,
                revenueByCategory: revenueByCategory.map(item => ({
                    category: item._id || 'Unknown',
                    total: item.total,
                    count: item.count
                })),
                upcomingBookings: tomorrowBookings.map(b => ({
                    bookingNumber: b.bookingNumber,
                    customerName: b.customerName,
                    customerPhone: b.customerPhone,
                    roomNumber: b.roomNumber,
                    checkInDate: b.checkInDate
                })),
                upcomingCheckOuts: todayCheckOuts.map(c => ({
                    checkInNumber: c.checkInNumber,
                    customerName: c.customerName,
                    customerPhone: c.customerPhone,
                    roomNumber: c.roomNumber,
                    checkOutDate: c.checkOutDate
                }))
            }
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard stats",
            error: error.message
        });
    }
});

// ============================================
// GET UPCOMING BOOKINGS BY DATE
// ============================================
router.get("/upcoming-bookings", auth, checkDashboardPermission, async (req, res) => {
    try {
        const { date } = req.query;

        let startDate;
        if (date) {
            startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
        } else {
            // Default: Tomorrow
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            startDate.setDate(startDate.getDate() + 1);
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        const bookings = await Booking.find({
            checkInDate: { $gte: startDate, $lt: endDate },
            status: 'Confirmed'
        })
            .select('bookingNumber customerName customerPhone roomNumber checkInDate')
            .sort({ checkInDate: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: bookings,
            count: bookings.length,
            date: startDate.toISOString().split('T')[0]
        });

    } catch (error) {
        console.error("Error fetching upcoming bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch upcoming bookings",
            error: error.message
        });
    }
});

// ============================================
// GET UPCOMING CHECK-OUTS BY DATE
// ============================================
router.get("/upcoming-checkouts", auth, checkDashboardPermission, async (req, res) => {
    try {
        const { date } = req.query;

        let startDate;
        if (date) {
            startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
        } else {
            // Default: Today
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        const checkOuts = await CheckIn.find({
            status: 'Active',
            checkOutDate: { $gte: startDate, $lt: endDate }
        })
            .select('checkInNumber customerName customerPhone roomNumber checkOutDate')
            .sort({ checkOutDate: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: checkOuts,
            count: checkOuts.length,
            date: startDate.toISOString().split('T')[0]
        });

    } catch (error) {
        console.error("Error fetching upcoming check-outs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch upcoming check-outs",
            error: error.message
        });
    }
});

// ============================================
// GET OCCUPANCY DATA
// ============================================
router.get("/occupancy", auth, checkDashboardPermission, async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const occupancyData = [];
        for (let i = parseInt(days) - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const occupied = await CheckIn.countDocuments({
                status: 'Active',
                checkInDate: { $lte: date },
                checkOutDate: { $gte: date }
            });

            const totalRooms = await Room.countDocuments({ isActive: true });

            occupancyData.push({
                date: date.toISOString().split('T')[0],
                occupied: occupied,
                total: totalRooms,
                occupancyRate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0
            });
        }

        res.status(200).json({
            success: true,
            data: occupancyData
        });

    } catch (error) {
        console.error("Error fetching occupancy data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch occupancy data",
            error: error.message
        });
    }
});

// ============================================
// GET REVENUE BY CATEGORY - UPDATED
// ============================================
router.get("/revenue-by-category", auth, checkDashboardPermission, async (req, res) => {
    try {
        const revenueByCategory = await CheckOut.aggregate([
            { $match: { status: 'Completed' } },
            {
                $group: {
                    _id: '$categoryName',
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
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: revenueByCategory.map(item => ({
                category: item._id || 'Unknown',
                total: item.total,
                count: item.count
            }))
        });

    } catch (error) {
        console.error("Error fetching revenue by category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch revenue by category",
            error: error.message
        });
    }
});

// ============================================
// GET TODAY'S ACTIVITY
// ============================================
router.get("/today-activity", auth, checkDashboardPermission, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [checkIns, checkOuts, bookings, pendingHousekeeping] = await Promise.all([
            CheckIn.countDocuments({
                checkInDate: { $gte: today, $lt: tomorrow }
            }),
            CheckOut.countDocuments({
                completedAt: { $gte: today, $lt: tomorrow }
            }),
            Booking.countDocuments({
                checkInDate: { $gte: today, $lt: tomorrow },
                status: 'Confirmed'
            }),
            Housekeeping.countDocuments({ status: 'Pending' })
        ]);

        res.status(200).json({
            success: true,
            data: {
                checkIns,
                checkOuts,
                bookings,
                pendingHousekeeping,
                date: today.toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error("Error fetching today's activity:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch today's activity",
            error: error.message
        });
    }
});

// ============================================
// GET REVENUE SUMMARY - UPDATED
// ============================================
router.get("/revenue-summary", auth, checkDashboardPermission, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(today);
        monthStart.setDate(1);
        const yearStart = new Date(today);
        yearStart.setMonth(0, 1);

        const [revenueToday, revenueWeek, revenueMonth, revenueYear] = await Promise.all([
            CheckOut.aggregate([
                {
                    $match: {
                        completedAt: { $gte: today, $lt: tomorrow },
                        status: 'Completed'
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
            ]),
            CheckOut.aggregate([
                {
                    $match: {
                        completedAt: { $gte: weekStart, $lt: tomorrow },
                        status: 'Completed'
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
            ]),
            CheckOut.aggregate([
                {
                    $match: {
                        completedAt: { $gte: monthStart, $lt: tomorrow },
                        status: 'Completed'
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
            ]),
            CheckOut.aggregate([
                {
                    $match: {
                        completedAt: { $gte: yearStart, $lt: tomorrow },
                        status: 'Completed'
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
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                today: revenueToday[0]?.total || 0,
                week: revenueWeek[0]?.total || 0,
                month: revenueMonth[0]?.total || 0,
                year: revenueYear[0]?.total || 0
            }
        });

    } catch (error) {
        console.error("Error fetching revenue summary:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch revenue summary",
            error: error.message
        });
    }
});


// ============================================
// GET TODAY'S CHECK-INS (Detailed)
// ============================================
router.get("/today-checkins", auth, checkDashboardPermission, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const checkIns = await CheckIn.find({
            checkInDate: { $gte: today, $lt: tomorrow }
        })
            .select('checkInNumber customerName customerPhone roomNumber checkInDate')
            .sort({ checkInDate: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: checkIns,
            count: checkIns.length
        });
    } catch (error) {
        console.error("Error fetching today's check-ins:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch today's check-ins",
            error: error.message
        });
    }
});


// ============================================
// GET TODAY'S CHECK-OUTS (Detailed)
// ============================================
router.get("/today-checkouts", auth, checkDashboardPermission, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const checkOuts = await CheckOut.find({
            completedAt: { $gte: today, $lt: tomorrow }
        })
            .select('checkOutNumber customerName customerPhone roomNumber completedAt finalTotal')
            .sort({ completedAt: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: checkOuts,
            count: checkOuts.length
        });
    } catch (error) {
        console.error("Error fetching today's check-outs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch today's check-outs",
            error: error.message
        });
    }
});


module.exports = router;