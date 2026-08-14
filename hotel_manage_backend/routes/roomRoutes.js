const express = require("express");
const router = express.Router();
const Room = require("../models/room");
const Category = require("../models/category");
const Booking = require("../models/booking");
const CheckIn = require("../models/checkIn");
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
// CHECK ADMIN PERMISSION
// ============================================
const checkAdminPermission = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes('admin')) {
        next();
    } else {
        return res.status(403).json({
            message: 'Access denied. Admin permission required.'
        });
    }
};

// ============================================
// HELPER: Get IST Current Time (NOT start of day)
// ============================================
const getISTCurrentTime = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + istOffset);
};

// ============================================
// HELPER: Get IST Start of Day (for date comparisons)
// ============================================
const getISTStartOfDay = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    istNow.setHours(0, 0, 0, 0);
    return istNow;
};

const calculateDynamicStatus = async (room) => {
    const currentIST = getISTCurrentTime();
    const roomId = room.roomId;

    // ✅ 1. CHECK ACTIVE CHECK-IN FIRST
    const activeCheckIn = await CheckIn.findOne({
        roomIds: { $in: [roomId] },
        status: 'Active',
        checkInDate: { $lte: currentIST },
        checkOutDate: { $gt: currentIST }
    });

    if (activeCheckIn) {
        return 'Occupied';
    }

    // ✅ 2. CHECK ROOM STATUS FROM DATABASE
    // If room is marked as 'Occupied' in database but no active check-in found
    // This can happen if check-in was deleted or data is inconsistent
    if (room.status === 'Occupied') {
        // Check if there's ANY active check-in (even if dates don't overlap perfectly)
        const anyCheckIn = await CheckIn.findOne({
            roomIds: { $in: [roomId] },
            status: 'Active'
        });

        if (!anyCheckIn) {
            // No active check-in found, so room should be Available
            // BUT we should update the room status in database to fix inconsistency
            await Room.findOneAndUpdate(
                { roomId: roomId },
                { status: 'Available' }
            );
            return 'Available';
        }

        // If there is an active check-in but dates don't match, still return Occupied
        return 'Occupied';
    }

    // ✅ 3. CHECK MAINTENANCE AND CLEANING
    if (room.status === 'Maintenance') {
        return 'Maintenance';
    }

    if (room.status === 'Cleaning') {
        return 'Cleaning';
    }

    // ✅ 4. CHECK BOOKINGS
    const bookingToday = await Booking.findOne({
        roomIds: { $in: [roomId] },
        status: { $in: ['Confirmed', 'Checked-in'] },
        checkInDate: { $lte: currentIST },
        checkOutDate: { $gt: currentIST }
    });

    if (bookingToday) {
        return 'Booked';
    }

    // ✅ 5. DEFAULT
    return 'Available';
};

// ============================================
// POST create-room - Create new room (with categoryName)
// ============================================
router.post("/create-room", auth, checkAdminPermission, async (req, res) => {
    try {
        const { roomNumber, categoryId, floorNumber, status, isActive, specialFeatures } = req.body;

        // Check if room number already exists
        const existingRoom = await Room.findOne({ roomNumber });
        if (existingRoom) {
            await logFailed({
                module: 'Rooms',
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email,
                action: 'Create',
                heading: 'Room Creation Failed',
                description: `Room number "${roomNumber}" already exists`
            });
            return res.status(400).json({
                success: false,
                message: "Room number already exists",
                field: "roomNumber"
            });
        }

        // Check if category exists
        const categoryExists = await Category.findOne({ categoryId });
        if (!categoryExists) {
            await logFailed({
                module: 'Rooms',
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email,
                action: 'Create',
                heading: 'Room Creation Failed',
                description: `Category with ID ${categoryId} not found`
            });
            return res.status(400).json({
                success: false,
                message: "Category not found",
                field: "categoryId"
            });
        }

        // ✅ Create room with categoryName
        const roomData = {
            roomNumber,
            categoryId,
            categoryName: categoryExists.categoryName,
            floorNumber: floorNumber || 1,
            status: status || 'Available',
            isActive: isActive !== undefined ? isActive : true,
            specialFeatures: specialFeatures || ''
        };

        const room = new Room(roomData);
        const savedRoom = await room.save();

        await logSuccess({
            module: 'Rooms',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Create',
            heading: 'Room Created Successfully',
            description: `Room "${savedRoom.roomNumber}" created with category "${categoryExists.categoryName}"`
        });

        res.status(201).json({
            success: true,
            message: "Room created successfully.",
            data: savedRoom
        });

    } catch (error) {
        console.error("Error creating room:", error);

        await logFailed({
            module: 'Rooms',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Create',
            heading: 'Room Creation Failed',
            description: error.message || 'Unknown error occurred'
        });

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to create room",
            error: error.message
        });
    }
});

// ============================================
// GET all rooms - WITH DYNAMIC STATUS CALCULATION
// ============================================
router.get("/get-rooms", auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            categoryId = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = {};

        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query = {
                $or: [
                    { roomNumber: { $regex: searchTerm, $options: 'i' } },
                    { specialFeatures: { $regex: searchTerm, $options: 'i' } },
                    { categoryName: { $regex: searchTerm, $options: 'i' } }
                ]
            };
        }

        if (status) {
            query.status = status;
        }

        if (categoryId) {
            query.categoryId = categoryId;
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const total = await Room.countDocuments(query);

        const rooms = await Room.find(query)
            .sort(sortObj)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .select('-__v')
            .lean();

        // ✅ ALWAYS fetch full category details including pricing
        const roomsWithCategory = await Promise.all(rooms.map(async (room) => {
            let categoryDetails = null;
            if (room.categoryId) {
                const category = await Category.findOne({ categoryId: room.categoryId }).lean();
                if (category) {
                    categoryDetails = {
                        categoryName: category.categoryName,
                        pricing: category.pricing,
                        amenities: category.amenities,
                        description: category.description,
                        maxOccupancy: category.maxOccupancy,
                        isActive: category.isActive
                    };
                    // Update room with categoryName if missing
                    if (!room.categoryName) {
                        await Room.findOneAndUpdate(
                            { roomId: room.roomId },
                            { categoryName: category.categoryName }
                        );
                    }
                }
            }

            // ✅ DYNAMIC STATUS CALCULATION (FIXED ORDER)
            const dynamicStatus = await calculateDynamicStatus(room);

            // ✅ Get future booking info (if any)
            const currentIST = getISTCurrentTime();
            const futureBooking = await Booking.findOne({
                roomIds: { $in: [room.roomId] },
                status: 'Confirmed',
                checkInDate: { $gt: currentIST }
            }).select('checkInDate customerName bookingNumber').lean();

            return {
                ...room,
                categoryDetails: categoryDetails || null,
                categoryName: room.categoryName || categoryDetails?.categoryName || 'N/A',
                // ✅ Override status with dynamic status
                status: dynamicStatus,
                // ✅ Additional info for frontend
                actualStatus: room.status, // Original stored status
                isDynamicallyCalculated: true,
                futureBooking: futureBooking || null
            };
        }));

        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: roomsWithCategory,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            },
            // ✅ Send current time for reference
            currentTime: getISTCurrentTime()
        });

    } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch rooms",
            error: error.message
        });
    }
});

// ============================================
// GET room by ID - READ ONLY (with category details)
// ============================================
router.get("/get-room/:id", auth, async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.id }).lean();

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        // If categoryName is missing, fetch from Category
        let categoryDetails = null;
        if (room.categoryName) {
            categoryDetails = { categoryName: room.categoryName };
        }

        if (!room.categoryName && room.categoryId) {
            const category = await Category.findOne({ categoryId: room.categoryId }).lean();
            if (category) {
                categoryDetails = category;
                // Update room with categoryName
                await Room.findOneAndUpdate(
                    { roomId: room.roomId },
                    { categoryName: category.categoryName }
                );
            }
        }

        // ✅ Dynamic status calculation
        const dynamicStatus = await calculateDynamicStatus(room);

        res.status(200).json({
            success: true,
            data: {
                ...room,
                categoryDetails: categoryDetails || null,
                categoryName: room.categoryName || categoryDetails?.categoryName || 'N/A',
                status: dynamicStatus,
                actualStatus: room.status,
                isDynamicallyCalculated: true
            }
        });
    } catch (error) {
        console.error("Error fetching room:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch room",
            error: error.message
        });
    }
});

// ============================================
// GET rooms by category - READ ONLY
// ============================================
router.get("/get-rooms-by-category/:categoryId", auth, async (req, res) => {
    try {
        const { categoryId } = req.params;

        const rooms = await Room.find({
            categoryId,
            isActive: true
        })
            .select('roomNumber floorNumber status categoryName')
            .lean();

        // ✅ Calculate dynamic status for each room
        const roomsWithStatus = await Promise.all(rooms.map(async (room) => {
            const dynamicStatus = await calculateDynamicStatus(room);
            return {
                ...room,
                status: dynamicStatus,
                actualStatus: room.status,
                isDynamicallyCalculated: true
            };
        }));

        // ✅ Filter available rooms based on dynamic status
        const availableRooms = roomsWithStatus.filter(r => r.status === 'Available');

        const category = await Category.findOne({ categoryId }).lean();

        res.status(200).json({
            success: true,
            data: {
                category: category,
                rooms: roomsWithStatus,
                availableRooms: availableRooms,
                availableCount: availableRooms.length
            }
        });
    } catch (error) {
        console.error("Error fetching rooms by category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch rooms",
            error: error.message
        });
    }
});

// ============================================
// PUT update-room/:id - Update room (with categoryName)
// ============================================
router.put("/update-room/:id", auth, checkAdminPermission, async (req, res) => {
    try {
        const { roomId, _id, createdAt, updatedAt, ...updateData } = req.body;

        const existingRoom = await Room.findOne({ roomId: req.params.id });

        if (!existingRoom) {
            await logFailed({
                module: 'Rooms',
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email,
                action: 'Update',
                heading: 'Room Update Failed',
                description: `Room with ID ${req.params.id} not found`
            });
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        // Check if room number is being changed and if it already exists
        if (updateData.roomNumber && updateData.roomNumber !== existingRoom.roomNumber) {
            const roomExists = await Room.findOne({
                roomNumber: updateData.roomNumber,
                roomId: { $ne: req.params.id }
            });

            if (roomExists) {
                return res.status(400).json({
                    success: false,
                    message: "Room number already exists",
                    field: "roomNumber"
                });
            }
        }

        // ✅ If categoryId is being updated, fetch new category name
        if (updateData.categoryId && updateData.categoryId !== existingRoom.categoryId) {
            const categoryExists = await Category.findOne({ categoryId: updateData.categoryId });
            if (!categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: "Category not found",
                    field: "categoryId"
                });
            }
            // ✅ Update categoryName
            updateData.categoryName = categoryExists.categoryName;
        }

        const updatedRoom = await Room.findOneAndUpdate(
            { roomId: req.params.id },
            updateData,
            { new: true, runValidators: true }
        );

        await logSuccess({
            module: 'Rooms',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Room Updated Successfully',
            description: `Room "${updatedRoom.roomNumber}" updated successfully`
        });

        res.status(200).json({
            success: true,
            message: "Room updated successfully.",
            data: updatedRoom
        });

    } catch (error) {
        console.error("Error updating room:", error);

        await logFailed({
            module: 'Rooms',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Update',
            heading: 'Room Update Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to update room",
            error: error.message
        });
    }
});

// ============================================
// PUT update-room-status/:id - Update room status only
// ============================================
router.put("/update-room-status/:id", auth, checkAdminPermission, async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }

        const room = await Room.findOne({ roomId: req.params.id });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        const oldStatus = room.status;
        room.status = status;
        await room.save();

        await logSuccess({
            module: 'Rooms',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Room Status Updated',
            description: `Room "${room.roomNumber}" status changed from ${oldStatus} to ${status}`
        });

        res.status(200).json({
            success: true,
            message: "Room status updated successfully.",
            data: room
        });

    } catch (error) {
        console.error("Error updating room status:", error);

        await logFailed({
            module: 'Rooms',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Update',
            heading: 'Room Status Update Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to update room status",
            error: error.message
        });
    }
});

// ============================================
// DELETE delete-room/:id - Delete room
// ============================================
router.delete("/delete-room/:id", auth, checkAdminPermission, async (req, res) => {
    try {
        const roomToDelete = await Room.findOne({ roomId: req.params.id });

        if (!roomToDelete) {
            await logFailed({
                module: 'Rooms',
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email,
                action: 'Delete',
                heading: 'Room Deletion Failed',
                description: `Room with ID ${req.params.id} not found`
            });
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        await Room.findOneAndDelete({ roomId: req.params.id });

        await logSuccess({
            module: 'Rooms',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Delete',
            heading: 'Room Deleted Successfully',
            description: `Room "${roomToDelete.roomNumber}" deleted successfully`
        });

        res.status(200).json({
            success: true,
            message: "Room deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting room:", error);

        await logFailed({
            module: 'Rooms',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Delete',
            heading: 'Room Deletion Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to delete room",
            error: error.message
        });
    }
});

module.exports = router;