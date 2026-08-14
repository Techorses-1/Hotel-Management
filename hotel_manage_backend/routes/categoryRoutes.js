const express = require("express");
const router = express.Router();
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
// POST create-category - Create new category
// ============================================
router.post("/create-category", auth, checkAdminPermission, async (req, res) => {
    try {
        const { categoryName } = req.body;

        // Check if category already exists
        const existingCategory = await Category.findOne({ categoryName });
        if (existingCategory) {
            await logFailed({
                module: 'Categories',
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email,
                action: 'Create',
                heading: 'Category Creation Failed',
                description: `Category "${categoryName}" already exists`
            });
            return res.status(400).json({
                success: false,
                message: "Category with this name already exists",
                field: "categoryName"
            });
        }

        const category = new Category(req.body);
        const savedCategory = await category.save();

        await logSuccess({
            module: 'Categories',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Create',
            heading: 'Category Created Successfully',
            description: `Category "${savedCategory.categoryName}" created with pricing: Day=${savedCategory.pricing.perDay}, Night=${savedCategory.pricing.perNight}, 6Hrs=${savedCategory.pricing.per6Hours}, 12Hrs=${savedCategory.pricing.per12Hours}`
        });

        res.status(201).json({
            success: true,
            message: "Category created successfully.",
            data: savedCategory
        });

    } catch (error) {
        console.error("Error creating category:", error);

        await logFailed({
            module: 'Categories',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Create',
            heading: 'Category Creation Failed',
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
            message: "Failed to create category",
            error: error.message
        });
    }
});

// ============================================
// GET all categories - READ ONLY
// ============================================
router.get("/get-categories", auth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let query = {};
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            query = {
                $or: [
                    { categoryName: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } }
                ]
            };
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const total = await Category.countDocuments(query);

        const categories = await Category.find(query)
            .sort(sortObj)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .select('-__v')
            .lean();

        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: categories,
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
        console.error("Error fetching categories:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch categories",
            error: error.message
        });
    }
});

// ============================================
// GET category by ID - READ ONLY
// ============================================
router.get("/get-category/:id", auth, async (req, res) => {
    try {
        const category = await Category.findOne({ categoryId: req.params.id });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch category",
            error: error.message
        });
    }
});

// ============================================
// PUT update-category/:id - Update category
// ============================================
router.put("/update-category/:id", auth, checkAdminPermission, async (req, res) => {
    try {
        const { categoryId, _id, createdAt, updatedAt, ...updateData } = req.body;

        const existingCategory = await Category.findOne({ categoryId: req.params.id });

        if (!existingCategory) {
            await logFailed({
                module: 'Categories',
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email,
                action: 'Update',
                heading: 'Category Update Failed',
                description: `Category with ID ${req.params.id} not found`
            });
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        // Check if category name is being changed and if it already exists
        if (updateData.categoryName && updateData.categoryName !== existingCategory.categoryName) {
            const categoryExists = await Category.findOne({
                categoryName: updateData.categoryName,
                categoryId: { $ne: req.params.id }
            });

            if (categoryExists) {
                return res.status(400).json({
                    success: false,
                    message: "Category with this name already exists",
                    field: "categoryName"
                });
            }
        }

        const updatedCategory = await Category.findOneAndUpdate(
            { categoryId: req.params.id },
            updateData,
            { new: true, runValidators: true }
        );

        await logSuccess({
            module: 'Categories',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Update',
            heading: 'Category Updated Successfully',
            description: `Category "${updatedCategory.categoryName}" updated successfully`
        });

        res.status(200).json({
            success: true,
            message: "Category updated successfully.",
            data: updatedCategory
        });

    } catch (error) {
        console.error("Error updating category:", error);

        await logFailed({
            module: 'Categories',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Update',
            heading: 'Category Update Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to update category",
            error: error.message
        });
    }
});

// ============================================
// DELETE delete-category/:id - Delete category
// ============================================
router.delete("/delete-category/:id", auth, checkAdminPermission, async (req, res) => {
    try {
        const categoryToDelete = await Category.findOne({ categoryId: req.params.id });

        if (!categoryToDelete) {
            await logFailed({
                module: 'Categories',
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email,
                action: 'Delete',
                heading: 'Category Deletion Failed',
                description: `Category with ID ${req.params.id} not found`
            });
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        // Check if any rooms are using this category
        const Room = require("../models/room");
        const roomsUsingCategory = await Room.findOne({ categoryId: req.params.id });

        if (roomsUsingCategory) {
            await logFailed({
                module: 'Categories',
                userId: req.user.userId,
                userName: req.user.name,
                userEmail: req.user.email,
                action: 'Delete',
                heading: 'Category Deletion Failed',
                description: `Category "${categoryToDelete.categoryName}" has rooms assigned to it`
            });
            return res.status(400).json({
                success: false,
                message: "Cannot delete category. Rooms are assigned to this category.",
                roomsExist: true
            });
        }

        await Category.findOneAndDelete({ categoryId: req.params.id });

        await logSuccess({
            module: 'Categories',
            userId: req.user.userId,
            userName: req.user.name,
            userEmail: req.user.email,
            action: 'Delete',
            heading: 'Category Deleted Successfully',
            description: `Category "${categoryToDelete.categoryName}" deleted successfully`
        });

        res.status(200).json({
            success: true,
            message: "Category deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting category:", error);

        await logFailed({
            module: 'Categories',
            userId: req.user?.userId || 'Unknown',
            userName: req.user?.name || 'Unknown',
            userEmail: req.user?.email || 'Unknown',
            action: 'Delete',
            heading: 'Category Deletion Failed',
            description: error.message || 'Unknown error occurred'
        });

        res.status(500).json({
            success: false,
            message: "Failed to delete category",
            error: error.message
        });
    }
});

module.exports = router;