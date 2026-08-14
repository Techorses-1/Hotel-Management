import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import {
    FaPlus, FaSearch, FaEdit, FaSave, FaTrash, FaTimes,
    FaBed, FaMoneyBillWave, FaClock, FaTag, FaList, FaMoon
} from "react-icons/fa";
import Navbar from "../../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./Category.scss";

const Category = () => {
    const [showForm, setShowForm] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Debounce logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Fetch categories
    const fetchCategories = async (search = '') => {
        try {
            setIsLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/category/get-categories`);
            url.searchParams.append('page', 1);
            url.searchParams.append('limit', 50);
            if (search) {
                url.searchParams.append('search', search);
            }

            const response = await fetch(url, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                setCategories(data.data || []);
            } else {
                throw new Error(data.message || 'Failed to fetch categories');
            }
        } catch (err) {
            console.error("Error fetching categories:", err);
            toast.error("Failed to fetch categories");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchCategories(debouncedSearch);
    }, [debouncedSearch]);

    // Handle row selection
    const selectCategory = (categoryId) => {
        setSelectedCategory((prev) => (prev === categoryId ? null : categoryId));
    };

    // Initial values for form
    const initialValues = {
        categoryName: "",
        description: "",
        pricing: {
            perDay: "",
            perNight: "",
            per6Hours: "",
            per12Hours: "",
            extraHourCharge: "0"
        },
        maxOccupancy: 2,
        amenities: [],
        isActive: true
    };

    // Validation schema
    const validationSchema = Yup.object({
        categoryName: Yup.string()
            .required("Category name is required")
            .min(2, "Category name must be at least 2 characters"),
        description: Yup.string(),
        pricing: Yup.object({
            perDay: Yup.number()
                .required("Per day price is required")
                .min(0, "Price cannot be negative"),
            perNight: Yup.number()
                .required("Per night price is required")
                .min(0, "Price cannot be negative"),
            per6Hours: Yup.number()
                .required("6 hours price is required")
                .min(0, "Price cannot be negative"),
            per12Hours: Yup.number()
                .required("12 hours price is required")
                .min(0, "Price cannot be negative"),
            extraHourCharge: Yup.number()
                .min(0, "Price cannot be negative")
        }),
        maxOccupancy: Yup.number()
            .min(1, "Minimum occupancy is 1")
            .max(10, "Maximum occupancy is 10"),
        amenities: Yup.array(),
        isActive: Yup.boolean()
    });

    // Handle submit
    const handleSubmit = async (values, { resetForm, setFieldError }) => {
        try {
            setIsFormSubmitting(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/category/create-category`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (data.field === "categoryName") {
                    setFieldError("categoryName", "Category with this name already exists");
                    toast.error("Category with this name already exists");
                } else {
                    throw new Error(data.message || "Failed to add category");
                }
                return;
            }

            toast.success("Category added successfully!");
            resetForm();
            setShowForm(false);
            fetchCategories(debouncedSearch);
        } catch (error) {
            console.error("Error adding category:", error);
            toast.error(error.message || "Error creating category");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    // Handle update
    const handleUpdateCategory = async (updatedCategory) => {
        try {
            const categoryId = updatedCategory.categoryId;
            const dataToSend = { ...updatedCategory };
            delete dataToSend.createdAt;
            delete dataToSend.updatedAt;

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/category/update-category/${categoryId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSend),
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update category");
            }

            toast.success("Category updated successfully!");
            fetchCategories(debouncedSearch);
        } catch (error) {
            console.error("Error updating category:", error);
            toast.error(error.message || "Error updating category");
        }
    };

    // Handle delete
    const handleDeleteCategory = async (categoryId) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/category/delete-category/${categoryId}`,
                {
                    method: "DELETE",
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (data.roomsExist) {
                    toast.error("Cannot delete category. Rooms are assigned to this category.");
                    return;
                }
                throw new Error(data.message || "Failed to delete category");
            }

            setSelectedCategory(null);
            toast.success("Category deleted successfully!");
            fetchCategories(debouncedSearch);
        } catch (error) {
            console.error("Error deleting category:", error);
            toast.error(error.message || "Error deleting category");
        }
    };

    // Category Modal Component
    const CategoryModal = ({ category, onClose, onUpdate, onDelete }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editedCategory, setEditedCategory] = useState({});
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [errors, setErrors] = useState({});

        useEffect(() => {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'auto';
            };
        }, []);

        useEffect(() => {
            if (category) {
                setEditedCategory({ ...category });
                setErrors({});
            }
        }, [category]);

        const validateForm = (values) => {
            const newErrors = {};

            if (!values.categoryName) newErrors.categoryName = "Category name is required";
            else if (values.categoryName.length < 2) newErrors.categoryName = "Category name must be at least 2 characters";

            if (!values.pricing?.perDay && values.pricing?.perDay !== 0) newErrors.perDay = "Per day price is required";
            if (!values.pricing?.perNight && values.pricing?.perNight !== 0) newErrors.perNight = "Per night price is required";
            if (!values.pricing?.per6Hours && values.pricing?.per6Hours !== 0) newErrors.per6Hours = "6 hours price is required";
            if (!values.pricing?.per12Hours && values.pricing?.per12Hours !== 0) newErrors.per12Hours = "12 hours price is required";

            return newErrors;
        };

        const handleInputChange = (e) => {
            const { name, value } = e.target;

            if (name.includes('pricing.')) {
                const pricingField = name.split('.')[1];
                setEditedCategory(prev => ({
                    ...prev,
                    pricing: {
                        ...prev.pricing,
                        [pricingField]: value
                    }
                }));
            } else {
                setEditedCategory(prev => ({ ...prev, [name]: value }));
            }
        };

        const handleSave = async () => {
            const formErrors = validateForm(editedCategory);
            if (Object.keys(formErrors).length > 0) {
                setErrors(formErrors);
                toast.error("Please fix the errors before saving");
                return;
            }

            try {
                await onUpdate(editedCategory);
                setIsEditing(false);
                setErrors({});
            } catch (error) {
                console.error("Error updating category:", error);
            }
        };

        if (!category) return null;

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">
                            {isEditing ? "Edit Category" : `Category: ${category.categoryName}`}
                        </div>
                        <button className="modal-close" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="modal-body">
                        <div className="detail-row">
                            <span className="detail-label">Category Name</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="categoryName"
                                    value={editedCategory.categoryName || ''}
                                    onChange={handleInputChange}
                                    className="edit-input"
                                />
                            ) : (
                                <span className="detail-value">{category.categoryName}</span>
                            )}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Description</span>
                            {isEditing ? (
                                <textarea
                                    name="description"
                                    value={editedCategory.description || ''}
                                    onChange={handleInputChange}
                                    className="edit-textarea"
                                />
                            ) : (
                                <span className="detail-value">{category.description || 'N/A'}</span>
                            )}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Per Day (24 hrs)</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    name="pricing.perDay"
                                    value={editedCategory.pricing?.perDay || ''}
                                    onChange={handleInputChange}
                                    className="edit-input"
                                />
                            ) : (
                                <span className="detail-value">₹{category.pricing?.perDay || 0}</span>
                            )}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Per Night</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    name="pricing.perNight"
                                    value={editedCategory.pricing?.perNight || ''}
                                    onChange={handleInputChange}
                                    className="edit-input"
                                />
                            ) : (
                                <span className="detail-value">₹{category.pricing?.perNight || 0}</span>
                            )}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Per 6 Hours</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    name="pricing.per6Hours"
                                    value={editedCategory.pricing?.per6Hours || ''}
                                    onChange={handleInputChange}
                                    className="edit-input"
                                />
                            ) : (
                                <span className="detail-value">₹{category.pricing?.per6Hours || 0}</span>
                            )}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Per 12 Hours</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    name="pricing.per12Hours"
                                    value={editedCategory.pricing?.per12Hours || ''}
                                    onChange={handleInputChange}
                                    className="edit-input"
                                />
                            ) : (
                                <span className="detail-value">₹{category.pricing?.per12Hours || 0}</span>
                            )}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Extra Hour Charge</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    name="pricing.extraHourCharge"
                                    value={editedCategory.pricing?.extraHourCharge || 0}
                                    onChange={handleInputChange}
                                    className="edit-input"
                                />
                            ) : (
                                <span className="detail-value">₹{category.pricing?.extraHourCharge || 0}</span>
                            )}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Max Occupancy</span>
                            {isEditing ? (
                                <input
                                    type="number"
                                    name="maxOccupancy"
                                    value={editedCategory.maxOccupancy || 2}
                                    onChange={handleInputChange}
                                    className="edit-input"
                                />
                            ) : (
                                <span className="detail-value">{category.maxOccupancy || 2}</span>
                            )}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label"><FaList /> Amenities</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="amenities"
                                    value={editedCategory.amenities?.join(', ') || ''}
                                    onChange={(e) => {
                                        const amenitiesArray = e.target.value.split(',').map(item => item.trim()).filter(item => item);
                                        setEditedCategory(prev => ({ ...prev, amenities: amenitiesArray }));
                                    }}
                                    placeholder="AC, TV, WiFi, Mini Bar"
                                    className="edit-input"
                                />
                            ) : (
                                <span className="detail-value">
                                    {category.amenities?.length > 0 ? category.amenities.join(', ') : 'N/A'}
                                </span>
                            )}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Status</span>
                            {isEditing ? (
                                <select
                                    name="isActive"
                                    value={editedCategory.isActive ? "true" : "false"}
                                    onChange={(e) => setEditedCategory(prev => ({ ...prev, isActive: e.target.value === "true" }))}
                                    className="edit-input"
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            ) : (
                                <span className="detail-value">
                                    {category.isActive ? 'Active' : 'Inactive'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            className={`update-btn ${isEditing ? 'save-btn' : ''}`}
                            onClick={isEditing ? handleSave : () => setIsEditing(true)}
                        >
                            {isEditing ? <FaSave /> : <FaEdit />}
                            {isEditing ? "Save" : "Update"}
                        </button>
                        <button
                            className="delete-btn"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <FaTrash /> Delete
                        </button>
                    </div>
                </div>

                {showDeleteConfirm && (
                    <div className="confirm-dialog-overlay">
                        <div className="confirm-dialog">
                            <h3>Confirm Deletion</h3>
                            <p>Are you sure you want to delete {category.categoryName}? This action cannot be undone.</p>
                            <div className="confirm-buttons">
                                <button className="confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                    Cancel
                                </button>
                                <button className="confirm-delete" onClick={() => {
                                    onDelete(category.categoryId);
                                    setShowDeleteConfirm(false);
                                }}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="main">
                <div className="page-header">
                    <div className="right-section">
                        <div className="search-container">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search Categories..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="action-buttons-group">
                            <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                                <FaPlus /> {showForm ? "Close" : "Add Category"}
                            </button>
                        </div>
                    </div>
                </div>

                {showForm && (
                    <div className="form-container premium">
                        <h2>Add Room Category</h2>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleSubmit}
                        >
                            <Form>
                                {/* ===== ROW 1: Category Name + Description ===== */}
                                <div className="form-row">
                                    <div className="form-field">
                                        <label><FaTag /> Category Name *</label>
                                        <Field name="categoryName" type="text" />
                                        <ErrorMessage name="categoryName" component="div" className="error" />
                                    </div>
                                    <div className="form-field">
                                        <label>Description</label>
                                        <Field name="description" as="textarea" />
                                        <ErrorMessage name="description" component="div" className="error" />
                                    </div>
                                </div>

                                {/* ===== ROW 2: Per Day + Per Night + 6 Hours ===== */}
                                <div className="form-row">
                                    <div className="form-field">
                                        <label><FaMoneyBillWave /> Per Day (24 hrs) *</label>
                                        <Field name="pricing.perDay" type="number" />
                                        <ErrorMessage name="pricing.perDay" component="div" className="error" />
                                    </div>
                                    <div className="form-field">
                                        <label><FaMoon /> Per Night *</label>
                                        <Field name="pricing.perNight" type="number" />
                                        <ErrorMessage name="pricing.perNight" component="div" className="error" />
                                    </div>
                                    <div className="form-field">
                                        <label><FaClock /> Per 6 Hours *</label>
                                        <Field name="pricing.per6Hours" type="number" />
                                        <ErrorMessage name="pricing.per6Hours" component="div" className="error" />
                                    </div>
                                </div>

                                {/* ===== ROW 3: 12 Hours + Extra Hour + Max Occupancy ===== */}
                                <div className="form-row">
                                    <div className="form-field">
                                        <label><FaClock /> Per 12 Hours *</label>
                                        <Field name="pricing.per12Hours" type="number" />
                                        <ErrorMessage name="pricing.per12Hours" component="div" className="error" />
                                    </div>
                                    <div className="form-field">
                                        <label><FaClock /> Extra Hour Charge</label>
                                        <Field name="pricing.extraHourCharge" type="number" />
                                        <ErrorMessage name="pricing.extraHourCharge" component="div" className="error" />
                                    </div>
                                    <div className="form-field">
                                        <label><FaBed /> Max Occupancy</label>
                                        <Field name="maxOccupancy" type="number" />
                                        <ErrorMessage name="maxOccupancy" component="div" className="error" />
                                    </div>
                                </div>

                                {/* ===== ROW 4: Amenities (Full Width) ===== */}
                                <div className="form-row">
                                    <div className="form-field">
                                        <label><FaList /> Amenities (comma separated)</label>
                                        <Field name="amenities" type="text" />
                                        <ErrorMessage name="amenities" component="div" className="error" />
                                    </div>
                                </div>

                                <button type="submit" disabled={isFormSubmitting}>
                                    {isFormSubmitting ? (
                                        <>
                                            <div className="loading-spinner small"></div>
                                            Adding...
                                        </>
                                    ) : (
                                        "Submit"
                                    )}
                                </button>
                            </Form>
                        </Formik>
                    </div>
                )}

                <div className="data-table">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner large"></div>
                            <p>Loading categories...</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Category Name</th>
                                    <th>Per Day</th>
                                    <th>Per Night</th>
                                    <th>6 Hours</th>
                                    <th>12 Hours</th>
                                    <th>Extra/Hr</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((cat, index) => (
                                    <tr
                                        key={cat.categoryId || index}
                                        className={selectedCategory === cat.categoryId ? "selected" : ""}
                                        onClick={() => selectCategory(cat.categoryId)}
                                    >
                                        <td>{cat.categoryName}</td>
                                        <td>₹{cat.pricing?.perDay || 0}</td>
                                        <td>₹{cat.pricing?.perNight || 0}</td>
                                        <td>₹{cat.pricing?.per6Hours || 0}</td>
                                        <td>₹{cat.pricing?.per12Hours || 0}</td>
                                        <td>₹{cat.pricing?.extraHourCharge || 0}</td>
                                        <td>
                                            <span className={cat.isActive ? "status-active" : "status-inactive"}>
                                                {cat.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {selectedCategory && (
                    <CategoryModal
                        category={categories.find(c => c.categoryId === selectedCategory)}
                        onClose={() => setSelectedCategory(null)}
                        onUpdate={handleUpdateCategory}
                        onDelete={handleDeleteCategory}
                    />
                )}
            </div>
        </Navbar>
    );
};

export default Category;