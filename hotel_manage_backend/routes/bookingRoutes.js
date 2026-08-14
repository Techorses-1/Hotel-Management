const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const Customer = require("../models/customer");
const Room = require("../models/room");
const Category = require("../models/category");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { logSuccess, logFailed } = require("../utils/logHelper");
const generateNumber = require("../utils/generateNumber");

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
const checkBookingPermission = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes('admin') || permissions.includes('reception')) {
        next();
    } else {
        return res.status(403).json({
            message: 'Access denied. Booking permission required.'
        });
    }
};

// ============================================
// GENERATE BOOKING NUMBER
// ============================================
const generateBookingNumber = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `BK-${year}${month}${day}`;

    const lastBooking = await Booking.findOne({
        bookingNumber: { $regex: `^${prefix}` }
    }).sort({ bookingNumber: -1 });

    let sequence = 1;
    if (lastBooking) {
        const lastSeq = parseInt(lastBooking.bookingNumber.split('-')[2]);
        sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

// ============================================
// CHECK ROOM AVAILABILITY FOR BOOKING
// ============================================
const checkRoomAvailabilityForBooking = async (roomId, checkInDate, checkOutDate, excludeBookingId = null) => {
    // Check if room is already booked (Confirmed bookings)
    const query = {
        roomIds: { $in: [roomId] },
        status: 'Confirmed',
        _id: { $ne: excludeBookingId },
        $or: [
            { checkInDate: { $lt: checkOutDate }, checkOutDate: { $gt: checkInDate } }
        ]
    };

    const existingBooking = await Booking.findOne(query);
    if (existingBooking) return false;

    // Check if room is already occupied (Active Check-ins)
    const CheckIn = require("../models/checkIn");
    const existingCheckIn = await CheckIn.findOne({
        roomIds: { $in: [roomId] },
        status: 'Active',
        $or: [
            { checkInDate: { $lt: checkOutDate }, checkOutDate: { $gt: checkInDate } }
        ]
    });

    return !existingCheckIn;
};

// ============================================
// HELPER: Get Duration Label (for display only)
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

// ============================================
// GET AVAILABLE ROOMS FOR BOOKING
// ============================================
router.get("/available-rooms", auth, checkBookingPermission, async (req, res) => {
    try {
        const { checkInDate, checkOutDate, categoryId } = req.query;

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

        // Check bookings (Confirmed)
        const overlappingBookings = await Booking.find({
            status: 'Confirmed',
            $or: [
                { checkInDate: { $lt: end }, checkOutDate: { $gt: start } }
            ]
        }).select('roomIds').lean();

        // Check active check-ins
        const CheckIn = require("../models/checkIn");
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

        // Filter out Cleaning and Maintenance rooms
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
            totalAvailable: roomsWithDetails.length
        });

    } catch (error) {
        console.error("Error fetching available rooms for booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch available rooms",
            error: error.message
        });
    }
});

// ============================================
// POST CREATE BOOKING - NEW FLOW (NO PRICE RECALCULATION)
// ============================================
router.post("/create-booking", auth, checkBookingPermission, async (req, res) => {
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
            paymentDetails,
            refundAmount,
            durationLabel // ✅ Frontend sends duration label for display
        } = req.body;

        let roomIdArray = roomIds;
        if (typeof roomIds === 'string') {
            try {
                roomIdArray = JSON.parse(roomIds);
            } catch {
                roomIdArray = [roomIds];
            }
        }

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

        if (userSelectedCheckOutObj <= checkInDateObj) {
            return res.status(400).json({
                success: false,
                message: "Check-out date must be after check-in date"
            });
        }

        // Check all rooms availability
        for (const roomId of roomIdArray) {
            const isAvailable = await checkRoomAvailabilityForBooking(roomId, checkInDateObj, userSelectedCheckOutObj);
            if (!isAvailable) {
                const room = await Room.findOne({ roomId });
                return res.status(400).json({
                    success: false,
                    message: `Room ${room?.roomNumber || roomId} is not available for the selected dates`
                });
            }
        }

        // ✅ Parse room details from frontend (already has price calculated)
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
            // Build room details from roomIds (for backward compatibility)
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

                // ✅ Calculate price based on booking type
                let price = 0;
                if (bookingType === 'perNight') {
                    price = category.pricing.perNight || 0;
                } else {
                    // Simple mode - calculate based on duration
                    if (hours <= 6) {
                        price = category.pricing.per6Hours || 0;
                    } else if (hours <= 12) {
                        price = category.pricing.per12Hours || 0;
                    } else if (hours <= 24) {
                        price = category.pricing.perDay || 0;
                    } else {
                        const days = Math.floor(hours / 24);
                        const remainingHours = hours % 24;
                        price = days * (category.pricing.perDay || 0);
                        if (remainingHours > 0) {
                            if (remainingHours <= 6) {
                                price += category.pricing.per6Hours || 0;
                            } else if (remainingHours <= 12) {
                                price += category.pricing.per12Hours || 0;
                            } else {
                                price += category.pricing.perDay || 0;
                            }
                        }
                    }
                }

                totalHours = hours;
                if (!displayDurationLabel) {
                    displayDurationLabel = bookingType === 'perNight' ? 'Night Stay' : getDurationLabel(hours);
                }

                parsedRoomDetails.push({
                    roomId: room.roomId,
                    roomNumber: room.roomNumber,
                    categoryId: room.categoryId,
                    categoryName: category.categoryName,
                    price: price,
                    totalHours: hours,
                    totalDays: Math.floor(hours / 24),
                    remainingHours: hours % 24,
                    durationLabel: bookingType === 'perNight' ? 'Night Stay' : getDurationLabel(hours)
                });

                totalBasePrice += price;
            }
        } else {
            // ✅ Use frontend data - just calculate total
            for (const room of parsedRoomDetails) {
                totalBasePrice += room.price || 0;
                if (!totalHours) {
                    totalHours = room.totalHours || 0;
                }
                if (!displayDurationLabel) {
                    displayDurationLabel = room.durationLabel || '';
                }
            }
        }

        // ✅ Parse extra requirements
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

        // ✅ Parse payment details
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

        let finalAmountPaid = parseFloat(amountPaid) || 0;
        let finalAdvancePaid = parseFloat(advancePaid) || 0;

        if (parsedPaymentDetails.length > 0) {
            finalAmountPaid = totalFromPaymentDetails;
        }

        const totalPaid = finalAmountPaid + finalAdvancePaid;
        const balanceAmount = Math.max(0, grandTotal - totalPaid);

        let paymentStatus = 'Not Paid';
        if (balanceAmount === 0 && grandTotal > 0) {
            paymentStatus = 'Paid';
        } else if (balanceAmount < grandTotal && balanceAmount > 0) {
            paymentStatus = 'Partial Paid';
        }

        const bookingNumber = await generateNumber('BK', 'booking');
        const primaryRoom = parsedRoomDetails[0];
        const primaryRoomData = await Room.findOne({ roomId: roomIdArray[0] });

        // ✅ Set system calculated check-out (same as user selected for perNight)
        let systemCalculatedCheckOut = userSelectedCheckOutObj;
        if (bookingType !== 'perNight') {
            // For simple mode, calculate system check-out based on duration
            const start = new Date(checkInDateObj);
            const end = new Date(userSelectedCheckOutObj);
            const diffMs = end - start;
            const hours = Math.ceil(diffMs / (1000 * 60 * 60));

            let sysCheckOut = new Date(start);
            if (hours <= 6) {
                sysCheckOut.setHours(start.getHours() + 6);
            } else if (hours <= 12) {
                sysCheckOut.setHours(start.getHours() + 12);
            } else {
                const days = Math.floor(hours / 24);
                const remainingHours = hours % 24;
                let totalHoursToAdd = days * 24;
                if (remainingHours === 0) {
                    // No extra
                } else if (remainingHours <= 6) {
                    totalHoursToAdd += 6;
                } else if (remainingHours <= 12) {
                    totalHoursToAdd += 12;
                } else {
                    totalHoursToAdd += 24;
                }
                sysCheckOut.setHours(start.getHours() + totalHoursToAdd);
            }
            systemCalculatedCheckOut = sysCheckOut;
        }

        const bookingData = {
            bookingNumber,
            bookingType: bookingType || 'simple',
            customerId,
            customerName: customer.customerName || customerName,
            customerPhone: customer.contactNumber || customerPhone,
            customerEmail: customer.email || customerEmail || '',
            roomIds: roomIdArray,
            roomDetails: parsedRoomDetails,
            roomId: roomIdArray[0],
            roomNumber: primaryRoomData?.roomNumber || '',
            categoryId: primaryRoomData?.categoryId || '',
            categoryName: primaryRoom?.categoryName || '',
            checkInDate: checkInDateObj,
            checkOutDate: systemCalculatedCheckOut,
            userSelectedCheckOut: userSelectedCheckOutObj,
            totalHours: totalHours,
            totalDays: Math.floor(totalHours / 24),
            remainingHours: totalHours % 24,
            durationLabel: bookingType === 'perNight' ? 'Night Stay' : (displayDurationLabel || getDurationLabel(totalHours)),
            basePrice: totalBasePrice,
            extraHoursPrice: 0,
            perNightPrice: bookingType === 'perNight' ? totalBasePrice : 0,
            extraRequirements: parsedExtraRequirements,
            extraRequirementsTotal: extrasTotal,
            taxSlab: taxSlabValue,
            taxAmount: taxAmount,
            subtotal: subtotal,
            grandTotal: grandTotal,
            paymentStatus: paymentStatus,
            amountPaid: finalAmountPaid,
            advancePaid: finalAdvancePaid,
            balanceAmount: balanceAmount,
            paymentDetails: parsedPaymentDetails,
            paymentType: paymentType,
            refundAmount: parseFloat(refundAmount) || 0,
            notes: notes || '',
            status: 'Confirmed',
            removedRooms: [],
            createdBy: {
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email
            }
        };

        const booking = new Booking(bookingData);
        const savedBooking = await booking.save();

        // Update rooms to Booked
        for (const roomId of roomIdArray) {
            await Room.findOneAndUpdate(
                { roomId },
                { status: 'Booked' }
            );
        }

        await logSuccess({
            module: 'Booking',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Create',
            heading: 'Booking Created Successfully',
            description: `Booking ${bookingNumber} created for ${customer.customerName} with ${roomIdArray.length} room(s) (${bookingType})`
        });

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: savedBooking
        });

    } catch (error) {
        console.error("Error creating booking:", error);

        await logFailed({
            module: 'Booking',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Create',
            heading: 'Booking Creation Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to create booking",
            error: error.message
        });
    }
});

// ============================================
// GET ALL BOOKINGS (PAGINATED)
// ============================================
router.get("/get-bookings", auth, checkBookingPermission, async (req, res) => {
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
                { bookingNumber: { $regex: searchTerm, $options: 'i' } },
                { roomNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        if (status) query.status = status;
        if (customerId) query.customerId = customerId;
        if (roomId) query.roomIds = { $in: [roomId] };

        if (startDate) {
            const dateParts = startDate.split('-');
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const day = parseInt(dateParts[2]);

            const start = new Date(Date.UTC(year, month, day, 0, 0, 0));
            const end = new Date(Date.UTC(year, month, day, 23, 59, 59));

            start.setHours(start.getHours() + 5, start.getMinutes() + 30);
            end.setHours(end.getHours() + 5, end.getMinutes() + 30);

            query.checkInDate = {
                $gte: start,
                $lte: end
            };
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [bookings, total] = await Promise.all([
            Booking.find(query)
                .select('-__v')
                .sort(sortObj)
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .lean(),
            Booking.countDocuments(query)
        ]);

        for (const booking of bookings) {
            if (booking.roomDetails && booking.roomDetails.length > 0) {
                for (const room of booking.roomDetails) {
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
            data: bookings,
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
        console.error("Error fetching bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch bookings",
            error: error.message
        });
    }
});

// ============================================
// GET BOOKING BY ID
// ============================================
router.get("/get-booking/:id", auth, checkBookingPermission, async (req, res) => {
    try {
        const booking = await Booking.findOne({ bookingId: req.params.id }).lean();

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.roomDetails && booking.roomDetails.length > 0) {
            for (const room of booking.roomDetails) {
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
            data: booking
        });

    } catch (error) {
        console.error("Error fetching booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch booking",
            error: error.message
        });
    }
});

// ============================================
// GET BOOKINGS BY CUSTOMER
// ============================================
router.get("/customer/:customerId", auth, checkBookingPermission, async (req, res) => {
    try {
        const { customerId } = req.params;
        const { limit = 10 } = req.query;

        const bookings = await Booking.find({ customerId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .select('bookingNumber roomNumber checkInDate checkOutDate status grandTotal bookingType')
            .lean();

        res.status(200).json({
            success: true,
            data: bookings
        });

    } catch (error) {
        console.error("Error fetching customer bookings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch customer bookings",
            error: error.message
        });
    }
});

// ============================================
// UPDATE BOOKING - WITH BOOKING TYPE VALIDATION
// ============================================
router.put("/update-booking/:id", auth, checkBookingPermission, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const existingBooking = await Booking.findOne({ bookingId: id });
        if (!existingBooking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (existingBooking.status === 'Checked-in') {
            return res.status(400).json({
                success: false,
                message: "Cannot update a checked-in booking"
            });
        }

        if (existingBooking.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: "Cannot update a cancelled booking"
            });
        }

        // ✅ VALIDATE: Cannot change booking type
        if (updateData.bookingType && updateData.bookingType !== existingBooking.bookingType) {
            return res.status(400).json({
                success: false,
                message: `Cannot change booking type from ${existingBooking.bookingType} to ${updateData.bookingType}. Booking type is fixed.`
            });
        }

        // ✅ Handle date updates
        if (updateData.checkInDate || updateData.checkOutDate) {
            const newCheckIn = updateData.checkInDate ? new Date(updateData.checkInDate) : existingBooking.checkInDate;
            const newUserSelectedCheckOut = updateData.checkOutDate ? new Date(updateData.checkOutDate) : existingBooking.userSelectedCheckOut;

            if (newUserSelectedCheckOut <= newCheckIn) {
                return res.status(400).json({
                    success: false,
                    message: "Check-out date must be after check-in date"
                });
            }

            // Check availability for all rooms
            for (const roomId of existingBooking.roomIds) {
                const isAvailable = await checkRoomAvailabilityForBooking(
                    roomId,
                    newCheckIn,
                    newUserSelectedCheckOut,
                    existingBooking._id
                );

                if (!isAvailable) {
                    const room = await Room.findOne({ roomId });
                    return res.status(400).json({
                        success: false,
                        message: `Room ${room?.roomNumber || roomId} is not available for the selected dates`
                    });
                }
            }

            updateData.userSelectedCheckOut = newUserSelectedCheckOut;

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
                let newBasePrice = 0;
                let updatedRoomDetails = [];
                let totalHours = 0;

                for (const roomId of existingBooking.roomIds) {
                    const room = await Room.findOne({ roomId });
                    if (!room) continue;

                    const category = await Category.findOne({ categoryId: room.categoryId });
                    if (!category) continue;

                    const start = new Date(newCheckIn);
                    const end = new Date(newUserSelectedCheckOut);
                    const diffMs = end - start;
                    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
                    totalHours = hours;

                    let price = 0;
                    if (existingBooking.bookingType === 'perNight') {
                        price = category.pricing.perNight || 0;
                    } else {
                        // Simple mode
                        if (hours <= 6) {
                            price = category.pricing.per6Hours || 0;
                        } else if (hours <= 12) {
                            price = category.pricing.per12Hours || 0;
                        } else if (hours <= 24) {
                            price = category.pricing.perDay || 0;
                        } else {
                            const days = Math.floor(hours / 24);
                            const remainingHours = hours % 24;
                            price = days * (category.pricing.perDay || 0);
                            if (remainingHours > 0) {
                                if (remainingHours <= 6) {
                                    price += category.pricing.per6Hours || 0;
                                } else if (remainingHours <= 12) {
                                    price += category.pricing.per12Hours || 0;
                                } else {
                                    price += category.pricing.perDay || 0;
                                }
                            }
                        }
                    }

                    newBasePrice += price;
                    updatedRoomDetails.push({
                        roomId: room.roomId,
                        roomNumber: room.roomNumber,
                        categoryId: room.categoryId,
                        categoryName: category.categoryName,
                        price: price,
                        totalHours: hours,
                        totalDays: Math.floor(hours / 24),
                        remainingHours: hours % 24,
                        durationLabel: existingBooking.bookingType === 'perNight' ? 'Night Stay' : getDurationLabel(hours)
                    });
                }

                updateData.roomDetails = updatedRoomDetails;
                updateData.basePrice = newBasePrice;
                updateData.totalHours = totalHours;
                updateData.durationLabel = existingBooking.bookingType === 'perNight' ? 'Night Stay' : getDurationLabel(totalHours);
            }
        }

        // ✅ Handle extra requirements
        if (updateData.extraRequirements) {
            const parsedExtraReq = typeof updateData.extraRequirements === 'string'
                ? JSON.parse(updateData.extraRequirements)
                : updateData.extraRequirements;
            const extrasTotal = parsedExtraReq.reduce((sum, req) => sum + (req.price || 0), 0);
            updateData.extraRequirementsTotal = extrasTotal;
            updateData.extraRequirements = parsedExtraReq;
        }

        // ✅ Calculate totals (using basePrice from frontend - NO RECALCULATION)
        const basePrice = updateData.basePrice || existingBooking.basePrice;
        const extrasTotal = updateData.extraRequirementsTotal || existingBooking.extraRequirementsTotal;
        const subtotal = basePrice + extrasTotal;
        const taxSlab = updateData.taxSlab || existingBooking.taxSlab;
        const taxAmount = (subtotal * taxSlab) / 100;
        const grandTotal = subtotal + taxAmount;

        updateData.subtotal = subtotal;
        updateData.taxAmount = taxAmount;
        updateData.grandTotal = grandTotal;

        // ✅ Handle payment details
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

        const totalPaid = (updateData.amountPaid || existingBooking.amountPaid || 0) +
            (updateData.advancePaid || existingBooking.advancePaid || 0);
        updateData.balanceAmount = Math.max(0, grandTotal - totalPaid);

        if (updateData.balanceAmount === 0 && grandTotal > 0) {
            updateData.paymentStatus = 'Paid';
        } else if (updateData.balanceAmount < grandTotal && updateData.balanceAmount > 0) {
            updateData.paymentStatus = 'Partial Paid';
        } else if (updateData.balanceAmount === grandTotal) {
            updateData.paymentStatus = 'Not Paid';
        }

        // ✅ For perNight, ensure durationLabel is 'Night Stay'
        if (existingBooking.bookingType === 'perNight') {
            updateData.durationLabel = 'Night Stay';
        }

        updateData.updatedBy = {
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email
        };

        const updatedBooking = await Booking.findOneAndUpdate(
            { bookingId: id },
            updateData,
            { new: true, runValidators: true }
        );

        await logSuccess({
            module: 'Booking',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Booking Updated Successfully',
            description: `Booking ${updatedBooking.bookingNumber} updated`
        });

        res.status(200).json({
            success: true,
            message: "Booking updated successfully",
            data: updatedBooking
        });

    } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update booking",
            error: error.message
        });
    }
});

// ============================================
// CANCEL BOOKING - UPDATED WITH REFUND
// ============================================
router.put("/cancel-booking/:id", auth, checkBookingPermission, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, refundAmount } = req.body;

        const booking = await Booking.findOne({ bookingId: id });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: "Booking is already cancelled"
            });
        }

        if (booking.status === 'Checked-in') {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel a checked-in booking"
            });
        }

        booking.status = 'Cancelled';
        booking.cancelledAt = new Date();
        booking.cancelledBy = {
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email
        };
        booking.cancellationReason = reason || '';
        booking.refundAmount = parseFloat(refundAmount) || 0;

        await booking.save();

        for (const roomId of booking.roomIds) {
            await Room.findOneAndUpdate(
                { roomId },
                { status: 'Available' }
            );
        }

        await logSuccess({
            module: 'Booking',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Cancel',
            heading: 'Booking Cancelled Successfully',
            description: `Booking ${booking.bookingNumber} cancelled for ${booking.customerName}${booking.refundAmount > 0 ? ` with refund ₹${booking.refundAmount}` : ''}`
        });

        res.status(200).json({
            success: true,
            message: "Booking cancelled successfully",
            data: booking
        });

    } catch (error) {
        console.error("Error cancelling booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel booking",
            error: error.message
        });
    }
});

// ============================================
// DELETE BOOKING
// ============================================
router.delete("/delete-booking/:id", auth, checkBookingPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findOne({ bookingId: id });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.status === 'Checked-in') {
            return res.status(400).json({
                success: false,
                message: "Cannot delete a checked-in booking"
            });
        }

        if (booking.status === 'Confirmed') {
            for (const roomId of booking.roomIds) {
                await Room.findOneAndUpdate(
                    { roomId },
                    { status: 'Available' }
                );
            }
        }

        await Booking.findOneAndDelete({ bookingId: id });

        await logSuccess({
            module: 'Booking',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Delete',
            heading: 'Booking Deleted Successfully',
            description: `Booking ${booking.bookingNumber} deleted`
        });

        res.status(200).json({
            success: true,
            message: "Booking deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete booking",
            error: error.message
        });
    }
});

// ============================================
// CONVERT BOOKING TO CHECK-IN
// ============================================
router.post("/convert-to-checkin/:id", auth, checkBookingPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findOne({ bookingId: id });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: "Cannot convert a cancelled booking"
            });
        }

        if (booking.status === 'Checked-in') {
            return res.status(400).json({
                success: false,
                message: "Booking is already checked-in"
            });
        }

        const now = new Date();
        const checkInDate = new Date(booking.checkInDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDay = new Date(checkInDate);
        checkInDay.setHours(0, 0, 0, 0);

        if (checkInDay > today) {
            return res.status(400).json({
                success: false,
                message: "Cannot convert to check-in before the check-in date"
            });
        }

        res.status(200).json({
            success: true,
            message: "Booking ready for check-in",
            data: {
                bookingId: booking.bookingId,
                bookingNumber: booking.bookingNumber,
                customerId: booking.customerId,
                customerName: booking.customerName,
                customerPhone: booking.customerPhone,
                customerEmail: booking.customerEmail,
                roomIds: booking.roomIds,
                roomDetails: booking.roomDetails,
                checkInDate: booking.checkInDate,
                checkOutDate: booking.checkOutDate,
                userSelectedCheckOut: booking.userSelectedCheckOut,
                advancePaid: booking.amountPaid + booking.advancePaid,
                taxSlab: booking.taxSlab,
                notes: booking.notes,
                bookingData: booking,
                paymentDetails: booking.paymentDetails || [],
                paymentType: booking.paymentType || 'Cash',
                bookingType: booking.bookingType || 'simple'
            }
        });

    } catch (error) {
        console.error("Error converting booking to check-in:", error);
        res.status(500).json({
            success: false,
            message: "Failed to convert booking",
            error: error.message
        });
    }
});

// ============================================
// MARK BOOKING AS CHECKED-IN
// ============================================
router.put("/mark-checked-in/:id", auth, checkBookingPermission, async (req, res) => {
    try {
        const { id } = req.params;
        const { checkInId, checkInNumber } = req.body;

        const booking = await Booking.findOne({ bookingId: id });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        booking.status = 'Checked-in';
        booking.checkInId = checkInId;
        booking.checkInNumber = checkInNumber;

        await booking.save();

        res.status(200).json({
            success: true,
            message: "Booking marked as checked-in",
            data: booking
        });

    } catch (error) {
        console.error("Error marking booking as checked-in:", error);
        res.status(500).json({
            success: false,
            message: "Failed to mark booking",
            error: error.message
        });
    }
});

// ============================================
// UPCOMING BOOKINGS
// ============================================
router.get("/upcoming", auth, checkBookingPermission, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(days));

        const bookings = await Booking.find({
            status: 'Confirmed',
            checkInDate: { $gte: now, $lte: futureDate }
        })
            .sort({ checkInDate: 1 })
            .select('bookingNumber customerName customerPhone roomNumber checkInDate checkOutDate status bookingType')
            .lean();

        res.status(200).json({
            success: true,
            data: bookings,
            count: bookings.length
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
// ADD ROOM TO BOOKING
// ============================================
router.put("/add-room/:bookingId", auth, checkBookingPermission, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { newRoomId, roomPrice } = req.body;

        if (!newRoomId) {
            return res.status(400).json({
                success: false,
                message: "New room is required"
            });
        }

        const booking = await Booking.findOne({ bookingId });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.status !== 'Confirmed') {
            return res.status(400).json({
                success: false,
                message: "Only confirmed bookings can be modified"
            });
        }

        const newRoom = await Room.findOne({ roomId: newRoomId });
        if (!newRoom) {
            return res.status(404).json({
                success: false,
                message: "New room not found"
            });
        }

        if (booking.roomIds.includes(newRoomId)) {
            return res.status(400).json({
                success: false,
                message: `Room ${newRoom.roomNumber} is already in this booking`
            });
        }

        const isAvailable = await checkRoomAvailabilityForBooking(
            newRoomId,
            booking.checkInDate,
            booking.userSelectedCheckOut,
            booking._id
        );

        if (!isAvailable) {
            return res.status(400).json({
                success: false,
                message: `Room ${newRoom.roomNumber} is not available for the selected dates`
            });
        }

        const category = await Category.findOne({ categoryId: newRoom.categoryId });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category for new room not found"
            });
        }

        // ✅ Use price from frontend if provided, else calculate
        let newRoomPrice = roomPrice || 0;
        if (!roomPrice) {
            const totalDurationHours = Math.ceil(
                (booking.userSelectedCheckOut - booking.checkInDate) / (1000 * 60 * 60)
            );
            if (booking.bookingType === 'perNight') {
                newRoomPrice = category.pricing.perNight || 0;
            } else {
                // Simple mode
                if (totalDurationHours <= 6) {
                    newRoomPrice = category.pricing.per6Hours || 0;
                } else if (totalDurationHours <= 12) {
                    newRoomPrice = category.pricing.per12Hours || 0;
                } else if (totalDurationHours <= 24) {
                    newRoomPrice = category.pricing.perDay || 0;
                } else {
                    const days = Math.floor(totalDurationHours / 24);
                    const remainingHours = totalDurationHours % 24;
                    newRoomPrice = days * (category.pricing.perDay || 0);
                    if (remainingHours > 0) {
                        if (remainingHours <= 6) {
                            newRoomPrice += category.pricing.per6Hours || 0;
                        } else if (remainingHours <= 12) {
                            newRoomPrice += category.pricing.per12Hours || 0;
                        } else {
                            newRoomPrice += category.pricing.perDay || 0;
                        }
                    }
                }
            }
        }

        const totalDurationHours = Math.ceil(
            (booking.userSelectedCheckOut - booking.checkInDate) / (1000 * 60 * 60)
        );

        booking.roomIds.push(newRoomId);
        booking.roomDetails.push({
            roomId: newRoom.roomId,
            roomNumber: newRoom.roomNumber,
            categoryId: newRoom.categoryId,
            categoryName: category.categoryName,
            price: newRoomPrice,
            totalHours: totalDurationHours,
            totalDays: Math.floor(totalDurationHours / 24),
            remainingHours: totalDurationHours % 24,
            durationLabel: booking.bookingType === 'perNight' ? 'Night Stay' : getDurationLabel(totalDurationHours)
        });

        await Room.findOneAndUpdate(
            { roomId: newRoomId },
            { status: 'Booked' }
        );

        // ✅ Recalculate base price (sum of all room prices - NO RECALCULATION)
        booking.basePrice = booking.roomDetails.reduce((sum, r) => sum + r.price, 0);
        booking.subtotal = booking.basePrice + booking.extraRequirementsTotal;
        booking.taxAmount = (booking.subtotal * booking.taxSlab) / 100;
        booking.grandTotal = booking.subtotal + booking.taxAmount;

        const totalPaid = (booking.amountPaid || 0) + (booking.advancePaid || 0);
        booking.balanceAmount = Math.max(0, booking.grandTotal - totalPaid);

        if (booking.balanceAmount === 0 && booking.grandTotal > 0) {
            booking.paymentStatus = 'Paid';
        } else if (booking.balanceAmount < booking.grandTotal && booking.balanceAmount > 0) {
            booking.paymentStatus = 'Partial Paid';
        } else {
            booking.paymentStatus = 'Not Paid';
        }

        if (booking.roomDetails.length > 0) {
            const firstRoom = booking.roomDetails[0];
            booking.roomNumber = firstRoom.roomNumber;
            booking.categoryId = firstRoom.categoryId;
            booking.categoryName = firstRoom.categoryName;
            booking.roomId = firstRoom.roomId;
        }

        await booking.save();

        await logSuccess({
            module: 'Booking',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'AddRoom',
            heading: 'Room Added to Booking Successfully',
            description: `Room ${newRoom.roomNumber} added to booking ${booking.bookingNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Room added successfully",
            data: booking
        });

    } catch (error) {
        console.error("Error adding room to booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add room",
            error: error.message
        });
    }
});

// ============================================
// REMOVE ROOM FROM BOOKING
// ============================================
router.put("/remove-room/:bookingId", auth, checkBookingPermission, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { roomId, reason } = req.body;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: "Room ID is required"
            });
        }

        const booking = await Booking.findOne({ bookingId });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.status !== 'Confirmed') {
            return res.status(400).json({
                success: false,
                message: "Only confirmed bookings can be modified"
            });
        }

        if (booking.roomDetails.length <= 1) {
            return res.status(400).json({
                success: false,
                message: "Cannot remove the last room. At least one room must remain in the booking."
            });
        }

        const roomIndex = booking.roomDetails.findIndex(r => r.roomId === roomId);
        if (roomIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Room not found in this booking"
            });
        }

        const removedRoom = booking.roomDetails[roomIndex];

        booking.removedRooms = booking.removedRooms || [];
        booking.removedRooms.push({
            roomId: removedRoom.roomId,
            roomNumber: removedRoom.roomNumber,
            categoryName: removedRoom.categoryName,
            price: removedRoom.price,
            reason: reason || 'Room removed from booking',
            removedAt: new Date()
        });

        booking.roomDetails.splice(roomIndex, 1);
        booking.roomIds = booking.roomIds.filter(id => id !== roomId);

        await Room.findOneAndUpdate(
            { roomId: roomId },
            { status: 'Available' }
        );

        booking.basePrice = booking.roomDetails.reduce((sum, r) => sum + r.price, 0);
        booking.subtotal = booking.basePrice + booking.extraRequirementsTotal;
        booking.taxAmount = (booking.subtotal * booking.taxSlab) / 100;
        booking.grandTotal = booking.subtotal + booking.taxAmount;

        const totalPaid = (booking.amountPaid || 0) + (booking.advancePaid || 0);
        booking.balanceAmount = Math.max(0, booking.grandTotal - totalPaid);

        if (booking.balanceAmount === 0 && booking.grandTotal > 0) {
            booking.paymentStatus = 'Paid';
        } else if (booking.balanceAmount < booking.grandTotal && booking.balanceAmount > 0) {
            booking.paymentStatus = 'Partial Paid';
        } else {
            booking.paymentStatus = 'Not Paid';
        }

        if (booking.roomDetails.length > 0) {
            const firstRoom = booking.roomDetails[0];
            booking.roomNumber = firstRoom.roomNumber;
            booking.categoryId = firstRoom.categoryId;
            booking.categoryName = firstRoom.categoryName;
            booking.roomId = firstRoom.roomId;
        }

        await booking.save();

        await logSuccess({
            module: 'Booking',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'RemoveRoom',
            heading: 'Room Removed from Booking Successfully',
            description: `Room ${removedRoom.roomNumber} removed from booking ${booking.bookingNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Room removed successfully",
            data: booking
        });

    } catch (error) {
        console.error("Error removing room from booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove room",
            error: error.message
        });
    }
});

// ============================================
// CHANGE ROOM IN BOOKING
// ============================================
router.put("/change-room/:bookingId", auth, checkBookingPermission, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { oldRoomId, newRoomId, newRoomPrice } = req.body;

        if (!oldRoomId || !newRoomId) {
            return res.status(400).json({
                success: false,
                message: "Old room and new room are required"
            });
        }

        const booking = await Booking.findOne({ bookingId });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.status !== 'Confirmed') {
            return res.status(400).json({
                success: false,
                message: "Only confirmed bookings can be modified"
            });
        }

        const oldRoomIndex = booking.roomDetails.findIndex(r => r.roomId === oldRoomId);
        if (oldRoomIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Old room not found in this booking"
            });
        }

        const oldRoomDetail = booking.roomDetails[oldRoomIndex];

        const newRoom = await Room.findOne({ roomId: newRoomId });
        if (!newRoom) {
            return res.status(404).json({
                success: false,
                message: "New room not found"
            });
        }

        if (booking.roomIds.includes(newRoomId)) {
            return res.status(400).json({
                success: false,
                message: `Room ${newRoom.roomNumber} is already in this booking`
            });
        }

        const isAvailable = await checkRoomAvailabilityForBooking(
            newRoomId,
            booking.checkInDate,
            booking.userSelectedCheckOut,
            booking._id
        );

        if (!isAvailable) {
            return res.status(400).json({
                success: false,
                message: `Room ${newRoom.roomNumber} is not available for the selected dates`
            });
        }

        const newCategory = await Category.findOne({ categoryId: newRoom.categoryId });
        if (!newCategory) {
            return res.status(404).json({
                success: false,
                message: "Category for new room not found"
            });
        }

        // ✅ Use price from frontend if provided, else calculate
        let newRoomPriceVal = newRoomPrice || 0;
        if (!newRoomPrice) {
            const totalDurationHours = Math.ceil(
                (booking.userSelectedCheckOut - booking.checkInDate) / (1000 * 60 * 60)
            );
            if (booking.bookingType === 'perNight') {
                newRoomPriceVal = newCategory.pricing.perNight || 0;
            } else {
                if (totalDurationHours <= 6) {
                    newRoomPriceVal = newCategory.pricing.per6Hours || 0;
                } else if (totalDurationHours <= 12) {
                    newRoomPriceVal = newCategory.pricing.per12Hours || 0;
                } else if (totalDurationHours <= 24) {
                    newRoomPriceVal = newCategory.pricing.perDay || 0;
                } else {
                    const days = Math.floor(totalDurationHours / 24);
                    const remainingHours = totalDurationHours % 24;
                    newRoomPriceVal = days * (newCategory.pricing.perDay || 0);
                    if (remainingHours > 0) {
                        if (remainingHours <= 6) {
                            newRoomPriceVal += newCategory.pricing.per6Hours || 0;
                        } else if (remainingHours <= 12) {
                            newRoomPriceVal += newCategory.pricing.per12Hours || 0;
                        } else {
                            newRoomPriceVal += newCategory.pricing.perDay || 0;
                        }
                    }
                }
            }
        }

        const totalDurationHours = Math.ceil(
            (booking.userSelectedCheckOut - booking.checkInDate) / (1000 * 60 * 60)
        );

        booking.removedRooms = booking.removedRooms || [];
        booking.removedRooms.push({
            roomId: oldRoomDetail.roomId,
            roomNumber: oldRoomDetail.roomNumber,
            categoryName: oldRoomDetail.categoryName,
            price: oldRoomDetail.price,
            reason: `Room changed to ${newRoom.roomNumber}`,
            removedAt: new Date()
        });

        booking.roomDetails[oldRoomIndex] = {
            roomId: newRoom.roomId,
            roomNumber: newRoom.roomNumber,
            categoryId: newRoom.categoryId,
            categoryName: newCategory.categoryName,
            price: newRoomPriceVal,
            totalHours: totalDurationHours,
            totalDays: Math.floor(totalDurationHours / 24),
            remainingHours: totalDurationHours % 24,
            durationLabel: booking.bookingType === 'perNight' ? 'Night Stay' : getDurationLabel(totalDurationHours)
        };

        const roomIdIndex = booking.roomIds.indexOf(oldRoomId);
        if (roomIdIndex !== -1) {
            booking.roomIds[roomIdIndex] = newRoomId;
        }

        await Room.findOneAndUpdate(
            { roomId: oldRoomId },
            { status: 'Available' }
        );
        await Room.findOneAndUpdate(
            { roomId: newRoomId },
            { status: 'Booked' }
        );

        booking.basePrice = booking.roomDetails.reduce((sum, r) => sum + r.price, 0);
        booking.subtotal = booking.basePrice + booking.extraRequirementsTotal;
        booking.taxAmount = (booking.subtotal * booking.taxSlab) / 100;
        booking.grandTotal = booking.subtotal + booking.taxAmount;

        const totalPaid = (booking.amountPaid || 0) + (booking.advancePaid || 0);
        booking.balanceAmount = Math.max(0, booking.grandTotal - totalPaid);

        if (booking.balanceAmount === 0 && booking.grandTotal > 0) {
            booking.paymentStatus = 'Paid';
        } else if (booking.balanceAmount < booking.grandTotal && booking.balanceAmount > 0) {
            booking.paymentStatus = 'Partial Paid';
        } else {
            booking.paymentStatus = 'Not Paid';
        }

        if (booking.roomDetails.length > 0) {
            const firstRoom = booking.roomDetails[0];
            booking.roomNumber = firstRoom.roomNumber;
            booking.categoryId = firstRoom.categoryId;
            booking.categoryName = firstRoom.categoryName;
            booking.roomId = firstRoom.roomId;
        }

        await booking.save();

        await logSuccess({
            module: 'Booking',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'ChangeRoom',
            heading: 'Room Changed in Booking Successfully',
            description: `Room ${oldRoomDetail.roomNumber} changed to ${newRoom.roomNumber} in booking ${booking.bookingNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Room changed successfully",
            data: booking
        });

    } catch (error) {
        console.error("Error changing room in booking:", error);
        res.status(500).json({
            success: false,
            message: "Failed to change room",
            error: error.message
        });
    }
});

module.exports = router;