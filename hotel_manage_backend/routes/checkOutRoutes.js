const express = require("express");
const router = express.Router();
const CheckOut = require("../models/checkOut");
const CheckIn = require("../models/checkIn");
const Customer = require("../models/customer");
const Room = require("../models/room");
const Category = require("../models/category");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { logSuccess, logFailed } = require("../utils/logHelper");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const generateNumber = require("../utils/generateNumber");


// ============================================
// MULTER CONFIGURATION
// ============================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "../uploads/checkout-id-proofs");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `checkout-idproof-${uniqueSuffix}${ext}`);
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
const checkCheckOutPermission = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes('admin') || permissions.includes('reception') || permissions.includes('checkout')) {
        next();
    } else {
        return res.status(403).json({
            message: 'Access denied. Check-out permission required.'
        });
    }
};

// ============================================
// GENERATE CHECK-OUT NUMBER
// ============================================
const generateCheckOutNumber = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `CO-${year}${month}${day}`;

    const lastCheckOut = await CheckOut.findOne({
        checkOutNumber: { $regex: `^${prefix}` }
    }).sort({ checkOutNumber: -1 });

    let sequence = 1;
    if (lastCheckOut) {
        const lastSeq = parseInt(lastCheckOut.checkOutNumber.split('-')[2]);
        sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
};

// ============================================
// HELPER: Get Duration Label
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
// GET ACTIVE CHECK-INS
// ============================================
router.get("/active-checkins", auth, checkCheckOutPermission, async (req, res) => {
    try {
        const { search, roomId } = req.query;

        let query = { status: 'Active' };

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query.$or = [
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { customerPhone: { $regex: searchTerm, $options: 'i' } },
                { checkInNumber: { $regex: searchTerm, $options: 'i' } },
                { roomNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        if (roomId) {
            query.roomIds = { $in: [roomId] };
        }

        const checkIns = await CheckIn.find(query)
            .sort({ checkOutDate: 1 })
            .limit(50)
            .lean();

        // Add categoryDetails to each room
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

        res.status(200).json({
            success: true,
            data: checkIns,
            count: checkIns.length
        });

    } catch (error) {
        console.error("Error fetching active check-ins:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch active check-ins",
            error: error.message
        });
    }
});

// ============================================
// GET CHECK-IN DETAILS FOR CHECK-OUT - UPDATED WITH BOOKING TYPE
// ============================================
router.get("/checkin-details/:checkInId", auth, checkCheckOutPermission, async (req, res) => {
    try {
        const { checkInId } = req.params;

        const checkIn = await CheckIn.findOne({
            checkInId: checkInId,
            status: 'Active'
        }).lean();

        if (!checkIn) {
            return res.status(404).json({
                success: false,
                message: "Active check-in not found"
            });
        }

        const existingCheckOut = await CheckOut.findOne({ checkInId: checkInId });
        if (existingCheckOut) {
            return res.status(400).json({
                success: false,
                message: "This check-in is already checked out",
                data: existingCheckOut
            });
        }

        // Add categoryDetails to each room
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

        // Include removedRooms with full details
        const responseData = {
            ...checkIn,
            removedRooms: checkIn.removedRooms || [],
            // ✅ Include payment details from check-in
            paymentDetails: checkIn.paymentDetails || [],
            paymentType: checkIn.paymentType || 'Cash',
            // ✅ Include booking type from check-in
            bookingType: checkIn.bookingType || 'simple'
        };

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error("Error fetching check-in details:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch check-in details",
            error: error.message
        });
    }
});

// ============================================
// COMPLETE CREATE CHECK-OUT - UPDATED WITH BOOKING TYPE
// ============================================
router.post("/create-checkout", auth, checkCheckOutPermission, upload.array('idProofs', 10), async (req, res) => {
    try {
        const {
            checkInId,
            checkInNumber,
            customerId,
            customerName,
            customerPhone,
            customerEmail,
            roomDetails,
            removedRooms,
            roomNumber,
            categoryId,
            categoryName,
            checkInDate,
            checkOutDate,
            durationLabel,
            totalHours,
            basePrice,
            extraHoursPrice,
            extraRequirements,
            extraRequirementsTotal,
            extraCharges,
            discount,
            taxSlab,
            amountPaid,
            advancePaid,
            paymentStatus,
            notes,
            idProofLabels,
            paymentDetails,
            bookingType // ✅ NEW: Accept bookingType from frontend
        } = req.body;

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
                message: "Check-in is not active"
            });
        }

        const existingCheckOut = await CheckOut.findOne({ checkInId });
        if (existingCheckOut) {
            return res.status(400).json({
                success: false,
                message: "This check-in is already checked out"
            });
        }

        // PARSE roomDetails
        let parsedRoomDetails = roomDetails;
        if (typeof roomDetails === 'string') {
            try {
                parsedRoomDetails = JSON.parse(roomDetails);
            } catch {
                parsedRoomDetails = [];
            }
        }
        if (!Array.isArray(parsedRoomDetails)) {
            parsedRoomDetails = [];
        }

        // PARSE removedRooms
        let parsedRemovedRooms = removedRooms;
        if (typeof removedRooms === 'string') {
            try {
                parsedRemovedRooms = JSON.parse(removedRooms);
            } catch {
                parsedRemovedRooms = [];
            }
        }
        if (!Array.isArray(parsedRemovedRooms)) {
            parsedRemovedRooms = [];
        }

        // COMBINE all rooms (active + removed) for roomDetails array
        const allRoomDetails = [];

        // Add active rooms
        for (const room of parsedRoomDetails) {
            allRoomDetails.push({
                roomId: room.roomId,
                roomNumber: room.roomNumber,
                categoryId: room.categoryId,
                categoryName: room.categoryName,
                checkInDate: new Date(room.checkInDate),
                checkOutDate: new Date(room.checkOutDate),
                price: parseFloat(room.price) || 0,
                totalHours: room.totalHours || 0,
                totalDays: room.totalDays || 0,
                remainingHours: room.remainingHours || 0,
                durationLabel: room.durationLabel || '',
                isRemoved: false,
                removedAt: null,
                hoursUsed: 0,
                reason: ''
            });
        }

        // Add removed rooms
        for (const room of parsedRemovedRooms) {
            allRoomDetails.push({
                roomId: room.roomId,
                roomNumber: room.roomNumber,
                categoryId: room.categoryId,
                categoryName: room.categoryName,
                checkInDate: new Date(room.checkInDate),
                checkOutDate: new Date(room.checkOutDate),
                price: parseFloat(room.price) || 0,
                totalHours: room.totalHours || 0,
                totalDays: room.totalDays || 0,
                remainingHours: room.remainingHours || 0,
                durationLabel: room.durationLabel || '',
                isRemoved: true,
                removedAt: room.removedAt ? new Date(room.removedAt) : new Date(),
                hoursUsed: room.hoursUsed || 0,
                reason: room.reason || ''
            });
        }

        // Calculate totals
        const activeRooms = allRoomDetails.filter(r => !r.isRemoved);
        const removedRoomItems = allRoomDetails.filter(r => r.isRemoved);

        const activeRoomsTotal = activeRooms.reduce((sum, r) => sum + r.price, 0);
        const removedRoomsTotal = removedRoomItems.reduce((sum, r) => sum + r.price, 0);

        // PARSE extraRequirements
        let parsedExtraRequirements = extraRequirements;
        if (typeof extraRequirements === 'string') {
            try {
                parsedExtraRequirements = JSON.parse(extraRequirements);
            } catch {
                parsedExtraRequirements = [];
            }
        }
        if (!Array.isArray(parsedExtraRequirements)) {
            parsedExtraRequirements = [];
        }

        let finalExtraRequirements = [];
        let finalExtraRequirementsTotal = 0;

        if (parsedExtraRequirements.length > 0) {
            finalExtraRequirements = parsedExtraRequirements;
            finalExtraRequirementsTotal = finalExtraRequirements.reduce((sum, req) => sum + (req.price || 0), 0);
        } else if (checkIn.extraRequirements && checkIn.extraRequirements.length > 0) {
            finalExtraRequirements = checkIn.extraRequirements;
            finalExtraRequirementsTotal = checkIn.extraRequirementsTotal || 0;
        }

        // PARSE extraCharges
        let parsedExtraCharges = extraCharges;
        if (typeof extraCharges === 'string') {
            try {
                parsedExtraCharges = JSON.parse(extraCharges);
            } catch {
                parsedExtraCharges = [];
            }
        }
        if (!Array.isArray(parsedExtraCharges)) {
            parsedExtraCharges = [];
        }

        // PARSE discount
        let parsedDiscount = {};
        if (discount) {
            if (typeof discount === 'string') {
                try {
                    parsedDiscount = JSON.parse(discount);
                } catch {
                    parsedDiscount = discount;
                }
            } else {
                parsedDiscount = discount;
            }
        }

        // PARSE PAYMENT DETAILS
        let parsedPaymentDetails = [];
        if (paymentDetails) {
            parsedPaymentDetails = typeof paymentDetails === 'string'
                ? JSON.parse(paymentDetails)
                : paymentDetails;
        }

        // Calculate total from payment details
        const totalFromPaymentDetails = parsedPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Determine payment type
        let paymentType = 'Cash';
        if (parsedPaymentDetails && parsedPaymentDetails.length > 0) {
            const uniqueMethods = [...new Set(parsedPaymentDetails.map(p => p.method))];
            paymentType = uniqueMethods.length > 1 ? 'Multiple' : uniqueMethods[0] || 'Cash';
        }

        // Process ID Proofs
        let uploadedIdProofs = [];
        const proofLabels = idProofLabels ? JSON.parse(idProofLabels) : [];

        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                uploadedIdProofs.push({
                    label: proofLabels[index] || 'Other',
                    fileName: file.originalname,
                    fileUrl: `/uploads/checkout-id-proofs/${file.filename}`,
                    fileSize: file.size
                });
            });
        }

        // FINAL ID PROOFS
        let finalIdProofs = [];

        if (checkIn.idProofs && checkIn.idProofs.length > 0) {
            finalIdProofs = checkIn.idProofs.map(proof => ({
                proofId: proof.proofId,
                label: proof.label || 'Other',
                fileName: proof.fileName,
                fileUrl: proof.fileUrl,
                fileSize: proof.fileSize,
                uploadedAt: proof.uploadedAt || new Date()
            }));
        }

        if (uploadedIdProofs.length > 0) {
            finalIdProofs = [...finalIdProofs, ...uploadedIdProofs];
        }

        // Calculate all totals - DISCOUNT BEFORE TAX
        const extraChargesTotal = parsedExtraCharges.reduce((sum, charge) => sum + (charge.price || 0), 0);
        const subtotal = parseFloat(activeRoomsTotal) + parseFloat(removedRoomsTotal) +
            finalExtraRequirementsTotal + extraChargesTotal;

        // Apply discount on subtotal (BEFORE tax)
        let discountAmount = 0;
        if (parsedDiscount && parsedDiscount.value > 0) {
            if (parsedDiscount.type === 'percentage') {
                discountAmount = (subtotal * parsedDiscount.value) / 100;
            } else {
                discountAmount = parsedDiscount.value;
            }
            discountAmount = Math.min(discountAmount, subtotal);
            parsedDiscount.amount = discountAmount;
            parsedDiscount.appliedBy = {
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email
            };
        }

        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const taxSlabValue = parseInt(taxSlab) || 18;
        const taxAmount = (afterDiscount * taxSlabValue) / 100;
        const finalTotal = afterDiscount + taxAmount;

        let finalAmountPaid = parseFloat(amountPaid) || 0;
        let finalAdvancePaid = parseFloat(advancePaid) || 0;

        // If payment details exist, use that total
        if (parsedPaymentDetails.length > 0) {
            finalAmountPaid = totalFromPaymentDetails;
        }

        // If paymentStatus is Paid, set amountPaid = finalTotal
        if (paymentStatus === 'Paid') {
            finalAmountPaid = finalTotal;
        }

        if (paymentStatus === 'Not Paid') {
            finalAmountPaid = 0;
        }

        const totalPaid = finalAmountPaid + finalAdvancePaid;
        const balanceAmount = Math.max(0, finalTotal - totalPaid);

        const finalPaymentStatus = paymentStatus || 'Not Paid';

        // ✅ Determine final duration label
        let finalDurationLabel = durationLabel || '';
        if (bookingType === 'perNight') {
            finalDurationLabel = 'Night Stay';
        } else if (!finalDurationLabel) {
            finalDurationLabel = checkIn.durationLabel || getDurationLabel(totalHours || 0);
        }

        const checkOutNumber = await generateNumber('INV', 'checkout');

        const checkOutData = {
            checkOutNumber,
            // ✅ NEW: Store booking type
            bookingType: bookingType || 'simple',
            checkInId,
            checkInNumber,
            customerId,
            customerName,
            customerPhone,
            customerEmail: customerEmail || '',
            roomDetails: allRoomDetails,
            activeRooms: activeRooms.map(r => r.roomId),
            removedRooms: removedRoomItems.map(r => r.roomId),
            roomIds: allRoomDetails.map(r => r.roomId),
            roomNumber: activeRooms[0]?.roomNumber || roomNumber || '',
            categoryId: activeRooms[0]?.categoryId || categoryId || '',
            categoryName: activeRooms[0]?.categoryName || categoryName || '',
            checkInDate: new Date(checkInDate),
            checkOutDate: new Date(checkOutDate),
            durationLabel: finalDurationLabel,
            totalHours: parseInt(totalHours) || 0,
            activeRoomsTotal: activeRoomsTotal,
            removedRoomsTotal: removedRoomsTotal,
            basePrice: activeRoomsTotal + removedRoomsTotal,
            extraHoursPrice: parseFloat(extraHoursPrice) || 0,
            extraRequirements: finalExtraRequirements,
            extraRequirementsTotal: finalExtraRequirementsTotal,
            extraCharges: parsedExtraCharges,
            extraChargesTotal: extraChargesTotal,
            discount: parsedDiscount,
            taxSlab: taxSlabValue,
            taxAmount: taxAmount,
            subtotal: subtotal,
            grandTotal: subtotal,
            discountAmount: discountAmount,
            finalTotal: finalTotal,
            paymentStatus: finalPaymentStatus,
            amountPaid: finalAmountPaid,
            advancePaid: finalAdvancePaid,
            balanceAmount: balanceAmount,
            paymentDetails: parsedPaymentDetails,
            paymentType: paymentType,
            idProofs: finalIdProofs,
            notes: notes || '',
            status: 'Completed',
            guestCheckOutAt: new Date(),
            createdBy: {
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email
            },
            completedAt: new Date()
        };

        const checkOut = new CheckOut(checkOutData);
        const savedCheckOut = await checkOut.save();

        // Update check-in status
        await CheckIn.findOneAndUpdate(
            { checkInId },
            {
                status: 'Checked-out',
                checkedOutBy: {
                    userId: req.user.userId,
                    userName: req.user.name,
                    userEmail: req.user.email
                },
                checkedOutAt: new Date()
            }
        );

        // UPDATE ROOM STATUS TO CLEANING (ONLY active rooms)
        for (const room of activeRooms) {
            await Room.findOneAndUpdate(
                { roomId: room.roomId },
                { status: 'Cleaning' }
            );
            console.log(`✅ Room ${room.roomNumber} updated to Cleaning`);
        }

        // CREATE HOUSEKEEPING TASK FOR ACTIVE ROOMS ONLY
        try {
            const Housekeeping = require("../models/housekeeping");

            for (const room of activeRooms) {
                const roomData = await Room.findOne({ roomId: room.roomId });
                if (!roomData) continue;

                const existingTask = await Housekeeping.findOne({
                    checkOutId: savedCheckOut.checkOutId,
                    roomId: roomData.roomId
                });
                if (existingTask) continue;

                const housekeepingData = {
                    roomId: roomData.roomId,
                    roomNumber: roomData.roomNumber,
                    categoryId: roomData.categoryId || '',
                    categoryName: roomData.categoryName || '',
                    checkOutId: savedCheckOut.checkOutId,
                    checkOutNumber: savedCheckOut.checkOutNumber,
                    customerId: customerId || '',
                    customerName: customerName || '',
                    customerPhone: customerPhone || '',
                    status: 'Pending',
                    createdBy: {
                        userId: req.user.userId,
                        userName: req.user.name,
                        userEmail: req.user.email
                    }
                };

                const task = new Housekeeping(housekeepingData);
                await task.save();
                console.log(`✅ Housekeeping task created for Room ${roomData.roomNumber}`);
            }

        } catch (hkError) {
            console.error("❌ Failed to create housekeeping tasks:", hkError.message);
        }

        await logSuccess({
            module: 'CheckOut',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Create',
            heading: 'Check-out Completed Successfully',
            description: `Check-out ${checkOutNumber} completed for ${customerName} (${bookingType || 'simple'})`
        });

        res.status(201).json({
            success: true,
            message: "Check-out completed successfully",
            data: savedCheckOut
        });

    } catch (error) {
        console.error("Error creating check-out:", error);

        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error("Error deleting file:", err);
                });
            });
        }

        await logFailed({
            module: 'CheckOut',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Create',
            heading: 'Check-out Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to complete check-out",
            error: error.message
        });
    }
});

// ============================================
// GET ALL CHECK-OUTS - UPDATED WITH IST DATE FILTER
// ============================================
router.get("/get-checkouts", auth, checkCheckOutPermission, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            customerId = '',
            startDate = '',
            endDate = '',
            sortBy = 'completedAt',
            sortOrder = 'desc'
        } = req.query;

        let query = {};

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query.$or = [
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { customerPhone: { $regex: searchTerm, $options: 'i' } },
                { checkOutNumber: { $regex: searchTerm, $options: 'i' } },
                { checkInNumber: { $regex: searchTerm, $options: 'i' } },
                { roomNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        if (status) query.status = status;
        if (customerId) query.customerId = customerId;

        // UPDATED: Date filter with IST timezone - EXACT DATE MATCH
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

            query.completedAt = { $gte: start, $lte: end };

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

            query.completedAt = { $gte: start, $lte: end };
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [checkOuts, total] = await Promise.all([
            CheckOut.find(query)
                .select('-__v')
                .sort(sortObj)
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .lean(),
            CheckOut.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: checkOuts,
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
        console.error("Error fetching check-outs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch check-outs",
            error: error.message
        });
    }
});

// ============================================
// GET CHECK-OUT BY ID
// ============================================
router.get("/get-checkout/:id", auth, checkCheckOutPermission, async (req, res) => {
    try {
        const checkOut = await CheckOut.findOne({ checkOutId: req.params.id }).lean();

        if (!checkOut) {
            return res.status(404).json({
                success: false,
                message: "Check-out not found"
            });
        }

        res.status(200).json({
            success: true,
            data: checkOut
        });

    } catch (error) {
        console.error("Error fetching check-out:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch check-out",
            error: error.message
        });
    }
});

// ============================================
// UPDATE CHECK-OUT - UPDATED WITH BOOKING TYPE VALIDATION
// ============================================
router.put("/update-checkout/:id", auth, checkCheckOutPermission, upload.array('idProofs', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const existingCheckOut = await CheckOut.findOne({ checkOutId: id });
        if (!existingCheckOut) {
            return res.status(404).json({
                success: false,
                message: "Check-out not found"
            });
        }

        // ✅ VALIDATE: Cannot change booking type
        if (updateData.bookingType && updateData.bookingType !== existingCheckOut.bookingType) {
            return res.status(400).json({
                success: false,
                message: `Cannot change booking type from ${existingCheckOut.bookingType} to ${updateData.bookingType}. Booking type is fixed.`
            });
        }

        // Parse roomDetails if provided
        if (updateData.roomDetails) {
            updateData.roomDetails = typeof updateData.roomDetails === 'string'
                ? JSON.parse(updateData.roomDetails)
                : updateData.roomDetails;

            const activeRooms = updateData.roomDetails.filter(r => !r.isRemoved);
            const removedRooms = updateData.roomDetails.filter(r => r.isRemoved);

            updateData.activeRoomsTotal = activeRooms.reduce((sum, r) => sum + r.price, 0);
            updateData.removedRoomsTotal = removedRooms.reduce((sum, r) => sum + r.price, 0);
            updateData.basePrice = updateData.activeRoomsTotal + updateData.removedRoomsTotal;
        }

        // Parse extra charges if provided
        if (updateData.extraCharges) {
            updateData.extraCharges = typeof updateData.extraCharges === 'string'
                ? JSON.parse(updateData.extraCharges)
                : updateData.extraCharges;
        }

        // Parse discount if provided
        let parsedDiscount = existingCheckOut.discount || {};
        if (updateData.discount) {
            updateData.discount = typeof updateData.discount === 'string'
                ? JSON.parse(updateData.discount)
                : updateData.discount;
            parsedDiscount = updateData.discount;
        }

        // Handle payment details update
        if (updateData.paymentDetails) {
            updateData.paymentDetails = typeof updateData.paymentDetails === 'string'
                ? JSON.parse(updateData.paymentDetails)
                : updateData.paymentDetails;

            // Calculate payment type
            if (updateData.paymentDetails.length > 0) {
                const uniqueMethods = [...new Set(updateData.paymentDetails.map(p => p.method))];
                updateData.paymentType = uniqueMethods.length > 1 ? 'Multiple' : uniqueMethods[0] || 'Cash';

                // Calculate total from payment details
                const totalFromDetails = updateData.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
                if (!updateData.amountPaid || updateData.amountPaid === 0) {
                    updateData.amountPaid = totalFromDetails;
                }
            } else {
                updateData.paymentType = 'Cash';
            }
        }

        // Process ID Proofs
        if (req.files && req.files.length > 0) {
            const proofLabels = updateData.idProofLabels ? JSON.parse(updateData.idProofLabels) : [];
            const newIdProofs = [];
            req.files.forEach((file, index) => {
                newIdProofs.push({
                    label: proofLabels[index] || 'Other',
                    fileName: file.originalname,
                    fileUrl: `/uploads/checkout-id-proofs/${file.filename}`,
                    fileSize: file.size
                });
            });
            updateData.idProofs = [...(existingCheckOut.idProofs || []), ...newIdProofs];
        }

        updateData.updatedBy = {
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email
        };

        // Recalculate totals - DISCOUNT BEFORE TAX
        const extraChargesTotal = (updateData.extraCharges || existingCheckOut.extraCharges || []).reduce(
            (sum, charge) => sum + (charge.price || 0), 0
        );

        const basePrice = updateData.basePrice || existingCheckOut.basePrice;
        const extraHoursPrice = updateData.extraHoursPrice || existingCheckOut.extraHoursPrice;
        const extraRequirementsTotal = updateData.extraRequirementsTotal || existingCheckOut.extraRequirementsTotal;

        const subtotal = basePrice + extraRequirementsTotal + extraChargesTotal;

        let discountAmount = 0;
        if (parsedDiscount && parsedDiscount.value > 0) {
            if (parsedDiscount.type === 'percentage') {
                discountAmount = (subtotal * parsedDiscount.value) / 100;
            } else {
                discountAmount = parsedDiscount.value;
            }
            discountAmount = Math.min(discountAmount, subtotal);
            parsedDiscount.amount = discountAmount;
            if (updateData.discount) {
                updateData.discount.amount = discountAmount;
            }
        }

        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const taxSlab = updateData.taxSlab || existingCheckOut.taxSlab;
        const taxAmount = (afterDiscount * taxSlab) / 100;
        const finalTotal = afterDiscount + taxAmount;

        let amountPaidValue = updateData.amountPaid !== undefined ? updateData.amountPaid : existingCheckOut.amountPaid;
        let advancePaidValue = updateData.advancePaid !== undefined ? updateData.advancePaid : existingCheckOut.advancePaid;
        const balanceAmount = Math.max(0, finalTotal - (parseFloat(amountPaidValue) + parseFloat(advancePaidValue)));

        const paymentStatus = updateData.paymentStatus || existingCheckOut.paymentStatus;

        updateData.subtotal = subtotal;
        updateData.discount = parsedDiscount;
        updateData.discountAmount = discountAmount;
        updateData.taxSlab = taxSlab;
        updateData.taxAmount = taxAmount;
        updateData.finalTotal = finalTotal;
        updateData.balanceAmount = balanceAmount;
        updateData.paymentStatus = paymentStatus;
        updateData.amountPaid = parseFloat(amountPaidValue);
        updateData.advancePaid = parseFloat(advancePaidValue);
        updateData.extraChargesTotal = extraChargesTotal;

        // ✅ For perNight, ensure durationLabel is 'Night Stay'
        if (existingCheckOut.bookingType === 'perNight') {
            updateData.durationLabel = 'Night Stay';
        }

        const updatedCheckOut = await CheckOut.findOneAndUpdate(
            { checkOutId: id },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        await logSuccess({
            module: 'CheckOut',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Check-out Updated Successfully',
            description: `Check-out ${updatedCheckOut.checkOutNumber} updated`
        });

        res.status(200).json({
            success: true,
            message: "Check-out updated successfully",
            data: updatedCheckOut
        });

    } catch (error) {
        console.error("Error updating check-out:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update check-out",
            error: error.message
        });
    }
});

// ============================================
// DELETE ID PROOF
// ============================================
router.delete("/delete-id-proof/:checkOutId/:proofId", auth, checkCheckOutPermission, async (req, res) => {
    try {
        const { checkOutId, proofId } = req.params;

        const checkOut = await CheckOut.findOne({ checkOutId });
        if (!checkOut) {
            return res.status(404).json({
                success: false,
                message: "Check-out not found"
            });
        }

        const proofIndex = checkOut.idProofs.findIndex(p => p.proofId === proofId);
        if (proofIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "ID Proof not found"
            });
        }

        const filePath = path.join(__dirname, `../${checkOut.idProofs[proofIndex].fileUrl}`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        checkOut.idProofs.splice(proofIndex, 1);
        await checkOut.save();

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
// DELETE CHECK-OUT
// ============================================
router.delete("/delete-checkout/:id", auth, checkCheckOutPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const checkOut = await CheckOut.findOne({ checkOutId: id });
        if (!checkOut) {
            return res.status(404).json({
                success: false,
                message: "Check-out not found"
            });
        }

        // Delete ID proof files
        if (checkOut.idProofs && checkOut.idProofs.length > 0) {
            checkOut.idProofs.forEach(proof => {
                const filePath = path.join(__dirname, `../${proof.fileUrl}`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        // DELETE HOUSEKEEPING TASK
        try {
            const Housekeeping = require("../models/housekeeping");
            const deletedTask = await Housekeeping.findOneAndDelete({
                checkOutId: checkOut.checkOutId
            });
            if (deletedTask) {
                console.log(`✅ Housekeeping task ${deletedTask.taskNumber} deleted`);
            }
        } catch (hkError) {
            console.error("❌ Failed to delete housekeeping task:", hkError.message);
        }

        // REVERT CHECK-IN: Make it Active again
        const checkIn = await CheckIn.findOne({ checkInId: checkOut.checkInId });
        if (checkIn) {
            checkIn.status = 'Active';
            checkIn.checkedOutBy = null;
            checkIn.checkedOutAt = null;
            await checkIn.save();
            console.log(`✅ Check-in ${checkIn.checkInNumber} reverted to Active`);
        }

        // REVERT ROOMS: Make them Occupied again
        const activeRooms = checkOut.roomDetails ? checkOut.roomDetails.filter(r => !r.isRemoved) : [];

        for (const room of activeRooms) {
            await Room.findOneAndUpdate(
                { roomId: room.roomId },
                { status: 'Occupied' }
            );
            console.log(`✅ Room ${room.roomNumber} reverted to Occupied`);
        }

        await CheckOut.findOneAndDelete({ checkOutId: id });

        await logSuccess({
            module: 'CheckOut',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Delete',
            heading: 'Check-out Deleted Successfully',
            description: `Check-out ${checkOut.checkOutNumber} deleted, check-in reverted to Active`
        });

        res.status(200).json({
            success: true,
            message: "Check-out deleted successfully, check-in reverted to Active",
            data: {
                checkInReverted: !!checkIn,
                roomsReverted: activeRooms.length || 0
            }
        });

    } catch (error) {
        console.error("Error deleting check-out:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete check-out",
            error: error.message
        });
    }
});

// ============================================
// EXPORT CHECK-OUTS
// ============================================
router.get("/export-checkouts", auth, checkCheckOutPermission, async (req, res) => {
    try {
        const {
            search = '',
            status = '',
            startDate = '',
            endDate = '',
            timeFilter = '',
            yearFilter = ''
        } = req.query;

        let query = {};

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query.$or = [
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { customerPhone: { $regex: searchTerm, $options: 'i' } },
                { checkOutNumber: { $regex: searchTerm, $options: 'i' } },
                { checkInNumber: { $regex: searchTerm, $options: 'i' } },
                { roomNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        if (status) query.status = status;

        if (startDate && endDate) {
            query.completedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else if (startDate) {
            query.completedAt = { $gte: new Date(startDate) };
        } else if (endDate) {
            query.completedAt = { $lte: new Date(endDate) };
        }

        if (timeFilter) {
            const now = new Date();
            let start = new Date();
            let end = new Date();

            switch (timeFilter) {
                case 'today':
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    break;
                case 'this-week':
                    start.setDate(now.getDate() - now.getDay());
                    start.setHours(0, 0, 0, 0);
                    end.setDate(start.getDate() + 6);
                    end.setHours(23, 59, 59, 999);
                    break;
                case 'this-month':
                    start.setDate(1);
                    start.setHours(0, 0, 0, 0);
                    end.setMonth(now.getMonth() + 1);
                    end.setDate(0);
                    end.setHours(23, 59, 59, 999);
                    break;
                case 'last-6-months':
                    start.setMonth(now.getMonth() - 6);
                    start.setHours(0, 0, 0, 0);
                    break;
                case 'this-year':
                    start.setMonth(0, 1);
                    start.setHours(0, 0, 0, 0);
                    break;
                default:
                    break;
            }

            query.completedAt = { $gte: start, $lte: end };
        }

        if (yearFilter) {
            const year = parseInt(yearFilter);
            const start = new Date(year, 0, 1);
            const end = new Date(year, 11, 31, 23, 59, 59, 999);
            query.completedAt = { $gte: start, $lte: end };
        }

        const checkOuts = await CheckOut.find(query)
            .sort({ completedAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: checkOuts,
            count: checkOuts.length
        });

    } catch (error) {
        console.error("Error exporting check-outs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to export check-outs",
            error: error.message
        });
    }
});

module.exports = router;