const express = require("express");
const router = express.Router();
const Housekeeping = require("../models/housekeeping");
const CheckOut = require("../models/checkOut");
const CheckIn = require("../models/checkIn");
const Room = require("../models/room");
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
const checkHousekeepingPermission = (req, res, next) => {
    const permissions = req.user.permissions || [];
    if (permissions.includes('admin') || permissions.includes('reception') || permissions.includes('housekeeping')) {
        next();
    } else {
        return res.status(403).json({
            message: 'Access denied. Housekeeping permission required.'
        });
    }
};

// ============================================
// GET ALL HOUSEKEEPING TASKS (PAGINATED)
// ============================================
router.get("/get-tasks", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
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
                { roomNumber: { $regex: searchTerm, $options: 'i' } },
                { customerName: { $regex: searchTerm, $options: 'i' } },
                { customerPhone: { $regex: searchTerm, $options: 'i' } },
                { taskNumber: { $regex: searchTerm, $options: 'i' } },
                { checkOutNumber: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        if (status) query.status = status;
        if (roomId) query.roomId = roomId;

        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else if (startDate) {
            query.createdAt = { $gte: new Date(startDate) };
        } else if (endDate) {
            query.createdAt = { $lte: new Date(endDate) };
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [tasks, total] = await Promise.all([
            Housekeeping.find(query)
                .select('-__v')
                .sort(sortObj)
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .lean(),
            Housekeeping.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: tasks,
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
        console.error("Error fetching housekeeping tasks:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch tasks",
            error: error.message
        });
    }
});

// ============================================
// GET PENDING TASKS
// ============================================
router.get("/pending-tasks", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const tasks = await Housekeeping.find({ status: 'Pending' })
            .sort({ createdAt: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: tasks,
            count: tasks.length
        });

    } catch (error) {
        console.error("Error fetching pending tasks:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch pending tasks",
            error: error.message
        });
    }
});

// ============================================
// GET TASK BY ID
// ============================================
router.get("/get-task/:id", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const task = await Housekeeping.findOne({ taskId: req.params.id }).lean();

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        res.status(200).json({
            success: true,
            data: task
        });

    } catch (error) {
        console.error("Error fetching task:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch task",
            error: error.message
        });
    }
});

// ============================================
// GET TASKS BY ROOM
// ============================================
router.get("/room/:roomId", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const { roomId } = req.params;
        const { limit = 10 } = req.query;

        const tasks = await Housekeeping.find({ roomId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        res.status(200).json({
            success: true,
            data: tasks,
            count: tasks.length
        });

    } catch (error) {
        console.error("Error fetching room tasks:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch room tasks",
            error: error.message
        });
    }
});

// ============================================
// GET TASKS BY CHECK-OUT
// ============================================
router.get("/checkout/:checkOutId", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const { checkOutId } = req.params;

        const task = await Housekeeping.findOne({ checkOutId }).lean();

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found for this check-out"
            });
        }

        res.status(200).json({
            success: true,
            data: task
        });

    } catch (error) {
        console.error("Error fetching task by check-out:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch task",
            error: error.message
        });
    }
});

// ============================================
// CREATE HOUSEKEEPING TASK (Auto from Check-out)
// ============================================
router.post("/create-task", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const {
            roomId,
            roomNumber,
            categoryId,
            categoryName,
            checkOutId,
            checkOutNumber,
            customerId,
            customerName,
            customerPhone,
            note
        } = req.body;

        // ✅ Check if task already exists for this check-out
        const existingTask = await Housekeeping.findOne({ checkOutId });
        if (existingTask) {
            return res.status(400).json({
                success: false,
                message: "Housekeeping task already exists for this check-out"
            });
        }

        // ✅ Check if room exists
        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        // ✅ Create task
        const taskData = {
            roomId,
            roomNumber,
            categoryId: categoryId || room.categoryId || '',
            categoryName: categoryName || '',
            checkOutId,
            checkOutNumber,
            customerId: customerId || '',
            customerName: customerName || '',
            customerPhone: customerPhone || '',
            note: note || '',
            status: 'Pending',
            createdBy: {
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email
            }
        };

        const task = new Housekeeping(taskData);
        const savedTask = await task.save();

        await logSuccess({
            module: 'Housekeeping',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Create',
            heading: 'Housekeeping Task Created',
            description: `Task ${savedTask.taskNumber} created for Room ${roomNumber}`
        });

        res.status(201).json({
            success: true,
            message: "Housekeeping task created successfully",
            data: savedTask
        });

    } catch (error) {
        console.error("Error creating housekeeping task:", error);

        await logFailed({
            module: 'Housekeeping',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Create',
            heading: 'Housekeeping Task Creation Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to create task",
            error: error.message
        });
    }
});

// ============================================
// CREATE TASK FROM CHECK-OUT (Auto-trigger)
// ============================================
router.post("/auto-create-from-checkout", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const { checkOutId } = req.body;

        if (!checkOutId) {
            return res.status(400).json({
                success: false,
                message: "Check-out ID is required"
            });
        }

        // ✅ Get check-out details
        const checkOut = await CheckOut.findOne({ checkOutId }).lean();
        if (!checkOut) {
            return res.status(404).json({
                success: false,
                message: "Check-out not found"
            });
        }

        // ✅ Check if task already exists
        const existingTask = await Housekeeping.findOne({ checkOutId });
        if (existingTask) {
            return res.status(400).json({
                success: false,
                message: "Housekeeping task already exists for this check-out"
            });
        }

        // ✅ Parse roomIds if stringified
        let roomIdArray = checkOut.roomIds || [];
        if (typeof roomIdArray === 'string') {
            try {
                roomIdArray = JSON.parse(roomIdArray);
            } catch {
                roomIdArray = [roomIdArray];
            }
        }
        if (!Array.isArray(roomIdArray)) {
            roomIdArray = [roomIdArray];
        }

        // ✅ Create task for first room (or all rooms)
        const tasks = [];
        for (const roomId of roomIdArray) {
            const room = await Room.findOne({ roomId });
            if (!room) continue;

            const taskData = {
                roomId: room.roomId,
                roomNumber: room.roomNumber,
                categoryId: room.categoryId || '',
                categoryName: room.categoryName || '',
                checkOutId: checkOut.checkOutId,
                checkOutNumber: checkOut.checkOutNumber,
                customerId: checkOut.customerId || '',
                customerName: checkOut.customerName || '',
                customerPhone: checkOut.customerPhone || '',
                status: 'Pending',
                createdBy: {
                    userId: req.user.userId,
                    userName: req.user.name,
                    userEmail: req.user.email
                }
            };

            const task = new Housekeeping(taskData);
            const savedTask = await task.save();
            tasks.push(savedTask);
        }

        await logSuccess({
            module: 'Housekeeping',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Create',
            heading: 'Housekeeping Task Auto-Created',
            description: `${tasks.length} task(s) created from check-out ${checkOut.checkOutNumber}`
        });

        res.status(201).json({
            success: true,
            message: `Housekeeping task(s) created successfully`,
            data: tasks
        });

    } catch (error) {
        console.error("Error auto-creating housekeeping task:", error);

        await logFailed({
            module: 'Housekeeping',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Create',
            heading: 'Housekeeping Auto-Creation Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to create task",
            error: error.message
        });
    }
});

// ============================================
// MARK TASK AS COMPLETED
// ============================================
router.put("/complete-task/:id", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const task = await Housekeeping.findOne({ taskId: id });
        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        if (task.status === 'Completed') {
            return res.status(400).json({
                success: false,
                message: "Task is already completed"
            });
        }

        if (task.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: "Task is cancelled"
            });
        }

        // ✅ Mark task as completed
        task.status = 'Completed';
        task.completedAt = new Date();
        task.completedBy = {
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email
        };
        if (note) {
            task.note = note;
        }

        await task.save();

        // ✅ Update room status to Available
        const room = await Room.findOne({ roomId: task.roomId });
        if (room) {
            room.status = 'Available';
            await room.save();
        }

        await logSuccess({
            module: 'Housekeeping',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Complete',
            heading: 'Housekeeping Task Completed',
            description: `Task ${task.taskNumber} completed for Room ${task.roomNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Task completed successfully",
            data: task
        });

    } catch (error) {
        console.error("Error completing task:", error);

        await logFailed({
            module: 'Housekeeping',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Complete',
            heading: 'Housekeeping Task Completion Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to complete task",
            error: error.message
        });
    }
});

// ============================================
// CANCEL TASK
// ============================================
router.put("/cancel-task/:id", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const task = await Housekeeping.findOne({ taskId: id });
        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        if (task.status === 'Completed') {
            return res.status(400).json({
                success: false,
                message: "Cannot cancel a completed task"
            });
        }

        // ✅ Mark task as cancelled
        task.status = 'Cancelled';
        task.note = reason || 'Cancelled by admin';
        await task.save();

        // ✅ Revert room status to Occupied (if check-out was reversed)
        const room = await Room.findOne({ roomId: task.roomId });
        if (room && room.status === 'Cleaning') {
            room.status = 'Occupied';
            await room.save();
        }

        await logSuccess({
            module: 'Housekeeping',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Cancel',
            heading: 'Housekeeping Task Cancelled',
            description: `Task ${task.taskNumber} cancelled for Room ${task.roomNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Task cancelled successfully",
            data: task
        });

    } catch (error) {
        console.error("Error cancelling task:", error);

        await logFailed({
            module: 'Housekeeping',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Cancel',
            heading: 'Housekeeping Task Cancellation Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to cancel task",
            error: error.message
        });
    }
});

// ============================================
// DELETE TASK
// ============================================
router.delete("/delete-task/:id", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Housekeeping.findOne({ taskId: id });
        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        await Housekeeping.findOneAndDelete({ taskId: id });

        await logSuccess({
            module: 'Housekeeping',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Delete',
            heading: 'Housekeeping Task Deleted',
            description: `Task ${task.taskNumber} deleted for Room ${task.roomNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Task deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting task:", error);

        await logFailed({
            module: 'Housekeeping',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Delete',
            heading: 'Housekeeping Task Deletion Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to delete task",
            error: error.message
        });
    }
});

// ============================================
// GET TASK STATISTICS
// ============================================
router.get("/stats", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get counts
        const [totalPending, totalCompleted, totalToday, totalCancelled] = await Promise.all([
            Housekeeping.countDocuments({ status: 'Pending' }),
            Housekeeping.countDocuments({ status: 'Completed' }),
            Housekeeping.countDocuments({
                createdAt: { $gte: today, $lt: tomorrow }
            }),
            Housekeeping.countDocuments({ status: 'Cancelled' })
        ]);

        res.status(200).json({
            success: true,
            data: {
                pending: totalPending,
                completed: totalCompleted,
                cancelled: totalCancelled,
                today: totalToday
            }
        });

    } catch (error) {
        console.error("Error fetching housekeeping stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stats",
            error: error.message
        });
    }
});

// ============================================
// BULK COMPLETE TASKS (Multiple rooms)
// ============================================
router.put("/bulk-complete", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const { taskIds, note } = req.body;

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Task IDs are required"
            });
        }

        const results = {
            success: [],
            failed: []
        };

        for (const taskId of taskIds) {
            try {
                const task = await Housekeeping.findOne({ taskId });
                if (!task) {
                    results.failed.push({ taskId, error: "Task not found" });
                    continue;
                }

                if (task.status === 'Completed') {
                    results.failed.push({ taskId, error: "Already completed" });
                    continue;
                }

                // Mark as completed
                task.status = 'Completed';
                task.completedAt = new Date();
                task.completedBy = {
                    userId: req.user.userId,
                    userName: req.user.name,
                    userEmail: req.user.email
                };
                if (note) {
                    task.note = note;
                }
                await task.save();

                // Update room status
                const room = await Room.findOne({ roomId: task.roomId });
                if (room) {
                    room.status = 'Available';
                    await room.save();
                }

                results.success.push(taskId);

            } catch (error) {
                results.failed.push({ taskId, error: error.message });
            }
        }

        await logSuccess({
            module: 'Housekeeping',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'BulkComplete',
            heading: 'Bulk Housekeeping Completed',
            description: `${results.success.length} tasks completed, ${results.failed.length} failed`
        });

        res.status(200).json({
            success: true,
            message: `Completed ${results.success.length} tasks, ${results.failed.length} failed`,
            data: results
        });

    } catch (error) {
        console.error("Error in bulk complete:", error);
        res.status(500).json({
            success: false,
            message: "Failed to complete tasks",
            error: error.message
        });
    }
});



// ============================================
// REVERT TASK (Undo Completed)
// ============================================
router.put("/revert-task/:id", auth, checkHousekeepingPermission, async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Housekeeping.findOne({ taskId: id });
        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found"
            });
        }

        if (task.status !== 'Completed') {
            return res.status(400).json({
                success: false,
                message: "Only completed tasks can be reverted"
            });
        }

        // ✅ Revert task to Pending
        task.status = 'Pending';
        task.completedAt = null;
        task.completedBy = null;
        await task.save();

        // ✅ Revert room status back to Cleaning
        const room = await Room.findOne({ roomId: task.roomId });
        if (room) {
            room.status = 'Cleaning';
            await room.save();
        }

        await logSuccess({
            module: 'Housekeeping',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Revert',
            heading: 'Housekeeping Task Reverted',
            description: `Task ${task.taskNumber} reverted to Pending for Room ${task.roomNumber}`
        });

        res.status(200).json({
            success: true,
            message: "Task reverted to Pending successfully",
            data: task
        });

    } catch (error) {
        console.error("Error reverting task:", error);

        await logFailed({
            module: 'Housekeeping',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Revert',
            heading: 'Housekeeping Task Revert Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to revert task",
            error: error.message
        });
    }
});

module.exports = router;