const express = require("express");
const router = express.Router();
const CheckIn = require("../models/checkIn");
const Booking = require("../models/booking");
const Customer = require("../models/customer");
const Room = require("../models/room");
const Category = require("../models/category");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { logSuccess, logFailed } = require("../utils/logHelper");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Housekeeping = require("../models/housekeeping");
const generateNumber = require("../utils/generateNumber");

// ============================================
// MULTER CONFIGURATION
// ============================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "../uploads/id-proofs");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `idproof-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
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
const checkCheckInPermission = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes('admin') || permissions.includes('reception') || permissions.includes('checkin')) {
        next();
    } else {
        return res.status(403).json({
            message: 'Access denied. Check-in permission required.'
        });
    }
};

// ============================================
// GENERATE CHECK-IN NUMBER
// ============================================
const generateCheckInNumber = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `CI-${year}${month}${day}`;

    const lastCheckIn = await CheckIn.findOne({
        checkInNumber: { $regex: `^${prefix}` }
    }).sort({ checkInNumber: -1 });

    let sequence = 1;
    if (lastCheckIn) {
        const lastSeq = parseInt(lastCheckIn.checkInNumber.split('-')[2]);
        sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

const checkRoomAvailability = async (roomId, checkInDate, checkOutDate, excludeCheckInId = null, excludeBookingId = null) => {
    console.log("========================================");
    console.log("🔍 checkRoomAvailability CALLED");
    console.log("========================================");
    console.log("📝 roomId:", roomId);
    console.log("📝 checkInDate:", checkInDate);
    console.log("📝 checkOutDate:", checkOutDate);
    console.log("📝 excludeCheckInId:", excludeCheckInId);
    console.log("📝 excludeBookingId:", excludeBookingId);
    console.log("========================================");

    // ✅ Check 1: Active Check-ins (overlapping)
    const checkInQuery = {
        roomIds: { $in: [roomId] },
        status: 'Active',
        _id: { $ne: excludeCheckInId },
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate }
    };
    console.log("📝 checkInQuery:", JSON.stringify(checkInQuery, null, 2));

    const existingCheckIn = await CheckIn.findOne(checkInQuery).lean();
    if (existingCheckIn) {
        console.log("❌ Active Check-in FOUND!");
        console.log("📝 Check-in ID:", existingCheckIn.checkInId);
        console.log("📝 Check-in Number:", existingCheckIn.checkInNumber);
        console.log("📝 Check-in Dates:", existingCheckIn.checkInDate, "to", existingCheckIn.checkOutDate);
        return {
            available: false,
            reason: `Room is currently OCCUPIED from ${new Date(existingCheckIn.checkInDate).toLocaleDateString()} to ${new Date(existingCheckIn.checkOutDate).toLocaleDateString()}`
        };
    }
    console.log("✅ No active check-in found");

    // ✅ Check 2: Confirmed Bookings (overlapping) - EXCLUDE current booking
    const bookingQuery = {
        roomIds: { $in: [roomId] },
        status: 'Confirmed',
        bookingId: { $ne: excludeBookingId },
        checkInDate: { $lt: checkOutDate },
        checkOutDate: { $gt: checkInDate }
    };
    console.log("📝 bookingQuery:", JSON.stringify(bookingQuery, null, 2));

    const existingBooking = await Booking.findOne(bookingQuery).lean();
    if (existingBooking) {
        console.log("❌ Confirmed Booking FOUND!");
        console.log("📝 Booking ID:", existingBooking.bookingId);
        console.log("📝 Booking Number:", existingBooking.bookingNumber);
        console.log("📝 Booking Dates:", existingBooking.checkInDate, "to", existingBooking.checkOutDate);
        console.log("📝 Booking Status:", existingBooking.status);
        return {
            available: false,
            reason: `Room is already BOOKED from ${new Date(existingBooking.checkInDate).toLocaleDateString()} to ${new Date(existingBooking.checkOutDate).toLocaleDateString()} (Booking #: ${existingBooking.bookingNumber})`
        };
    }
    console.log("✅ No confirmed booking found");

    // ✅ Check 3: Room status (ONLY Cleaning and Maintenance)
    console.log("📝 Checking room status...");
    const room = await Room.findOne({ roomId }).lean();
    if (room) {
        console.log("📝 Room found:", room.roomNumber);
        console.log("📝 Room status:", room.status);

        if (room.status === 'Cleaning') {
            console.log("❌ Room is under CLEANING");
            return { available: false, reason: `Room is under CLEANING` };
        }
        if (room.status === 'Maintenance') {
            console.log("❌ Room is under MAINTENANCE");
            return { available: false, reason: `Room is under MAINTENANCE` };
        }
        console.log("✅ Room status is OK:", room.status);
    } else {
        console.log("❌ Room not found in database!");
    }

    console.log("🎉 Room IS AVAILABLE!");
    console.log("========================================");
    return { available: true, reason: null };
};

// ============================================
// CHECK ROOM AVAILABILITY FOR SPECIFIC DATES (Simple boolean)
// ============================================
const isRoomAvailable = async (roomId, checkInDate, checkOutDate, excludeCheckInId = null) => {
    const result = await checkRoomAvailability(roomId, checkInDate, checkOutDate, excludeCheckInId);
    return result.available;
};

// ============================================
// GET AVAILABLE ROOMS FOR EXTENSION
// ============================================
const getAvailableRoomsForExtension = async (fromDate, toDate, excludeCheckInId = null) => {
    const allRooms = await Room.find({ isActive: true }).lean();

    // Check occupied rooms from Check-ins
    const occupiedCheckIns = await CheckIn.find({
        status: 'Active',
        _id: { $ne: excludeCheckInId },
        $or: [
            { checkInDate: { $lt: toDate }, checkOutDate: { $gt: fromDate } }
        ]
    }).select('roomIds').lean();

    // Check occupied rooms from Bookings
    const occupiedBookings = await Booking.find({
        status: 'Confirmed',
        $or: [
            { checkInDate: { $lt: toDate }, checkOutDate: { $gt: fromDate } }
        ]
    }).select('roomIds').lean();

    const occupiedRoomIds = new Set();
    occupiedCheckIns.forEach(c => {
        if (c.roomIds && Array.isArray(c.roomIds)) {
            c.roomIds.forEach(id => occupiedRoomIds.add(id));
        }
    });
    occupiedBookings.forEach(b => {
        if (b.roomIds && Array.isArray(b.roomIds)) {
            b.roomIds.forEach(id => occupiedRoomIds.add(id));
        }
    });

    // ✅ Filter out Cleaning and Maintenance rooms
    const availableRooms = allRooms.filter(room => {
        if (occupiedRoomIds.has(room.roomId)) return false;
        if (room.status === 'Cleaning') return false;
        if (room.status === 'Maintenance') return false;
        if (!room.isActive) return false;
        return true;
    });

    const roomsWithDetails = await Promise.all(availableRooms.map(async (room) => {
        const category = await Category.findOne({ categoryId: room.categoryId }).lean();
        return { ...room, categoryDetails: category };
    }));

    return roomsWithDetails;
};

// ============================================
// HELPER FUNCTIONS
// ============================================
const getDurationLabel = (totalHours) => {
    if (totalHours <= 0) return '0 Hours';
    if (totalHours <= 6) return '6 Hours';
    if (totalHours <= 12) return '12 Hours';
    if (totalHours <= 24) return '1 Day';
    if (totalHours <= 30) return '1 Day + 6 Hours';
    if (totalHours <= 36) return '1 Day + 12 Hours';
    if (totalHours <= 48) return '2 Days';
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    if (remainingHours === 0) return `${days} Days`;
    if (remainingHours <= 6) return `${days} Days + 6 Hours`;
    if (remainingHours <= 12) return `${days} Days + 12 Hours`;
    return `${days + 1} Days`;
};

const calculatePriceForHours = (pricing, totalHours) => {
    if (totalHours <= 0) return 0;

    if (totalHours <= 6) {
        return pricing.per6Hours || 0;
    }
    if (totalHours <= 12) {
        return pricing.per12Hours || 0;
    }
    if (totalHours <= 24) {
        return pricing.perDay || 0;
    }

    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    let price = days * (pricing.perDay || 0);
    if (remainingHours > 0) {
        if (remainingHours <= 6) {
            price += pricing.per6Hours || 0;
        } else if (remainingHours <= 12) {
            price += pricing.per12Hours || 0;
        } else {
            price += pricing.perDay || 0;
        }
    }
    return price;
};

// ============================================
// GET AVAILABLE ROOMS - UPDATED WITH PER NIGHT
// ============================================
router.get("/available-rooms", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { checkInDate, checkOutDate, categoryId, bookingId } = req.query;

        if (!checkInDate || !checkOutDate) {
            return res.status(400).json({
                success: false,
                message: "Check-in and Check-out dates are required"
            });
        }

        const start = new Date(checkInDate);
        const end = new Date(checkOutDate);

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: "Check-out date must be after check-in date"
            });
        }

        const roomQuery = { isActive: true };
        if (categoryId) {
            roomQuery.categoryId = categoryId;
        }

        const allRooms = await Room.find(roomQuery).lean();

        let bookingRoomIds = [];
        if (bookingId) {
            const booking = await Booking.findOne({ bookingId, status: 'Confirmed' });
            if (booking && booking.roomIds) {
                bookingRoomIds = booking.roomIds;
            }
        }

        const overlappingBookings = await Booking.find({
            status: 'Confirmed',
            bookingId: { $ne: bookingId },
            $or: [
                { checkInDate: { $lt: end }, checkOutDate: { $gt: start } }
            ]
        }).select('roomIds').lean();

        const overlappingCheckIns = await CheckIn.find({
            status: 'Active',
            $or: [
                { checkInDate: { $lt: end }, checkOutDate: { $gt: start } }
            ]
        }).select('roomIds').lean();

        const occupiedRoomIds = new Set();
        overlappingBookings.forEach(b => {
            if (b.roomIds && Array.isArray(b.roomIds)) {
                b.roomIds.forEach(id => occupiedRoomIds.add(id));
            }
        });
        overlappingCheckIns.forEach(c => {
            if (c.roomIds && Array.isArray(c.roomIds)) {
                c.roomIds.forEach(id => occupiedRoomIds.add(id));
            }
        });

        bookingRoomIds.forEach(id => occupiedRoomIds.delete(id));

        const availableRooms = allRooms.filter(room => {
            if (occupiedRoomIds.has(room.roomId)) return false;
            if (room.status === 'Cleaning') return false;
            if (room.status === 'Maintenance') return false;
            return true;
        });

        const roomsWithDetails = await Promise.all(availableRooms.map(async (room) => {
            const category = await Category.findOne({ categoryId: room.categoryId }).lean();
            return { ...room, categoryDetails: category };
        }));

        res.status(200).json({
            success: true,
            data: roomsWithDetails,
            totalAvailable: roomsWithDetails.length,
            bookingRoomIds: bookingRoomIds
        });

    } catch (error) {
        console.error("Error fetching available rooms:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch available rooms",
            error: error.message
        });
    }
});

// ============================================
// GET AVAILABLE ROOMS FOR EXTENSION
// ============================================
router.get("/available-rooms-for-extension/:checkInId", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { checkInId } = req.params;
        const { newDate } = req.query;

        if (!newDate) {
            return res.status(400).json({
                success: false,
                message: "New date is required"
            });
        }

        const checkIn = await CheckIn.findOne({ checkInId });
        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        const fromDate = new Date(checkIn.checkOutDate);
        const toDate = new Date(newDate);

        if (toDate <= fromDate) {
            return res.status(400).json({
                success: false,
                message: "New date must be after current check-out date"
            });
        }

        const availableRooms = await getAvailableRoomsForExtension(fromDate, toDate, checkIn._id);

        res.status(200).json({
            success: true,
            data: availableRooms,
            totalAvailable: availableRooms.length
        });

    } catch (error) {
        console.error("Error fetching available rooms for extension:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch available rooms",
            error: error.message
        });
    }
});

// ============================================
// CHECK AVAILABILITY
// ============================================
router.post("/check-availability", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { roomId, checkInDate, checkOutDate, excludeCheckInId } = req.body;

        if (!roomId || !checkInDate || !checkOutDate) {
            return res.status(400).json({
                success: false,
                message: "Room ID, Check-in and Check-out dates are required"
            });
        }

        const start = new Date(checkInDate);
        const end = new Date(checkOutDate);

        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: "Check-out date must be after check-in date",
                available: false
            });
        }

        const result = await checkRoomAvailability(roomId, start, end, excludeCheckInId);

        res.status(200).json({
            success: true,
            available: result.available,
            reason: result.reason
        });

    } catch (error) {
        console.error("Error checking availability:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check availability",
            error: error.message
        });
    }
});

// ============================================
// SEARCH BOOKINGS FOR CHECK-IN
// ============================================
router.get("/search-bookings", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { search, customerId } = req.query;

        let query = { status: 'Confirmed' };

        if (customerId) {
            query.customerId = customerId;
        }

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query.$or = [
                { bookingNumber: { $regex: searchTerm, $options: 'i' } },
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { customerPhone: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const bookings = await Booking.find(query)
            .sort({ checkInDate: 1 })
            .limit(20)
            .lean();

        res.status(200).json({
            success: true,
            data: bookings,
            count: bookings.length
        });

    } catch (error) {
        console.error("Error searching bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to search bookings",
            error: error.message
        });
    }
});

// ============================================
// GET BOOKING DETAILS FOR CHECK-IN
// ============================================
router.get("/get-booking-for-checkin/:bookingId", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findOne({
            bookingId: bookingId,
            status: 'Confirmed'
        }).lean();

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found or already checked-in"
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDate = new Date(booking.checkInDate);
        checkInDate.setHours(0, 0, 0, 0);

        if (checkInDate > today) {
            return res.status(400).json({
                success: false,
                message: "Booking check-in date is in the future. Cannot check-in yet."
            });
        }

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.error("Error fetching booking for check-in:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking",
            error: error.message
        });
    }
});

// ============================================
// POST CREATE CHECK-IN - UPDATED WITH PER NIGHT & NO PRICE RECALCULATION
// ============================================
router.post("/create-checkin", auth, checkCheckInPermission, upload.array('idProofs', 10), async (req, res) => {
    try {
        const {
            customerId,
            customerName,
            customerPhone,
            customerEmail,
            roomIds,
            roomDetails, // ✅ Frontend sends full room details with price
            checkInDate,
            checkOutDate,
            bookingType, // ✅ 'simple' or 'perNight'
            extraRequirements,
            taxSlab,
            amountPaid,
            advancePaid,
            notes,
            bookingId,
            idProofLabels,
            paymentStatus,
            paymentDetails,
            durationLabel // ✅ Frontend sends duration label for display
        } = req.body;

        console.log("========================================");
        console.log("📥 CREATE CHECK-IN REQUEST");
        console.log("========================================");
        console.log("📝 roomIds:", roomIds);
        console.log("📝 checkInDate:", checkInDate);
        console.log("📝 checkOutDate:", checkOutDate);
        console.log("📝 bookingId:", bookingId);
        console.log("📝 bookingType:", bookingType);
        console.log("========================================");

        let roomIdArray = roomIds;
        if (typeof roomIds === 'string') {
            try {
                roomIdArray = JSON.parse(roomIds);
            } catch {
                roomIdArray = [roomIds];
            }
        }

        console.log("📝 roomIdArray:", roomIdArray);
        console.log("📝 Number of rooms:", roomIdArray.length);

        if (!Array.isArray(roomIdArray) || roomIdArray.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one room is required"
            });
        }

        const customer = await Customer.findOne({ customerId });
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const checkInDateObj = new Date(checkInDate);
        const userSelectedCheckOutObj = new Date(checkOutDate);

        console.log("📝 checkInDateObj:", checkInDateObj);
        console.log("📝 userSelectedCheckOutObj:", userSelectedCheckOutObj);

        if (userSelectedCheckOutObj <= checkInDateObj) {
            return res.status(400).json({
                success: false,
                message: "Check-out date must be after check-in date"
            });
        }

        let bookingData = null;
        let bookingUserSelectedCheckOut = null;

        if (bookingId) {
            bookingData = await Booking.findOne({
                bookingId: bookingId,
                status: 'Confirmed'
            });

            if (!bookingData) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found or already checked-in"
                });
            }

            bookingUserSelectedCheckOut = bookingData.userSelectedCheckOut;
            console.log("📝 bookingData found:", bookingData.bookingNumber);
            console.log("📝 bookingData.checkInDate:", bookingData.checkInDate);
            console.log("📝 bookingData.checkOutDate:", bookingData.checkOutDate);
        }

        // ✅ CHECK ROOM AVAILABILITY
        console.log("========================================");
        console.log("🔍 CHECKING ROOM AVAILABILITY");
        console.log("========================================");

        for (const roomId of roomIdArray) {
            console.log(`📝 Checking room: ${roomId}`);
            console.log(`📝 Check-in: ${checkInDateObj}`);
            console.log(`📝 Check-out: ${userSelectedCheckOutObj}`);
            console.log(`📝 Excluding Booking: ${bookingId}`);

            const result = await checkRoomAvailability(
                roomId,
                checkInDateObj,
                userSelectedCheckOutObj,
                null,
                bookingId
            );

            console.log(`📝 Result: available=${result.available}, reason=${result.reason}`);

            if (!result.available) {
                const room = await Room.findOne({ roomId });
                console.log(`❌ Room ${room?.roomNumber || roomId} is NOT available!`);
                console.log(`❌ Reason: ${result.reason}`);
                return res.status(400).json({
                    success: false,
                    message: `Room ${room?.roomNumber || roomId} - ${result.reason}`
                });
            }
            console.log(`✅ Room ${roomId} is AVAILABLE`);
        }

        console.log("✅ All rooms are AVAILABLE!");
        console.log("========================================");

        // ✅ PARSE ROOM DETAILS FROM FRONTEND (already has price calculated)
        let parsedRoomDetails = [];
        if (roomDetails) {
            parsedRoomDetails = typeof roomDetails === 'string'
                ? JSON.parse(roomDetails)
                : roomDetails;
        }

        // ✅ Calculate total base price from frontend data (NO RECALCULATION)
        let totalBasePrice = 0;
        let totalHours = 0;
        let displayDurationLabel = durationLabel || '';

        // ✅ If roomDetails not sent, build from roomIds (backward compatibility)
        if (parsedRoomDetails.length === 0) {
            for (const roomId of roomIdArray) {
                const room = await Room.findOne({ roomId });
                if (!room) {
                    return res.status(404).json({
                        success: false,
                        message: `Room ${roomId} not found`
                    });
                }

                const category = await Category.findOne({ categoryId: room.categoryId });
                if (!category) {
                    return res.status(404).json({
                        success: false,
                        message: `Category for room ${room.roomNumber} not found`
                    });
                }

                const start = new Date(checkInDateObj);
                const end = new Date(userSelectedCheckOutObj);
                const diffMs = end - start;
                const hours = Math.ceil(diffMs / (1000 * 60 * 60));
                totalHours = hours;

                let price = 0;
                let roomDurationLabel = '';

                // ✅ Calculate price based on booking type
                if (bookingType === 'perNight') {
                    price = category.pricing.perNight || 0;
                    roomDurationLabel = 'Night Stay';
                } else {
                    // Simple mode - calculate based on duration
                    if (hours <= 6) {
                        price = category.pricing.per6Hours || 0;
                        roomDurationLabel = '6 Hours';
                    } else if (hours <= 12) {
                        price = category.pricing.per12Hours || 0;
                        roomDurationLabel = '12 Hours';
                    } else if (hours <= 24) {
                        price = category.pricing.perDay || 0;
                        roomDurationLabel = '1 Day';
                    } else {
                        const days = Math.floor(hours / 24);
                        const remainingHours = hours % 24;
                        price = days * (category.pricing.perDay || 0);
                        if (remainingHours > 0) {
                            if (remainingHours <= 6) {
                                price += category.pricing.per6Hours || 0;
                                roomDurationLabel = days === 1 ? '1 Day + 6 Hours' : `${days} Days + 6 Hours`;
                            } else if (remainingHours <= 12) {
                                price += category.pricing.per12Hours || 0;
                                roomDurationLabel = days === 1 ? '1 Day + 12 Hours' : `${days} Days + 12 Hours`;
                            } else {
                                price += category.pricing.perDay || 0;
                                roomDurationLabel = days + 1 === 1 ? '1 Day' : `${days + 1} Days`;
                            }
                        } else {
                            roomDurationLabel = days === 1 ? '1 Day' : `${days} Days`;
                        }
                    }
                }

                if (!displayDurationLabel) {
                    displayDurationLabel = bookingType === 'perNight' ? 'Night Stay' : roomDurationLabel;
                }

                parsedRoomDetails.push({
                    roomId: room.roomId,
                    roomNumber: room.roomNumber,
                    categoryId: room.categoryId,
                    categoryName: category.categoryName,
                    checkInDate: start,
                    checkOutDate: userSelectedCheckOutObj,
                    price: price,
                    totalHours: hours,
                    totalDays: Math.floor(hours / 24),
                    remainingHours: hours % 24,
                    durationLabel: bookingType === 'perNight' ? 'Night Stay' : roomDurationLabel
                });

                totalBasePrice += price;
            }
        } else {
            // ✅ Use frontend data - just calculate total and set dates
            for (const room of parsedRoomDetails) {
                totalBasePrice += room.price || 0;
                if (!totalHours) {
                    totalHours = room.totalHours || 0;
                }
                if (!displayDurationLabel) {
                    displayDurationLabel = room.durationLabel || '';
                }
                // Ensure dates are set
                if (!room.checkInDate) {
                    room.checkInDate = checkInDateObj;
                }
                if (!room.checkOutDate) {
                    room.checkOutDate = userSelectedCheckOutObj;
                }
            }
        }

        console.log("📝 totalBasePrice:", totalBasePrice);
        console.log("📝 displayDurationLabel:", displayDurationLabel);

        // ✅ EXTRA REQUIREMENTS & TAX
        let parsedExtraRequirements = [];
        if (extraRequirements) {
            parsedExtraRequirements = typeof extraRequirements === 'string'
                ? JSON.parse(extraRequirements)
                : extraRequirements;
        }

        const extrasTotal = parsedExtraRequirements.reduce((sum, req) => sum + (req.price || 0), 0);
        const subtotal = totalBasePrice + extrasTotal;
        const taxSlabValue = parseInt(taxSlab) || 18;
        const taxAmount = (subtotal * taxSlabValue) / 100;
        const grandTotal = subtotal + taxAmount;

        console.log("📝 grandTotal:", grandTotal);

        // ✅ PARSE PAYMENT DETAILS
        let parsedPaymentDetails = [];
        if (paymentDetails) {
            parsedPaymentDetails = typeof paymentDetails === 'string'
                ? JSON.parse(paymentDetails)
                : paymentDetails;
        }

        // ✅ Calculate total from payment details
        const totalFromPaymentDetails = parsedPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);

        // ✅ Determine payment type
        let paymentType = 'Cash';
        if (parsedPaymentDetails && parsedPaymentDetails.length > 0) {
            const uniqueMethods = [...new Set(parsedPaymentDetails.map(p => p.method))];
            paymentType = uniqueMethods.length > 1 ? 'Multiple' : uniqueMethods[0] || 'Cash';
        }

        // ✅ PAYMENT LOGIC
        let finalAmountPaid = parseFloat(amountPaid) || 0;

        if (bookingData) {
            finalAmountPaid = (bookingData.amountPaid || 0) + (bookingData.advancePaid || 0);
        }

        // If payment details exist, use that total
        if (parsedPaymentDetails.length > 0) {
            finalAmountPaid = totalFromPaymentDetails;
        }

        const finalAdvancePaid = 0;

        if (paymentStatus === 'Paid') {
            finalAmountPaid = grandTotal;
        }

        if (paymentStatus === 'Not Paid') {
            finalAmountPaid = 0;
        }

        const totalPaid = finalAmountPaid + finalAdvancePaid;
        const balanceAmount = Math.max(0, grandTotal - totalPaid);

        let finalPaymentStatus = 'Not Paid';
        if (balanceAmount === 0 && grandTotal > 0) {
            finalPaymentStatus = 'Paid';
        } else if (balanceAmount < grandTotal && balanceAmount > 0) {
            finalPaymentStatus = 'Partial Paid';
        }

        if (paymentStatus === 'Paid') {
            finalPaymentStatus = 'Paid';
        } else if (paymentStatus === 'Not Paid') {
            finalPaymentStatus = 'Not Paid';
        }

        console.log("📝 finalPaymentStatus:", finalPaymentStatus);
        console.log("📝 balanceAmount:", balanceAmount);

        // ✅ ID PROOFS
        const idProofs = [];
        const proofLabels = idProofLabels ? JSON.parse(idProofLabels) : [];

        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                idProofs.push({
                    label: proofLabels[index] || 'Other',
                    fileName: file.originalname,
                    fileUrl: `/uploads/id-proofs/${file.filename}`,
                    fileSize: file.size
                });
            });
        }

        const checkInNumber = await generateNumber('CI', 'checkin');

        const primaryRoom = parsedRoomDetails[0];
        const primaryRoomData = await Room.findOne({ roomId: roomIdArray[0] });

        // ✅ CREATE CHECK-IN DATA - WITH BOOKING TYPE
        const checkInData = {
            checkInNumber,
            bookingType: bookingType || 'simple',
            customerId,
            customerName: customer.customerName || customerName,
            customerPhone: customer.contactNumber || customerPhone,
            customerEmail: customer.email || customerEmail || '',
            roomIds: roomIdArray,
            roomDetails: parsedRoomDetails,
            removedRooms: [],
            roomId: roomIdArray[0],
            roomNumber: primaryRoomData?.roomNumber || '',
            categoryId: primaryRoomData?.categoryId || '',
            categoryName: primaryRoom?.categoryName || '',
            checkInDate: checkInDateObj,
            checkOutDate: userSelectedCheckOutObj,
            userSelectedCheckOut: bookingUserSelectedCheckOut || userSelectedCheckOutObj,
            totalHours: totalHours || Math.ceil((userSelectedCheckOutObj - checkInDateObj) / (1000 * 60 * 60)),
            totalDays: Math.floor((totalHours || 0) / 24),
            remainingHours: (totalHours || 0) % 24,
            durationLabel: bookingType === 'perNight' ? 'Night Stay' : (displayDurationLabel || getDurationLabel(totalHours)),
            basePrice: totalBasePrice,
            extraHoursPrice: 0,
            extraRequirements: parsedExtraRequirements,
            extraRequirementsTotal: extrasTotal,
            taxSlab: taxSlabValue,
            taxAmount: taxAmount,
            subtotal: subtotal,
            grandTotal: grandTotal,
            paymentStatus: finalPaymentStatus,
            amountPaid: finalAmountPaid,
            advancePaid: finalAdvancePaid,
            balanceAmount: balanceAmount,
            paymentDetails: parsedPaymentDetails,
            paymentType: paymentType,
            idProofs: idProofs,
            bookingId: bookingId || null,
            bookingNumber: bookingData?.bookingNumber || null,
            notes: notes || '',
            status: 'Active',
            createdBy: {
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email
            }
        };

        console.log("📦 Creating check-in with data:", JSON.stringify(checkInData, null, 2));

        const checkIn = new CheckIn(checkInData);
        const savedCheckIn = await checkIn.save();

        console.log("✅ Check-in saved! ID:", savedCheckIn.checkInId);

        if (bookingData) {
            bookingData.status = 'Checked-in';
            bookingData.checkInId = savedCheckIn.checkInId;
            bookingData.checkInNumber = savedCheckIn.checkInNumber;
            await bookingData.save();
            console.log("✅ Booking marked as checked-in!");
        }

        for (const roomId of roomIdArray) {
            await Room.findOneAndUpdate(
                { roomId },
                { status: 'Occupied' }
            );
        }

        console.log("✅ All rooms updated to Occupied!");
        console.log("🎉 CHECK-IN CREATED SUCCESSFULLY!");

        await logSuccess({
            module: 'CheckIn',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Create',
            heading: 'Check-in Created Successfully',
            description: `Check-in ${checkInNumber} created for ${customer.customerName} with ${roomIdArray.length} room(s) (${bookingType || 'simple'})`
        });

        res.status(201).json({
            success: true,
            message: "Check-in created successfully",
            data: savedCheckIn
        });

    } catch (error) {
        console.error("❌ Error creating check-in:", error);

        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error("Error deleting file:", err);
                });
            });
        }

        await logFailed({
            module: 'CheckIn',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Create',
            heading: 'Check-in Creation Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to create check-in",
            error: error.message
        });
    }
});

// ============================================
// GET ALL CHECK-INS (PAGINATED)
// ============================================
router.get("/get-checkins", auth, checkCheckInPermission, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            customerId = '',
            roomId = '',
            startDate = '',
            endDate = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = {};

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query.$or = [
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { customerPhone: { $regex: searchTerm, $options: 'i' } },
                { checkInNumber: { $regex: searchTerm, $options: 'i' } },
                { roomNumber: { $regex: searchTerm, $options: 'i' } },
                { bookingNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        if (status) {
            const statusArray = status.split(',').filter(s => s.trim());
            if (statusArray.length > 0) {
                query.status = { $in: statusArray };
            }
        }

        if (customerId) query.customerId = customerId;
        if (roomId) query.roomIds = { $in: [roomId] };

        if (startDate && endDate) {
            const startParts = startDate.split('-');
            const start = new Date(Date.UTC(
                parseInt(startParts[0]),
                parseInt(startParts[1]) - 1,
                parseInt(startParts[2]),
                0, 0, 0
            ));
            start.setHours(start.getHours() + 5, start.getMinutes() + 30);

            const endParts = endDate.split('-');
            const end = new Date(Date.UTC(
                parseInt(endParts[0]),
                parseInt(endParts[1]) - 1,
                parseInt(endParts[2]),
                23, 59, 59
            ));
            end.setHours(end.getHours() + 5, end.getMinutes() + 30);

            query.checkInDate = { $gte: start, $lte: end };

        } else if (startDate) {
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

            query.checkInDate = { $gte: start, $lte: end };
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [checkIns, total] = await Promise.all([
            CheckIn.find(query)
                .select('-__v')
                .sort(sortObj)
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .lean(),
            CheckIn.countDocuments(query)
        ]);

        for (const checkIn of checkIns) {
            if (checkIn.roomDetails && checkIn.roomDetails.length > 0) {
                for (const room of checkIn.roomDetails) {
                    if (room.categoryId) {
                        const category = await Category.findOne({ categoryId: room.categoryId }).lean();
                        if (category) {
                            room.categoryDetails = category;
                        }
                    }
                }
            }
        }

        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: checkIns,
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
        console.error("Error fetching check-ins:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch check-ins",
            error: error.message
        });
    }
});

// ============================================
// GET CHECK-IN BY ID
// ============================================
router.get("/get-checkin/:id", auth, checkCheckInPermission, async (req, res) => {
    try {
        const checkIn = await CheckIn.findOne({ checkInId: req.params.id }).lean();

        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        if (checkIn.roomDetails && checkIn.roomDetails.length > 0) {
            for (const room of checkIn.roomDetails) {
                if (room.categoryId) {
                    const category = await Category.findOne({ categoryId: room.categoryId }).lean();
                    if (category) {
                        room.categoryDetails = category;
                    }
                }
            }
        }

        res.status(200).json({
            success: true,
            data: checkIn
        });

    } catch (error) {
        console.error("Error fetching check-in:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch check-in",
            error: error.message
        });
    }
});

// ============================================
// UPDATE CHECK-IN - WITH BOOKING TYPE VALIDATION
// ============================================
router.put("/update-checkin/:id", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const existingCheckIn = await CheckIn.findOne({ checkInId: id });
        if (!existingCheckIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        // ✅ VALIDATE: Cannot change booking type
        if (updateData.bookingType && updateData.bookingType !== existingCheckIn.bookingType) {
            return res.status(400).json({
                success: false,
                message: `Cannot change booking type from ${existingCheckIn.bookingType} to ${updateData.bookingType}. Booking type is fixed.`
            });
        }

        if (!updateData.removedRooms) {
            updateData.removedRooms = existingCheckIn.removedRooms;
        }

        if (updateData.checkOutDate) {
            const userSelectedDate = new Date(updateData.checkOutDate);
            const currentSystemDate = new Date(existingCheckIn.checkOutDate);
            const checkInDate = new Date(existingCheckIn.checkInDate);

            if (userSelectedDate < checkInDate) {
                return res.status(400).json({
                    success: false,
                    message: "Check-out date cannot be before check-in date"
                });
            }

            if (userSelectedDate > currentSystemDate) {
                return res.status(400).json({
                    success: false,
                    message: `Check-out date cannot be extended. Maximum allowed: ${currentSystemDate.toLocaleString()}`
                });
            }

            updateData.userSelectedCheckOut = userSelectedDate;

            // ✅ If roomDetails with prices are sent from frontend, use them
            if (updateData.roomDetails && updateData.roomDetails.length > 0) {
                // Use frontend data - NO RECALCULATION
                let newBasePrice = 0;
                for (const room of updateData.roomDetails) {
                    newBasePrice += room.price || 0;
                }
                updateData.basePrice = newBasePrice;
            } else {
                // Fallback: Calculate if frontend didn't send roomDetails
                let totalBasePrice = 0;
                let totalExtraHoursPrice = 0;
                let maxTotalHours = 0;
                let overallTotalHours = 0;
                let overallTotalDays = 0;
                let overallRemainingHours = 0;
                let overallDurationLabel = '';
                let systemCalculatedCheckOut = null;
                const updatedRoomDetails = [];

                for (const roomDetail of existingCheckIn.roomDetails) {
                    const room = await Room.findOne({ roomId: roomDetail.roomId });
                    if (!room) continue;

                    const category = await Category.findOne({ categoryId: room.categoryId });
                    if (!category) continue;

                    const pricing = category.pricing;
                    const start = new Date(existingCheckIn.checkInDate);
                    const end = new Date(userSelectedDate);
                    const diffMs = end - start;
                    const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));

                    let basePrice = 0;
                    let extraHoursPrice = 0;
                    let durationLabel = '';
                    let totalDays = 0;
                    let remainingHours = 0;
                    let sysCheckOut = new Date(start);

                    if (existingCheckIn.bookingType === 'perNight') {
                        basePrice = pricing.perNight || 0;
                        durationLabel = 'Night Stay';
                        sysCheckOut = new Date(userSelectedDate);
                    } else {
                        // Simple mode
                        if (totalHours <= 6) {
                            basePrice = pricing.per6Hours || 0;
                            durationLabel = '6 Hours';
                            sysCheckOut.setHours(start.getHours() + 6);
                        } else if (totalHours <= 12) {
                            basePrice = pricing.per12Hours || 0;
                            durationLabel = '12 Hours';
                            sysCheckOut.setHours(start.getHours() + 12);
                        } else {
                            totalDays = Math.floor(totalHours / 24);
                            remainingHours = totalHours % 24;

                            basePrice = totalDays * (pricing.perDay || 0);

                            if (remainingHours === 0) {
                                durationLabel = totalDays === 1 ? '1 Day' : `${totalDays} Days`;
                                sysCheckOut.setHours(start.getHours() + (totalDays * 24));
                            } else if (remainingHours <= 6) {
                                extraHoursPrice = pricing.per6Hours || 0;
                                durationLabel = totalDays === 1 ? '1 Day + 6 Hours' : `${totalDays} Days + 6 Hours`;
                                sysCheckOut.setHours(start.getHours() + (totalDays * 24) + 6);
                            } else if (remainingHours <= 12) {
                                extraHoursPrice = pricing.per12Hours || 0;
                                durationLabel = totalDays === 1 ? '1 Day + 12 Hours' : `${totalDays} Days + 12 Hours`;
                                sysCheckOut.setHours(start.getHours() + (totalDays * 24) + 12);
                            } else {
                                basePrice = (totalDays + 1) * (pricing.perDay || 0);
                                durationLabel = totalDays + 1 === 1 ? '1 Day' : `${totalDays + 1} Days`;
                                sysCheckOut.setHours(start.getHours() + ((totalDays + 1) * 24));
                                remainingHours = 0;
                                extraHoursPrice = 0;
                            }
                        }
                    }

                    totalBasePrice += basePrice;
                    totalExtraHoursPrice += extraHoursPrice;

                    if (totalHours > maxTotalHours) {
                        maxTotalHours = totalHours;
                        overallTotalHours = totalHours;
                        overallTotalDays = totalDays;
                        overallRemainingHours = remainingHours;
                        overallDurationLabel = durationLabel;
                        systemCalculatedCheckOut = sysCheckOut;
                    }

                    updatedRoomDetails.push({
                        ...roomDetail,
                        price: basePrice + extraHoursPrice,
                        totalHours: totalHours,
                        totalDays: totalDays,
                        remainingHours: remainingHours,
                        durationLabel: durationLabel
                    });
                }

                updateData.roomDetails = updatedRoomDetails;
                updateData.checkOutDate = systemCalculatedCheckOut;
                updateData.totalHours = overallTotalHours;
                updateData.totalDays = overallTotalDays;
                updateData.remainingHours = overallRemainingHours;
                updateData.durationLabel = existingCheckIn.bookingType === 'perNight' ? 'Night Stay' : overallDurationLabel;
                updateData.basePrice = totalBasePrice;
                updateData.extraHoursPrice = totalExtraHoursPrice;
            }
        }

        if (updateData.extraRequirements) {
            const extrasTotal = updateData.extraRequirements.reduce((sum, req) => sum + (req.price || 0), 0);
            updateData.extraRequirementsTotal = extrasTotal;
        }

        // ✅ Calculate totals (using basePrice from frontend - NO RECALCULATION)
        const activeRoomsTotal = (updateData.roomDetails || existingCheckIn.roomDetails).reduce((sum, r) => sum + (r.price || 0), 0);
        const removedRoomsTotal = (updateData.removedRooms || existingCheckIn.removedRooms || []).reduce((sum, r) => sum + (r.price || 0), 0);
        const basePrice = activeRoomsTotal + removedRoomsTotal;
        const extraHoursPrice = updateData.extraHoursPrice || existingCheckIn.extraHoursPrice || 0;
        const extrasTotal = updateData.extraRequirementsTotal || existingCheckIn.extraRequirementsTotal || 0;

        const subtotal = basePrice + extrasTotal;
        const taxSlab = updateData.taxSlab || existingCheckIn.taxSlab;
        const taxAmount = (subtotal * taxSlab) / 100;
        const grandTotal = subtotal + taxAmount;

        updateData.basePrice = basePrice;
        updateData.subtotal = subtotal;
        updateData.taxAmount = taxAmount;
        updateData.grandTotal = grandTotal;

        // ✅ Handle payment details update
        if (updateData.paymentDetails) {
            updateData.paymentDetails = typeof updateData.paymentDetails === 'string'
                ? JSON.parse(updateData.paymentDetails)
                : updateData.paymentDetails;

            if (updateData.paymentDetails.length > 0) {
                const uniqueMethods = [...new Set(updateData.paymentDetails.map(p => p.method))];
                updateData.paymentType = uniqueMethods.length > 1 ? 'Multiple' : uniqueMethods[0] || 'Cash';

                const totalFromDetails = updateData.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
                if (!updateData.amountPaid || updateData.amountPaid === 0) {
                    updateData.amountPaid = totalFromDetails;
                }
            } else {
                updateData.paymentType = 'Cash';
            }
        }

        let amountPaidValue = updateData.amountPaid !== undefined
            ? parseFloat(updateData.amountPaid) || 0
            : existingCheckIn.amountPaid || 0;

        if (updateData.paymentStatus === 'Paid') {
            amountPaidValue = grandTotal;
        }

        if (updateData.paymentStatus === 'Not Paid') {
            amountPaidValue = 0;
        }

        const advancePaidValue = updateData.advancePaid !== undefined
            ? parseFloat(updateData.advancePaid) || 0
            : existingCheckIn.advancePaid || 0;

        const totalPaid = amountPaidValue + advancePaidValue;
        const balanceAmount = Math.max(0, grandTotal - totalPaid);

        updateData.amountPaid = amountPaidValue;
        updateData.advancePaid = advancePaidValue;
        updateData.balanceAmount = balanceAmount;

        let finalPaymentStatus = 'Not Paid';
        if (balanceAmount === 0 && grandTotal > 0) {
            finalPaymentStatus = 'Paid';
        } else if (balanceAmount < grandTotal && balanceAmount > 0) {
            finalPaymentStatus = 'Partial Paid';
        }

        if (updateData.paymentStatus === 'Paid') {
            finalPaymentStatus = 'Paid';
        } else if (updateData.paymentStatus === 'Not Paid') {
            finalPaymentStatus = 'Not Paid';
        }

        updateData.paymentStatus = finalPaymentStatus;

        // ✅ For perNight, ensure durationLabel is 'Night Stay'
        if (existingCheckIn.bookingType === 'perNight') {
            updateData.durationLabel = 'Night Stay';
        }

        updateData.updatedBy = {
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email
        };

        const updatedCheckIn = await CheckIn.findOneAndUpdate(
            { checkInId: id },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        await logSuccess({
            module: 'CheckIn',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Check-in Updated Successfully',
            description: `Check-in ${updatedCheckIn.checkInNumber} updated`
        });

        res.status(200).json({
            success: true,
            message: "Check-in updated successfully",
            data: updatedCheckIn
        });

    } catch (error) {
        console.error("Error updating check-in:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update check-in",
            error: error.message
        });
    }
});

// ============================================
// ADD ROOM - WITH AVAILABILITY CHECK - UPDATED WITH PRICE FROM FRONTEND
// ============================================
router.put("/add-room/:checkInId", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { checkInId } = req.params;
        const { newRoomId, roomPrice } = req.body;

        if (!newRoomId) {
            return res.status(400).json({
                success: false,
                message: "New room is required"
            });
        }

        const checkIn = await CheckIn.findOne({ checkInId });
        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        if (checkIn.status !== 'Active') {
            return res.status(400).json({
                success: false,
                message: "Only active check-ins can be modified"
            });
        }

        const newRoom = await Room.findOne({ roomId: newRoomId });
        if (!newRoom) {
            return res.status(404).json({
                success: false,
                message: "New room not found"
            });
        }

        if (checkIn.roomIds.includes(newRoomId)) {
            return res.status(400).json({
                success: false,
                message: `Room ${newRoom.roomNumber} is already in this check-in`
            });
        }

        const currentDate = new Date();
        const mainCheckOut = new Date(checkIn.checkOutDate);

        if (mainCheckOut <= currentDate) {
            return res.status(400).json({
                success: false,
                message: "Cannot add room after check-out time"
            });
        }

        const availabilityResult = await checkRoomAvailability(
            newRoomId,
            currentDate,
            mainCheckOut,
            checkIn._id
        );

        if (!availabilityResult.available) {
            return res.status(400).json({
                success: false,
                message: `Room ${newRoom.roomNumber} - ${availabilityResult.reason}`
            });
        }

        const newCategory = await Category.findOne({ categoryId: newRoom.categoryId });
        if (!newCategory) {
            return res.status(404).json({
                success: false,
                message: "Category for new room not found"
            });
        }

        const totalDurationHours = Math.ceil((mainCheckOut - currentDate) / (1000 * 60 * 60));

        if (totalDurationHours <= 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot add room after check-out time"
            });
        }

        // ✅ Use price from frontend if provided, else calculate
        let newRoomPrice = roomPrice || 0;
        if (!roomPrice) {
            if (checkIn.bookingType === 'perNight') {
                newRoomPrice = newCategory.pricing.perNight || 0;
            } else {
                newRoomPrice = calculatePriceForHours(newCategory.pricing, totalDurationHours);
            }
        }

        checkIn.roomIds.push(newRoomId);
        checkIn.roomDetails.push({
            roomId: newRoom.roomId,
            roomNumber: newRoom.roomNumber,
            categoryId: newRoom.categoryId,
            categoryName: newCategory.categoryName,
            checkInDate: currentDate,
            checkOutDate: mainCheckOut,
            price: newRoomPrice,
            totalHours: totalDurationHours,
            totalDays: Math.floor(totalDurationHours / 24),
            remainingHours: totalDurationHours % 24,
            durationLabel: checkIn.bookingType === 'perNight' ? 'Night Stay' : getDurationLabel(totalDurationHours)
        });

        await Room.findOneAndUpdate(
            { roomId: newRoomId },
            { status: 'Occupied' }
        );

        // ✅ Recalculate base price (sum of all room prices - NO RECALCULATION)
        checkIn.basePrice = checkIn.roomDetails.reduce((sum, r) => sum + r.price, 0);
        checkIn.subtotal = checkIn.basePrice + checkIn.extraRequirementsTotal;
        checkIn.taxAmount = (checkIn.subtotal * checkIn.taxSlab) / 100;
        checkIn.grandTotal = checkIn.subtotal + checkIn.taxAmount;

        const totalPaid = (checkIn.amountPaid || 0) + (checkIn.advancePaid || 0);
        checkIn.balanceAmount = Math.max(0, checkIn.grandTotal - totalPaid);

        await checkIn.save();

        await logSuccess({
            module: 'CheckIn',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'AddRoom',
            heading: 'Room Added Successfully',
            description: `Room ${newRoom.roomNumber} added to check-in ${checkIn.checkInNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Room added successfully",
            data: checkIn
        });

    } catch (error) {
        console.error("Error adding room:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add room",
            error: error.message
        });
    }
});

// ============================================
// CHANGE ROOM - WITH CLEANING + HOUSEKEEPING - UPDATED WITH PRICE FROM FRONTEND
// ============================================
router.put("/change-room/:checkInId", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { checkInId } = req.params;
        const { oldRoomId, newRoomId, newRoomPrice } = req.body;

        if (!oldRoomId || !newRoomId) {
            return res.status(400).json({
                success: false,
                message: "Old room and new room are required"
            });
        }

        const checkIn = await CheckIn.findOne({ checkInId });
        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        if (checkIn.status !== 'Active') {
            return res.status(400).json({
                success: false,
                message: "Only active check-ins can be modified"
            });
        }

        const oldRoomIndex = checkIn.roomDetails.findIndex(r => r.roomId === oldRoomId);
        if (oldRoomIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Old room not found in this check-in"
            });
        }

        const oldRoomDetail = checkIn.roomDetails[oldRoomIndex];

        const newRoom = await Room.findOne({ roomId: newRoomId });
        if (!newRoom) {
            return res.status(404).json({
                success: false,
                message: "New room not found"
            });
        }

        const newCategory = await Category.findOne({ categoryId: newRoom.categoryId });
        if (!newCategory) {
            return res.status(404).json({
                success: false,
                message: "Category for new room not found"
            });
        }

        const currentDate = new Date();
        const mainCheckOut = new Date(checkIn.checkOutDate);

        if (mainCheckOut <= currentDate) {
            return res.status(400).json({
                success: false,
                message: "Cannot change room after check-out time"
            });
        }

        const availabilityResult = await checkRoomAvailability(
            newRoomId,
            currentDate,
            mainCheckOut,
            checkIn._id
        );

        if (!availabilityResult.available) {
            return res.status(400).json({
                success: false,
                message: `Room ${newRoom.roomNumber} - ${availabilityResult.reason}`
            });
        }

        const remainingHours = Math.ceil((mainCheckOut - currentDate) / (1000 * 60 * 60));

        if (remainingHours <= 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot change room after check-out time"
            });
        }

        const oldRoomCheckIn = new Date(oldRoomDetail.checkInDate);
        const hoursUsed = Math.ceil((currentDate - oldRoomCheckIn) / (1000 * 60 * 60));

        const oldRoom = await Room.findOne({ roomId: oldRoomId });
        const oldCategory = await Category.findOne({ categoryId: oldRoom.categoryId });

        // ✅ Use price from frontend if provided, else calculate
        let finalNewRoomPrice = newRoomPrice || 0;
        if (!newRoomPrice) {
            if (checkIn.bookingType === 'perNight') {
                finalNewRoomPrice = newCategory.pricing.perNight || 0;
            } else {
                finalNewRoomPrice = calculatePriceForHours(newCategory.pricing, remainingHours);
            }
        }

        const oldRoomPrice = calculatePriceForHours(oldCategory.pricing, hoursUsed);
        const newTotalPrice = oldRoomPrice + finalNewRoomPrice;

        checkIn.removedRooms = checkIn.removedRooms || [];
        checkIn.removedRooms.push({
            roomId: oldRoomDetail.roomId,
            roomNumber: oldRoomDetail.roomNumber,
            categoryId: oldRoomDetail.categoryId || checkIn.categoryId || '',
            categoryName: oldRoomDetail.categoryName,
            checkInDate: oldRoomDetail.checkInDate,
            checkOutDate: currentDate,
            actualCheckOut: mainCheckOut,
            price: oldRoomPrice,
            hoursUsed: hoursUsed,
            durationLabel: getDurationLabel(hoursUsed),
            reason: `Room changed to ${newRoom.roomNumber}`,
            removedAt: new Date()
        });

        checkIn.roomDetails[oldRoomIndex] = {
            roomId: newRoom.roomId,
            roomNumber: newRoom.roomNumber,
            categoryId: newRoom.categoryId,
            categoryName: newCategory.categoryName,
            checkInDate: currentDate,
            checkOutDate: mainCheckOut,
            price: finalNewRoomPrice,
            totalHours: remainingHours,
            totalDays: Math.floor(remainingHours / 24),
            remainingHours: remainingHours % 24,
            durationLabel: checkIn.bookingType === 'perNight' ? 'Night Stay' : getDurationLabel(remainingHours)
        };

        const roomIdIndex = checkIn.roomIds.indexOf(oldRoomId);
        if (roomIdIndex !== -1) {
            checkIn.roomIds[roomIdIndex] = newRoomId;
        }

        await Room.findOneAndUpdate(
            { roomId: oldRoomId },
            { status: 'Cleaning' }
        );
        await Room.findOneAndUpdate(
            { roomId: newRoomId },
            { status: 'Occupied' }
        );

        try {
            const Housekeeping = require("../models/housekeeping");
            const oldRoom = await Room.findOne({ roomId: oldRoomId });

            const housekeepingData = {
                roomId: oldRoom.roomId,
                roomNumber: oldRoom.roomNumber,
                categoryId: oldRoom.categoryId || '',
                categoryName: oldRoom.categoryName || '',
                checkOutId: null,
                checkOutNumber: null,
                customerId: checkIn.customerId,
                customerName: checkIn.customerName,
                customerPhone: checkIn.customerPhone,
                status: 'Pending',
                note: `Room changed to ${newRoom.roomNumber} - needs cleaning`,
                createdBy: {
                    userId: req.user.userId,
                    userName: req.user.name,
                    userEmail: req.user.email
                }
            };

            const task = new Housekeeping(housekeepingData);
            await task.save();
            console.log(`✅ Housekeeping task created for old room ${oldRoom.roomNumber} (room change)`);
        } catch (hkError) {
            console.error("❌ Failed to create housekeeping task:", hkError.message);
        }

        // ✅ Recalculate base price (sum of all room prices - NO RECALCULATION)
        const activeRoomsTotal = checkIn.roomDetails.reduce((sum, r) => sum + (r.price || 0), 0);
        const removedRoomsTotal = checkIn.removedRooms.reduce((sum, r) => sum + (r.price || 0), 0);

        checkIn.basePrice = activeRoomsTotal + removedRoomsTotal;
        checkIn.subtotal = checkIn.basePrice + checkIn.extraRequirementsTotal;
        checkIn.taxAmount = (checkIn.subtotal * checkIn.taxSlab) / 100;
        checkIn.grandTotal = checkIn.subtotal + checkIn.taxAmount;

        const totalPaid = (checkIn.amountPaid || 0) + (checkIn.advancePaid || 0);
        checkIn.balanceAmount = Math.max(0, checkIn.grandTotal - totalPaid);

        await checkIn.save();

        await logSuccess({
            module: 'CheckIn',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Room Changed Successfully',
            description: `Room ${oldRoomDetail.roomNumber} changed to ${newRoom.roomNumber} in check-in ${checkIn.checkInNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Room changed successfully",
            data: checkIn
        });

    } catch (error) {
        console.error("Error changing room:", error);
        res.status(500).json({
            success: false,
            message: "Failed to change room",
            error: error.message
        });
    }
});

// ============================================
// REMOVE ROOM - WITH CLEANING + HOUSEKEEPING
// ============================================
router.put("/remove-room/:checkInId", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { checkInId } = req.params;
        const { roomId, price, reason } = req.body;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: "Room ID is required"
            });
        }

        const checkIn = await CheckIn.findOne({ checkInId });
        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        if (checkIn.status !== 'Active') {
            return res.status(400).json({
                success: false,
                message: "Only active check-ins can be modified"
            });
        }

        if (checkIn.roomDetails.length <= 1) {
            return res.status(400).json({
                success: false,
                message: "Cannot remove the last room. At least one room must remain in the check-in."
            });
        }

        const roomIndex = checkIn.roomDetails.findIndex(r => r.roomId === roomId);
        if (roomIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Room not found in this check-in"
            });
        }

        const removedRoomDetail = checkIn.roomDetails[roomIndex];

        const currentDate = new Date();
        const oldRoomCheckIn = new Date(removedRoomDetail.checkInDate);
        const hoursUsed = Math.ceil((currentDate - oldRoomCheckIn) / (1000 * 60 * 60));
        const mainCheckOut = new Date(checkIn.checkOutDate);

        checkIn.removedRooms = checkIn.removedRooms || [];
        checkIn.removedRooms.push({
            roomId: removedRoomDetail.roomId,
            roomNumber: removedRoomDetail.roomNumber,
            categoryId: removedRoomDetail.categoryId || checkIn.categoryId || '',
            categoryName: removedRoomDetail.categoryName,
            checkInDate: removedRoomDetail.checkInDate,
            checkOutDate: currentDate,
            actualCheckOut: mainCheckOut,
            price: price || 0,
            hoursUsed: hoursUsed,
            durationLabel: getDurationLabel(hoursUsed),
            reason: reason || 'Room removed',
            removedAt: new Date()
        });

        checkIn.roomDetails.splice(roomIndex, 1);
        checkIn.roomIds = checkIn.roomIds.filter(id => id !== roomId);

        await Room.findOneAndUpdate(
            { roomId: roomId },
            { status: 'Cleaning' }
        );

        try {
            const Housekeeping = require("../models/housekeeping");
            const removedRoom = await Room.findOne({ roomId: roomId });

            const housekeepingData = {
                roomId: removedRoom.roomId,
                roomNumber: removedRoom.roomNumber,
                categoryId: removedRoom.categoryId || '',
                categoryName: removedRoom.categoryName || '',
                checkOutId: null,
                checkOutNumber: null,
                customerId: checkIn.customerId,
                customerName: checkIn.customerName,
                customerPhone: checkIn.customerPhone,
                status: 'Pending',
                note: `Room removed from stay - needs cleaning${reason ? ` (${reason})` : ''}`,
                createdBy: {
                    userId: req.user.userId,
                    userName: req.user.name,
                    userEmail: req.user.email
                }
            };

            const task = new Housekeeping(housekeepingData);
            await task.save();
            console.log(`✅ Housekeeping task created for removed room ${removedRoom.roomNumber}`);
        } catch (hkError) {
            console.error("❌ Failed to create housekeeping task:", hkError.message);
        }

        // ✅ Recalculate base price (sum of all room prices - NO RECALCULATION)
        const activeRoomsTotal = checkIn.roomDetails.reduce((sum, r) => sum + (r.price || 0), 0);
        const removedRoomsTotal = checkIn.removedRooms.reduce((sum, r) => sum + (r.price || 0), 0);

        checkIn.basePrice = activeRoomsTotal + removedRoomsTotal;
        checkIn.subtotal = checkIn.basePrice + checkIn.extraRequirementsTotal;
        checkIn.taxAmount = (checkIn.subtotal * checkIn.taxSlab) / 100;
        checkIn.grandTotal = checkIn.subtotal + checkIn.taxAmount;

        const totalPaid = (checkIn.amountPaid || 0) + (checkIn.advancePaid || 0);
        checkIn.balanceAmount = Math.max(0, checkIn.grandTotal - totalPaid);

        await checkIn.save();

        await logSuccess({
            module: 'CheckIn',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Room Removed Successfully',
            description: `Room ${removedRoomDetail.roomNumber} removed from check-in ${checkIn.checkInNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Room removed successfully",
            data: checkIn
        });

    } catch (error) {
        console.error("Error removing room:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove room",
            error: error.message
        });
    }
});

// ============================================
// EXTEND STAY - UPDATED WITH CLEANING + HOUSEKEEPING
// ============================================
router.put("/extend-stay/:checkInId", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { checkInId } = req.params;
        const {
            newCheckOutDate,
            option,
            changedRooms = [],
            reason
        } = req.body;

        console.log("========================================");
        console.log("📝 EXTEND STAY REQUEST");
        console.log("========================================");
        console.log("📝 checkInId:", checkInId);
        console.log("📝 newCheckOutDate:", newCheckOutDate);
        console.log("📝 option:", option);
        console.log("📝 changedRooms:", changedRooms);
        console.log("📝 reason:", reason);
        console.log("========================================");

        if (!newCheckOutDate) {
            return res.status(400).json({
                success: false,
                message: "New check-out date is required"
            });
        }

        if (!option || !['same-room', 'change-room'].includes(option)) {
            return res.status(400).json({
                success: false,
                message: "Extension option is required. Choose 'same-room' or 'change-room'"
            });
        }

        const checkIn = await CheckIn.findOne({ checkInId });
        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        if (checkIn.status !== 'Active') {
            return res.status(400).json({
                success: false,
                message: "Only active check-ins can be extended"
            });
        }

        const newDate = new Date(newCheckOutDate);
        const currentCheckOut = new Date(checkIn.checkOutDate);

        if (newDate <= currentCheckOut) {
            return res.status(400).json({
                success: false,
                message: "New check-out date must be after current check-out date"
            });
        }

        const checkInDate = new Date(checkIn.checkInDate);
        const totalNewDurationHours = Math.ceil((newDate - checkInDate) / (1000 * 60 * 60));

        // ============================================
        // OPTION 1: STAY IN SAME ROOM (extend all rooms)
        // ============================================
        if (option === 'same-room') {
            console.log("📝 Option: Stay in Same Room - Extending all rooms");

            let totalBasePrice = 0;
            let totalExtraHoursPrice = 0;
            let maxTotalHours = 0;
            let overallTotalHours = 0;
            let overallTotalDays = 0;
            let overallRemainingHours = 0;
            let overallDurationLabel = '';
            let systemCalculatedCheckOut = null;
            const updatedRoomDetails = [];

            for (const roomDetail of checkIn.roomDetails) {
                const room = await Room.findOne({ roomId: roomDetail.roomId });
                if (!room) continue;

                const category = await Category.findOne({ categoryId: room.categoryId });
                if (!category) continue;

                const pricing = category.pricing;
                const start = new Date(roomDetail.checkInDate);
                const end = new Date(newDate);
                const diffMs = end - start;
                const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));

                let basePrice = 0;
                let extraHoursPrice = 0;
                let durationLabel = '';
                let totalDays = 0;
                let remainingHours = 0;
                let sysCheckOut = new Date(start);

                if (checkIn.bookingType === 'perNight') {
                    basePrice = pricing.perNight || 0;
                    durationLabel = 'Night Stay';
                    sysCheckOut = new Date(newDate);
                } else {
                    // Simple mode
                    if (totalHours <= 6) {
                        basePrice = pricing.per6Hours || 0;
                        durationLabel = '6 Hours';
                        sysCheckOut.setHours(start.getHours() + 6);
                    } else if (totalHours <= 12) {
                        basePrice = pricing.per12Hours || 0;
                        durationLabel = '12 Hours';
                        sysCheckOut.setHours(start.getHours() + 12);
                    } else {
                        totalDays = Math.floor(totalHours / 24);
                        remainingHours = totalHours % 24;

                        basePrice = totalDays * (pricing.perDay || 0);

                        if (remainingHours === 0) {
                            durationLabel = totalDays === 1 ? '1 Day' : `${totalDays} Days`;
                            sysCheckOut.setHours(start.getHours() + (totalDays * 24));
                        } else if (remainingHours <= 6) {
                            extraHoursPrice = pricing.per6Hours || 0;
                            durationLabel = totalDays === 1 ? '1 Day + 6 Hours' : `${totalDays} Days + 6 Hours`;
                            sysCheckOut.setHours(start.getHours() + (totalDays * 24) + 6);
                        } else if (remainingHours <= 12) {
                            extraHoursPrice = pricing.per12Hours || 0;
                            durationLabel = totalDays === 1 ? '1 Day + 12 Hours' : `${totalDays} Days + 12 Hours`;
                            sysCheckOut.setHours(start.getHours() + (totalDays * 24) + 12);
                        } else {
                            basePrice = (totalDays + 1) * (pricing.perDay || 0);
                            durationLabel = totalDays + 1 === 1 ? '1 Day' : `${totalDays + 1} Days`;
                            sysCheckOut.setHours(start.getHours() + ((totalDays + 1) * 24));
                            remainingHours = 0;
                            extraHoursPrice = 0;
                        }
                    }
                }

                totalBasePrice += basePrice;
                totalExtraHoursPrice += extraHoursPrice;

                if (totalHours > maxTotalHours) {
                    maxTotalHours = totalHours;
                    overallTotalHours = totalHours;
                    overallTotalDays = totalDays;
                    overallRemainingHours = remainingHours;
                    overallDurationLabel = durationLabel;
                    systemCalculatedCheckOut = sysCheckOut;
                }

                updatedRoomDetails.push({
                    ...roomDetail,
                    checkOutDate: sysCheckOut,
                    price: basePrice + extraHoursPrice,
                    totalHours: totalHours,
                    totalDays: totalDays,
                    remainingHours: remainingHours,
                    durationLabel: durationLabel
                });

                console.log(`✅ Room ${roomDetail.roomNumber} extended: ${roomDetail.durationLabel} → ${durationLabel}`);
            }

            checkIn.roomDetails = updatedRoomDetails;
            checkIn.totalHours = overallTotalHours;
            checkIn.totalDays = overallTotalDays;
            checkIn.remainingHours = overallRemainingHours;
            checkIn.durationLabel = checkIn.bookingType === 'perNight' ? 'Night Stay' : overallDurationLabel;
            checkIn.checkOutDate = systemCalculatedCheckOut || newDate;
            checkIn.userSelectedCheckOut = newDate;
            checkIn.isExtended = true;
            checkIn.originalCheckOut = checkIn.originalCheckOut || currentCheckOut;

            if (checkIn.roomDetails.length > 0) {
                const firstRoom = checkIn.roomDetails[0];
                checkIn.roomNumber = firstRoom.roomNumber;
                checkIn.categoryId = firstRoom.categoryId;
                checkIn.categoryName = firstRoom.categoryName;
                checkIn.roomId = firstRoom.roomId;
            }

            console.log(`✅ All ${checkIn.roomDetails.length} rooms extended to ${newDate}`);
        }

        // ============================================
        // OPTION 2: CHANGE ROOM WITH EXTEND
        // ============================================
        else {
            console.log("📝 Option: Change Room with Extend");

            if (!changedRooms || changedRooms.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "At least one room change is required for 'change-room' option"
                });
            }

            const roomChanges = [];
            for (const change of changedRooms) {
                const { oldRoomId, newRoomId } = change;
                if (!newRoomId) continue;

                const oldRoomExists = checkIn.roomDetails.find(r => r.roomId === oldRoomId);
                if (!oldRoomExists) {
                    return res.status(404).json({
                        success: false,
                        message: `Room ${oldRoomId} not found in this check-in`
                    });
                }

                if (checkIn.roomIds.includes(newRoomId)) {
                    const room = await Room.findOne({ roomId: newRoomId });
                    return res.status(400).json({
                        success: false,
                        message: `Room ${room?.roomNumber || newRoomId} is already in this check-in`
                    });
                }

                const availabilityResult = await checkRoomAvailability(
                    newRoomId,
                    checkInDate,
                    newDate,
                    checkIn._id
                );

                if (!availabilityResult.available) {
                    const room = await Room.findOne({ roomId: newRoomId });
                    return res.status(400).json({
                        success: false,
                        message: `Room ${room?.roomNumber || newRoomId} - ${availabilityResult.reason}`
                    });
                }

                roomChanges.push({ oldRoomId, newRoomId, oldRoomDetail: oldRoomExists });
            }

            console.log(`✅ ${roomChanges.length} room changes validated`);

            const currentDate = new Date();
            const remainingHours = Math.ceil((newDate - currentDate) / (1000 * 60 * 60));

            for (const roomId of checkIn.roomIds) {
                const isBeingChanged = roomChanges.some(c => c.oldRoomId === roomId);
                if (isBeingChanged) continue;

                const availabilityResult = await checkRoomAvailability(
                    roomId,
                    checkInDate,
                    newDate,
                    checkIn._id
                );

                if (!availabilityResult.available) {
                    const room = await Room.findOne({ roomId });
                    return res.status(400).json({
                        success: false,
                        message: `Room ${room?.roomNumber || roomId} - ${availabilityResult.reason} for the extended dates`
                    });
                }
            }

            const changeMap = {};
            roomChanges.forEach(change => {
                changeMap[change.oldRoomId] = change.newRoomId;
            });

            let totalBasePrice = 0;
            let totalExtraHoursPrice = 0;
            let maxTotalHours = 0;
            let overallTotalHours = 0;
            let overallTotalDays = 0;
            let overallRemainingHours = 0;
            let overallDurationLabel = '';
            let systemCalculatedCheckOut = null;
            const updatedRoomDetails = [];

            for (const roomDetail of checkIn.roomDetails) {
                const oldRoomId = roomDetail.roomId;
                const newRoomId = changeMap[oldRoomId] || null;

                let roomToUse = roomDetail;

                if (newRoomId) {
                    const newRoom = await Room.findOne({ roomId: newRoomId });
                    const newCategory = await Category.findOne({ categoryId: newRoom.categoryId });

                    const oldRoomCheckIn = new Date(roomDetail.checkInDate);
                    const hoursUsed = Math.ceil((currentDate - oldRoomCheckIn) / (1000 * 60 * 60));
                    const totalHoursForNewRoom = Math.ceil((newDate - currentDate) / (1000 * 60 * 60));

                    const oldRoom = await Room.findOne({ roomId: oldRoomId });
                    const oldCategory = await Category.findOne({ categoryId: oldRoom.categoryId });
                    const oldRoomPrice = calculatePriceForHours(oldCategory.pricing, hoursUsed);

                    let newRoomPrice = 0;
                    if (checkIn.bookingType === 'perNight') {
                        newRoomPrice = newCategory.pricing.perNight || 0;
                    } else {
                        newRoomPrice = calculatePriceForHours(newCategory.pricing, totalHoursForNewRoom);
                    }
                    const newTotalPrice = oldRoomPrice + newRoomPrice;

                    checkIn.removedRooms = checkIn.removedRooms || [];
                    checkIn.removedRooms.push({
                        roomId: roomDetail.roomId,
                        roomNumber: roomDetail.roomNumber,
                        categoryId: roomDetail.categoryId || checkIn.categoryId || '',
                        categoryName: roomDetail.categoryName,
                        checkInDate: roomDetail.checkInDate,
                        checkOutDate: currentDate,
                        actualCheckOut: newDate,
                        price: oldRoomPrice,
                        hoursUsed: hoursUsed,
                        durationLabel: getDurationLabel(hoursUsed),
                        reason: `Room changed during extension to ${newRoom.roomNumber}`,
                        removedAt: new Date()
                    });

                    await Room.findOneAndUpdate(
                        { roomId: oldRoomId },
                        { status: 'Cleaning' }
                    );
                    await Room.findOneAndUpdate(
                        { roomId: newRoomId },
                        { status: 'Occupied' }
                    );

                    try {
                        const Housekeeping = require("../models/housekeeping");
                        const oldRoom = await Room.findOne({ roomId: oldRoomId });

                        const housekeepingData = {
                            roomId: oldRoom.roomId,
                            roomNumber: oldRoom.roomNumber,
                            categoryId: oldRoom.categoryId || '',
                            categoryName: oldRoom.categoryName || '',
                            checkOutId: null,
                            checkOutNumber: null,
                            customerId: checkIn.customerId,
                            customerName: checkIn.customerName,
                            customerPhone: checkIn.customerPhone,
                            status: 'Pending',
                            note: `Room changed during extension to ${newRoom.roomNumber} - needs cleaning`,
                            createdBy: {
                                userId: req.user.userId,
                                userName: req.user.name,
                                userEmail: req.user.email
                            }
                        };

                        const task = new Housekeeping(housekeepingData);
                        await task.save();
                        console.log(`✅ Housekeeping task created for old room ${oldRoom.roomNumber} (extension change)`);
                    } catch (hkError) {
                        console.error("❌ Failed to create housekeeping task:", hkError.message);
                    }

                    checkIn.extensionRooms = checkIn.extensionRooms || [];
                    checkIn.extensionRooms.push({
                        roomId: newRoom.roomId,
                        roomNumber: newRoom.roomNumber,
                        categoryId: newRoom.categoryId,
                        categoryName: newCategory.categoryName,
                        fromDate: currentCheckOut,
                        toDate: newDate,
                        price: newTotalPrice,
                        reason: `Room changed from ${roomDetail.roomNumber} to ${newRoom.roomNumber}: ${reason || 'Room change'}`
                    });

                    const idIndex = checkIn.roomIds.indexOf(oldRoomId);
                    if (idIndex !== -1) {
                        checkIn.roomIds[idIndex] = newRoomId;
                    }

                    roomToUse = {
                        roomId: newRoom.roomId,
                        roomNumber: newRoom.roomNumber,
                        categoryId: newRoom.categoryId,
                        categoryName: newCategory.categoryName,
                        checkInDate: currentDate,
                        checkOutDate: newDate,
                        price: newTotalPrice,
                        totalHours: totalHoursForNewRoom,
                        totalDays: Math.floor(totalHoursForNewRoom / 24),
                        remainingHours: totalHoursForNewRoom % 24,
                        durationLabel: checkIn.bookingType === 'perNight' ? 'Night Stay' : getDurationLabel(totalHoursForNewRoom)
                    };

                    console.log(`✅ Room ${roomDetail.roomNumber} → ${newRoom.roomNumber} (Cleaning + Housekeeping created)`);

                } else {
                    const room = await Room.findOne({ roomId: roomDetail.roomId });
                    if (!room) continue;

                    const category = await Category.findOne({ categoryId: room.categoryId });
                    if (!category) continue;

                    const pricing = category.pricing;
                    const start = new Date(roomDetail.checkInDate);
                    const end = new Date(newDate);
                    const diffMs = end - start;
                    const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));

                    let basePrice = 0;
                    let extraHoursPrice = 0;
                    let durationLabel = '';
                    let totalDays = 0;
                    let remainingHours = 0;
                    let sysCheckOut = new Date(start);

                    if (checkIn.bookingType === 'perNight') {
                        basePrice = pricing.perNight || 0;
                        durationLabel = 'Night Stay';
                        sysCheckOut = new Date(newDate);
                    } else {
                        if (totalHours <= 6) {
                            basePrice = pricing.per6Hours || 0;
                            durationLabel = '6 Hours';
                            sysCheckOut.setHours(start.getHours() + 6);
                        } else if (totalHours <= 12) {
                            basePrice = pricing.per12Hours || 0;
                            durationLabel = '12 Hours';
                            sysCheckOut.setHours(start.getHours() + 12);
                        } else {
                            totalDays = Math.floor(totalHours / 24);
                            remainingHours = totalHours % 24;

                            basePrice = totalDays * (pricing.perDay || 0);

                            if (remainingHours === 0) {
                                durationLabel = totalDays === 1 ? '1 Day' : `${totalDays} Days`;
                                sysCheckOut.setHours(start.getHours() + (totalDays * 24));
                            } else if (remainingHours <= 6) {
                                extraHoursPrice = pricing.per6Hours || 0;
                                durationLabel = totalDays === 1 ? '1 Day + 6 Hours' : `${totalDays} Days + 6 Hours`;
                                sysCheckOut.setHours(start.getHours() + (totalDays * 24) + 6);
                            } else if (remainingHours <= 12) {
                                extraHoursPrice = pricing.per12Hours || 0;
                                durationLabel = totalDays === 1 ? '1 Day + 12 Hours' : `${totalDays} Days + 12 Hours`;
                                sysCheckOut.setHours(start.getHours() + (totalDays * 24) + 12);
                            } else {
                                basePrice = (totalDays + 1) * (pricing.perDay || 0);
                                durationLabel = totalDays + 1 === 1 ? '1 Day' : `${totalDays + 1} Days`;
                                sysCheckOut.setHours(start.getHours() + ((totalDays + 1) * 24));
                                remainingHours = 0;
                                extraHoursPrice = 0;
                            }
                        }
                    }

                    roomToUse = {
                        ...roomDetail,
                        checkOutDate: sysCheckOut,
                        price: basePrice + extraHoursPrice,
                        totalHours: totalHours,
                        totalDays: totalDays,
                        remainingHours: remainingHours,
                        durationLabel: durationLabel
                    };

                    console.log(`✅ Room ${roomDetail.roomNumber} extended (stays same)`);
                }

                totalBasePrice += roomToUse.price || 0;
                const totalHours = roomToUse.totalHours || 0;
                if (totalHours > maxTotalHours) {
                    maxTotalHours = totalHours;
                    overallTotalHours = totalHours;
                    overallTotalDays = roomToUse.totalDays || 0;
                    overallRemainingHours = roomToUse.remainingHours || 0;
                    overallDurationLabel = roomToUse.durationLabel || '';
                    systemCalculatedCheckOut = roomToUse.checkOutDate || newDate;
                }

                updatedRoomDetails.push(roomToUse);
            }

            checkIn.roomDetails = updatedRoomDetails;
            checkIn.totalHours = overallTotalHours;
            checkIn.totalDays = overallTotalDays;
            checkIn.remainingHours = overallRemainingHours;
            checkIn.durationLabel = checkIn.bookingType === 'perNight' ? 'Night Stay' : overallDurationLabel;
            checkIn.checkOutDate = systemCalculatedCheckOut || newDate;
            checkIn.userSelectedCheckOut = newDate;
            checkIn.isExtended = true;
            checkIn.originalCheckOut = checkIn.originalCheckOut || currentCheckOut;

            if (checkIn.roomDetails.length > 0) {
                const firstRoom = checkIn.roomDetails[0];
                checkIn.roomNumber = firstRoom.roomNumber;
                checkIn.categoryId = firstRoom.categoryId;
                checkIn.categoryName = firstRoom.categoryName;
                checkIn.roomId = firstRoom.roomId;
            }

            console.log("✅ Room changes applied successfully!");
        }

        // ✅ Recalculate base price (sum of all room prices - NO RECALCULATION)
        const activeRoomsTotal = checkIn.roomDetails.reduce((sum, r) => sum + (r.price || 0), 0);
        const removedRoomsTotal = checkIn.removedRooms.reduce((sum, r) => sum + (r.price || 0), 0);

        checkIn.basePrice = activeRoomsTotal + removedRoomsTotal;
        checkIn.subtotal = checkIn.basePrice + checkIn.extraRequirementsTotal;
        checkIn.taxAmount = (checkIn.subtotal * checkIn.taxSlab) / 100;
        checkIn.grandTotal = checkIn.subtotal + checkIn.taxAmount;

        const totalPaid = (checkIn.amountPaid || 0) + (checkIn.advancePaid || 0);
        checkIn.balanceAmount = Math.max(0, checkIn.grandTotal - totalPaid);

        await checkIn.save();

        console.log("========================================");
        console.log("🎉 EXTEND STAY COMPLETED SUCCESSFULLY!");
        console.log("========================================");

        await logSuccess({
            module: 'CheckIn',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Stay Extended Successfully',
            description: `Check-in ${checkIn.checkInNumber} extended to ${newDate.toISOString().split('T')[0]} with ${checkIn.roomDetails.length} room(s)`
        });

        res.status(200).json({
            success: true,
            message: "Stay extended successfully",
            data: checkIn
        });

    } catch (error) {
        console.error("❌ Error extending stay:", error);
        res.status(500).json({
            success: false,
            message: "Failed to extend stay",
            error: error.message
        });
    }
});

// ============================================
// UPLOAD ID PROOF
// ============================================
router.post("/upload-id-proof/:checkInId", auth, checkCheckInPermission, upload.single('idProof'), async (req, res) => {
    try {
        const { checkInId } = req.params;
        const { label } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }

        const checkIn = await CheckIn.findOne({ checkInId });
        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        const idProof = {
            label: label || 'Other',
            fileName: req.file.originalname,
            fileUrl: `/uploads/id-proofs/${req.file.filename}`,
            fileSize: req.file.size
        };

        checkIn.idProofs.push(idProof);
        await checkIn.save();

        res.status(200).json({
            success: true,
            message: "ID Proof uploaded successfully",
            data: idProof
        });

    } catch (error) {
        console.error("Error uploading ID proof:", error);
        res.status(500).json({
            success: false,
            message: "Failed to upload ID proof",
            error: error.message
        });
    }
});

// ============================================
// DELETE ID PROOF
// ============================================
router.delete("/delete-id-proof/:checkInId/:proofId", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { checkInId, proofId } = req.params;

        const checkIn = await CheckIn.findOne({ checkInId });
        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        const proofIndex = checkIn.idProofs.findIndex(p => p.proofId === proofId);
        if (proofIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "ID Proof not found"
            });
        }

        const filePath = path.join(__dirname, `../${checkIn.idProofs[proofIndex].fileUrl}`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        checkIn.idProofs.splice(proofIndex, 1);
        await checkIn.save();

        res.status(200).json({
            success: true,
            message: "ID Proof deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting ID proof:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete ID proof",
            error: error.message
        });
    }
});

// ============================================
// DELETE CHECK-IN - WITH BOOKING REVERT
// ============================================
router.delete("/delete-checkin/:id", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const checkIn = await CheckIn.findOne({ checkInId: id });
        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Check-in not found"
            });
        }

        if (checkIn.bookingId) {
            const booking = await Booking.findOne({ bookingId: checkIn.bookingId });
            if (booking) {
                booking.status = 'Confirmed';
                booking.checkInId = null;
                booking.checkInNumber = null;
                await booking.save();
            }
        }

        for (const roomId of checkIn.roomIds) {
            await Room.findOneAndUpdate(
                { roomId },
                { status: 'Available' }
            );
        }

        if (checkIn.idProofs && checkIn.idProofs.length > 0) {
            checkIn.idProofs.forEach(proof => {
                const filePath = path.join(__dirname, `../${proof.fileUrl}`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        await CheckIn.findOneAndDelete({ checkInId: id });

        await logSuccess({
            module: 'CheckIn',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Delete',
            heading: 'Check-in Deleted Successfully',
            description: `Check-in ${checkIn.checkInNumber} deleted${checkIn.bookingId ? ` and booking ${checkIn.bookingNumber} reverted` : ''}`
        });

        res.status(200).json({
            success: true,
            message: "Check-in deleted successfully",
            bookingReverted: !!checkIn.bookingId
        });

    } catch (error) {
        console.error("Error deleting check-in:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete check-in",
            error: error.message
        });
    }
});

// ============================================
// OCCUPANCY STATS
// ============================================
router.get("/occupancy-stats", auth, checkCheckInPermission, async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const totalRooms = await Room.countDocuments({ isActive: true });

        const occupiedCheckIns = await CheckIn.find({
            status: 'Active',
            checkInDate: { $lte: targetDate },
            checkOutDate: { $gte: targetDate }
        }).select('roomIds').lean();

        const occupiedRoomIds = new Set();
        occupiedCheckIns.forEach(c => {
            if (c.roomIds && Array.isArray(c.roomIds)) {
                c.roomIds.forEach(id => occupiedRoomIds.add(id));
            }
        });

        const occupiedRooms = occupiedRoomIds.size;

        const checkInsToday = await CheckIn.countDocuments({
            checkInDate: { $gte: targetDate, $lt: nextDate }
        });

        const checkOutsToday = await CheckIn.countDocuments({
            checkOutDate: { $gte: targetDate, $lt: nextDate },
            status: 'Active'
        });

        const revenueToday = await CheckIn.aggregate([
            {
                $match: {
                    checkInDate: { $gte: targetDate, $lt: nextDate },
                    status: { $in: ['Active', 'Checked-out'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$grandTotal' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalRooms,
                occupiedRooms,
                availableRooms: totalRooms - occupiedRooms,
                occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(2) : 0,
                checkInsToday,
                checkOutsToday,
                revenueToday: revenueToday[0]?.total || 0
            }
        });

    } catch (error) {
        console.error("Error fetching occupancy stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch occupancy stats",
            error: error.message
        });
    }
});

module.exports = router;