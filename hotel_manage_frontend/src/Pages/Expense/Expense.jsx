import React, { useState, useEffect, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import {
    FaPlus, FaSearch, FaEdit, FaSave, FaTrash, FaTimes,
    FaCalendarAlt, FaMoneyBillWave, FaCreditCard, FaUpload,
    FaDownload, FaEye, FaFilePdf, FaFileImage, FaFilter,
    FaRupeeSign, FaList, FaWallet, FaBuilding, FaUniversity,
    FaFileExcel, FaSync, FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import * as XLSX from "xlsx";
import Navbar from "../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./Expense.scss";

const Expense = () => {
    const [showForm, setShowForm] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);
    const [filterPaymentMode, setFilterPaymentMode] = useState("");
    const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [summary, setSummary] = useState({
        totalExpenses: 0,
        totalCount: 0,
        byPaymentMode: [],
        byPaymentStatus: []
    });

    // File upload
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadedFilePreview, setUploadedFilePreview] = useState(null);
    const fileInputRef = useRef(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Expense modal
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    // ✅ API Base URL
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4060';

    // ============================================
    // EFFECTS
    // ============================================
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        fetchExpenses();
        fetchSummary();
    }, [debouncedSearch, filterPaymentMode, filterPaymentStatus, filterStartDate, filterEndDate, currentPage]);

    // ============================================
    // API CALLS
    // ============================================
    const fetchExpenses = async () => {
        try {
            setIsLoading(true);
            const url = new URL(`${API_BASE_URL}/expense/get-expenses`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', 20);
            if (debouncedSearch) url.searchParams.append('search', debouncedSearch);
            if (filterPaymentMode) url.searchParams.append('paymentMode', filterPaymentMode);
            if (filterPaymentStatus) url.searchParams.append('paymentStatus', filterPaymentStatus);
            if (filterStartDate) url.searchParams.append('startDate', filterStartDate);
            if (filterEndDate) url.searchParams.append('endDate', filterEndDate);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setExpenses(data.data || []);
                setTotalPages(data.pagination?.totalPages || 1);
                setTotalItems(data.pagination?.total || 0);
            } else {
                throw new Error(data.message || 'Failed to fetch expenses');
            }
        } catch (err) {
            console.error("Error fetching expenses:", err);
            toast.error("Failed to fetch expenses");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const url = new URL(`${API_BASE_URL}/expense/summary`);
            if (filterStartDate) url.searchParams.append('startDate', filterStartDate);
            if (filterEndDate) url.searchParams.append('endDate', filterEndDate);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setSummary(data.data);
            }
        } catch (error) {
            console.error("Error fetching summary:", error);
        }
    };

    const handleCreateExpense = async (values, { resetForm, setFieldError }) => {
        try {
            setIsFormSubmitting(true);

            const formData = new FormData();
            formData.append('date', values.date);
            formData.append('title', values.title);
            formData.append('description', values.description || '');
            formData.append('amount', values.amount);
            formData.append('paymentMode', values.paymentMode);
            formData.append('paymentStatus', values.paymentStatus);

            if (uploadedFile) {
                formData.append('document', uploadedFile);
            }

            const response = await fetch(
                `${API_BASE_URL}/expense/create-expense`,
                {
                    method: "POST",
                    body: formData,
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create expense");
            }

            toast.success("Expense created successfully!");
            resetForm();
            setUploadedFile(null);
            setUploadedFilePreview(null);
            setShowForm(false);
            fetchExpenses();
            fetchSummary();
        } catch (error) {
            console.error("Error creating expense:", error);
            toast.error(error.message || "Error creating expense");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    const handleUpdateExpense = async (expenseId, values, file) => {
        try {
            setIsFormSubmitting(true);

            const formData = new FormData();
            formData.append('date', values.date);
            formData.append('title', values.title);
            formData.append('description', values.description || '');
            formData.append('amount', values.amount);
            formData.append('paymentMode', values.paymentMode);
            formData.append('paymentStatus', values.paymentStatus);

            if (file) {
                formData.append('document', file);
            }

            const response = await fetch(
                `${API_BASE_URL}/expense/update-expense/${expenseId}`,
                {
                    method: "PUT",
                    body: formData,
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update expense");
            }

            toast.success("Expense updated successfully!");
            setShowExpenseModal(false);
            setEditingExpense(null);
            fetchExpenses();
            fetchSummary();
        } catch (error) {
            console.error("Error updating expense:", error);
            toast.error(error.message || "Error updating expense");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/expense/delete-expense/${expenseId}`,
                {
                    method: "DELETE",
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete expense");
            }

            toast.success("Expense deleted successfully!");
            setSelectedExpense(null);
            fetchExpenses();
            fetchSummary();
        } catch (error) {
            console.error("Error deleting expense:", error);
            toast.error(error.message || "Error deleting expense");
        }
    };

    const handleDeleteDocument = async (expenseId) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/expense/delete-document/${expenseId}`,
                {
                    method: "DELETE",
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete document");
            }

            toast.success("Document deleted successfully!");
            fetchExpenses();
        } catch (error) {
            console.error("Error deleting document:", error);
            toast.error(error.message || "Error deleting document");
        }
    };

    const handleExportExcel = async () => {
        try {
            const url = new URL(`${API_BASE_URL}/expense/export`);
            if (filterStartDate) url.searchParams.append('startDate', filterStartDate);
            if (filterEndDate) url.searchParams.append('endDate', filterEndDate);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data.data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

                const filename = `${data.filename || 'expenses'}.xlsx`;
                XLSX.writeFile(workbook, filename);
                toast.success(`Expenses exported as ${filename}`);
            } else {
                toast.warning("No data to export");
            }
        } catch (error) {
            console.error("Error exporting expenses:", error);
            toast.error("Failed to export expenses");
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setUploadedFile(file);

            // Preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => setUploadedFilePreview(e.target.result);
                reader.readAsDataURL(file);
            } else {
                setUploadedFilePreview(null);
            }
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setUploadedFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // ✅ Get full file URL with backend base URL
    const getFileUrl = (fileUrl) => {
        if (!fileUrl) return '#';
        // If URL already starts with http, return as is
        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
            return fileUrl;
        }
        // Otherwise prepend API base URL
        return `${API_BASE_URL}${fileUrl}`;
    };

    const getPaymentModeIcon = (mode) => {
        switch (mode) {
            case 'Cash': return <FaMoneyBillWave />;
            case 'Bank': return <FaBuilding />;
            case 'Cheque': return <FaUniversity />;
            case 'UPI': return <FaCreditCard />;
            default: return <FaWallet />;
        }
    };

    const getPaymentStatusBadge = (status) => {
        switch (status) {
            case 'Paid': return <span className="status-badge status-paid">✅ Paid</span>;
            case 'Unpaid': return <span className="status-badge status-unpaid">❌ Unpaid</span>;
            case 'Partial': return <span className="status-badge status-partial">⏳ Partial</span>;
            default: return <span className="status-badge">{status}</span>;
        }
    };

    const getDocumentIcon = (fileType) => {
        if (!fileType) return <FaFileImage />;
        if (fileType === 'application/pdf') return <FaFilePdf />;
        return <FaFileImage />;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return '₹' + (amount || 0).toLocaleString('en-IN');
    };

    // ============================================
    // EXPENSE MODAL - FIXED (Option 1)
    // ============================================
    const ExpenseModal = ({ expense, onClose, onUpdate, onDelete }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editedExpense, setEditedExpense] = useState({});
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [showDocDeleteConfirm, setShowDocDeleteConfirm] = useState(false);
        const [localFile, setLocalFile] = useState(null);
        const [localFilePreview, setLocalFilePreview] = useState(null);
        const localFileInputRef = useRef(null);

        useEffect(() => {
            document.body.style.overflow = 'hidden';
            return () => document.body.style.overflow = 'auto';
        }, []);

        useEffect(() => {
            if (expense) {
                setEditedExpense({ ...expense });
            }
        }, [expense]);

        if (!expense) return null;

        const handleLocalFileChange = (event) => {
            const file = event.target.files[0];
            if (file) {
                setLocalFile(file);
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => setLocalFilePreview(e.target.result);
                    reader.readAsDataURL(file);
                } else {
                    setLocalFilePreview(null);
                }
            }
        };

        const handleLocalRemoveFile = () => {
            setLocalFile(null);
            setLocalFilePreview(null);
            if (localFileInputRef.current) {
                localFileInputRef.current.value = '';
            }
        };

        // ✅ FIXED: Removed duplicate API call - now calls parent's onUpdate only
        const handleSaveEdit = () => {
            // Validate required fields
            if (!editedExpense.date || !editedExpense.title || !editedExpense.amount) {
                toast.error("Date, Title and Amount are required");
                return;
            }

            // Call parent's update handler
            onUpdate(expense.expenseId, editedExpense, localFile);
            setIsEditing(false);
        };

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">
                            {isEditing ? "Edit Expense" : `Expense: ${expense.expenseNumber}`}
                        </div>
                        <button className="modal-close" onClick={onClose}><FaTimes /></button>
                    </div>
                    <div className="modal-body">
                        {isEditing ? (
                            <div className="wo-details-grid">
                                <div className="detail-row">
                                    <span className="detail-label">Date *</span>
                                    <input
                                        type="date"
                                        className="edit-input"
                                        value={editedExpense.date ? new Date(editedExpense.date).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setEditedExpense(prev => ({ ...prev, date: e.target.value }))}
                                    />
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Title *</span>
                                    <input
                                        type="text"
                                        className="edit-input"
                                        value={editedExpense.title || ''}
                                        onChange={(e) => setEditedExpense(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Description</span>
                                    <textarea
                                        className="edit-textarea"
                                        value={editedExpense.description || ''}
                                        onChange={(e) => setEditedExpense(prev => ({ ...prev, description: e.target.value }))}
                                        rows="2"
                                    />
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Amount *</span>
                                    <input
                                        type="number"
                                        className="edit-input"
                                        value={editedExpense.amount || 0}
                                        onChange={(e) => setEditedExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                        min="0"
                                    />
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Payment Mode *</span>
                                    <select
                                        className="edit-input"
                                        value={editedExpense.paymentMode || 'Cash'}
                                        onChange={(e) => setEditedExpense(prev => ({ ...prev, paymentMode: e.target.value }))}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Bank">Bank</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="UPI">UPI</option>
                                    </select>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Payment Status</span>
                                    <select
                                        className="edit-input"
                                        value={editedExpense.paymentStatus || 'Paid'}
                                        onChange={(e) => setEditedExpense(prev => ({ ...prev, paymentStatus: e.target.value }))}
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Unpaid">Unpaid</option>
                                        <option value="Partial">Partial</option>
                                    </select>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Document</span>
                                    <div className="file-upload-area">
                                        {(expense.document && !localFile) && (
                                            <div className="existing-file">
                                                {getDocumentIcon(expense.document.fileType)}
                                                <span>{expense.document.fileName}</span>
                                                <button
                                                    type="button"
                                                    className="remove-file-btn"
                                                    onClick={() => setShowDocDeleteConfirm(true)}
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            ref={localFileInputRef}
                                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                            onChange={handleLocalFileChange}
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            type="button"
                                            className="upload-btn"
                                            onClick={() => localFileInputRef.current?.click()}
                                        >
                                            <FaUpload /> {expense.document ? 'Replace Document' : 'Upload Document'}
                                        </button>
                                        {localFile && (
                                            <div className="file-preview">
                                                {localFilePreview ? (
                                                    <img src={localFilePreview} alt="Preview" className="preview-image" />
                                                ) : (
                                                    <div className="file-info">
                                                        <FaFilePdf /> {localFile.name}
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    className="remove-file-btn"
                                                    onClick={handleLocalRemoveFile}
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                        <small className="field-hint">Allowed: PDF, JPG, PNG, GIF, WEBP (Max 5MB)</small>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="wo-details-grid">
                                <div className="detail-row">
                                    <span className="detail-label">Expense #</span>
                                    <span className="detail-value">{expense.expenseNumber}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Date</span>
                                    <span className="detail-value">{formatDate(expense.date)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Title</span>
                                    <span className="detail-value"><strong>{expense.title}</strong></span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Description</span>
                                    <span className="detail-value">{expense.description || 'N/A'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Amount</span>
                                    <span className="detail-value amount-value">
                                        {formatCurrency(expense.amount)}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Payment Mode</span>
                                    <span className="detail-value">
                                        {getPaymentModeIcon(expense.paymentMode)} {expense.paymentMode || 'N/A'}
                                    </span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Payment Status</span>
                                    <span className="detail-value">{getPaymentStatusBadge(expense.paymentStatus)}</span>
                                </div>
                                {expense.document && (
                                    <div className="detail-row">
                                        <span className="detail-label">Document</span>
                                        <span className="detail-value">
                                            <a
                                                href={getFileUrl(expense.document.fileUrl)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="document-link"
                                            >
                                                {getDocumentIcon(expense.document.fileType)} {expense.document.fileName}
                                            </a>
                                            <span className="file-size">({(expense.document.fileSize / 1024).toFixed(1)} KB)</span>
                                        </span>
                                    </div>
                                )}
                                <div className="detail-row">
                                    <span className="detail-label">Created By</span>
                                    <span className="detail-value">{expense.createdBy?.userName || 'N/A'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Created At</span>
                                    <span className="detail-value">{new Date(expense.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        {!isEditing && expense.document && (
                            <a
                                href={getFileUrl(expense.document.fileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="export-btn download-link"
                            >
                                <FaDownload /> Download
                            </a>
                        )}
                        <button
                            className={`update-btn ${isEditing ? 'save-btn' : ''}`}
                            onClick={isEditing ? handleSaveEdit : () => setIsEditing(true)}
                            disabled={isEditing && isFormSubmitting}
                        >
                            {isEditing ? <FaSave /> : <FaEdit />}
                            {isEditing ? (isFormSubmitting ? "Saving..." : "Save") : "Update"}
                        </button>
                        {!isEditing && (
                            <button className="delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                                <FaTrash /> Delete
                            </button>
                        )}
                    </div>
                </div>

                {showDeleteConfirm && (
                    <div className="confirm-dialog-overlay">
                        <div className="confirm-dialog">
                            <h3>Confirm Deletion</h3>
                            <p>Are you sure you want to delete expense {expense.expenseNumber}? This action cannot be undone.</p>
                            <div className="confirm-buttons">
                                <button className="confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className="confirm-delete" onClick={() => { onDelete(expense.expenseId); setShowDeleteConfirm(false); }}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showDocDeleteConfirm && (
                    <div className="confirm-dialog-overlay">
                        <div className="confirm-dialog">
                            <h3>Confirm Deletion</h3>
                            <p>Are you sure you want to delete this document? This action cannot be undone.</p>
                            <div className="confirm-buttons">
                                <button className="confirm-cancel" onClick={() => setShowDocDeleteConfirm(false)}>Cancel</button>
                                <button
                                    className="confirm-delete"
                                    onClick={() => {
                                        handleDeleteDocument(expense.expenseId);
                                        setEditedExpense(prev => ({ ...prev, document: null }));
                                        setShowDocDeleteConfirm(false);
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ============================================
    // INITIAL VALUES FOR FORM
    // ============================================
    const initialValues = {
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        amount: '',
        paymentMode: 'Cash',
        paymentStatus: 'Paid'
    };

    // ============================================
    // VALIDATION SCHEMA
    // ============================================
    const validationSchema = Yup.object({
        date: Yup.string().required("Date is required"),
        title: Yup.string().required("Title is required").min(2, "Title must be at least 2 characters"),
        amount: Yup.number()
            .required("Amount is required")
            .min(1, "Amount must be greater than 0"),
        paymentMode: Yup.string().required("Payment mode is required"),
        paymentStatus: Yup.string().required("Payment status is required")
    });

    // ============================================
    // MAIN RENDER
    // ============================================
    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="expense-main">
                <div className="page-header">
                    <div className="left-section">
                        <h2><FaMoneyBillWave /> Expense Management</h2>
                        <span className="total-count">Total: {totalItems} expenses</span>
                    </div>
                    <div className="right-section">
                        <button className="export-btn" onClick={handleExportExcel}>
                            <FaFileExcel /> Export
                        </button>
                        <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                            <FaPlus /> {showForm ? "Close" : "Add Expense"}
                        </button>
                    </div>
                </div>

                {/* ===== SUMMARY CARDS - UPDATED WITH CHEQUE ===== */}
                <div className="summary-cards">
                    <div className="summary-card total">
                        <span className="summary-label">Total Expenses</span>
                        <span className="summary-value">{formatCurrency(summary.totalExpenses)}</span>
                        <span className="summary-sub">{summary.totalCount} transactions</span>
                    </div>
                    <div className="summary-card cash">
                        <span className="summary-label">Cash</span>
                        <span className="summary-value">
                            {formatCurrency(summary.byPaymentMode?.find(m => m._id === 'Cash')?.total || 0)}
                        </span>
                    </div>
                    <div className="summary-card bank">
                        <span className="summary-label">Bank</span>
                        <span className="summary-value">
                            {formatCurrency(summary.byPaymentMode?.find(m => m._id === 'Bank')?.total || 0)}
                        </span>
                    </div>
                    <div className="summary-card cheque">
                        <span className="summary-label">Cheque</span>
                        <span className="summary-value">
                            {formatCurrency(summary.byPaymentMode?.find(m => m._id === 'Cheque')?.total || 0)}
                        </span>
                    </div>
                    <div className="summary-card upi">
                        <span className="summary-label">UPI</span>
                        <span className="summary-value">
                            {formatCurrency(summary.byPaymentMode?.find(m => m._id === 'UPI')?.total || 0)}
                        </span>
                    </div>
                </div>

                {/* ===== FILTERS ===== */}
                <div className="expense-filters-section">
                    <div className="search-container">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by title, description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="expense-filter-group">
                        <select
                            value={filterPaymentMode}
                            onChange={(e) => setFilterPaymentMode(e.target.value)}
                        >
                            <option value="">All Modes</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank">Bank</option>
                            <option value="Cheque">Cheque</option>
                            <option value="UPI">UPI</option>
                        </select>
                        <select
                            value={filterPaymentStatus}
                            onChange={(e) => setFilterPaymentStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Partial">Partial</option>
                        </select>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            placeholder="Start Date"
                        />
                        <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            placeholder="End Date"
                        />
                        <button
                            className="clear-filters"
                            onClick={() => {
                                setFilterPaymentMode('');
                                setFilterPaymentStatus('');
                                setFilterStartDate('');
                                setFilterEndDate('');
                                setSearchTerm('');
                            }}
                        >
                            <FaTimes /> Clear
                        </button>
                    </div>
                </div>

                {/* ===== ADD EXPENSE FORM ===== */}
                {showForm && (
                    <div className="form-container premium">
                        <h2>Add Expense</h2>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleCreateExpense}
                        >
                            {({ values }) => (
                                <Form>
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label><FaCalendarAlt /> Date *</label>
                                            <Field name="date" type="date" />
                                            <ErrorMessage name="date" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label>Title *</label>
                                            <Field name="title" type="text" placeholder="Enter expense title" />
                                            <ErrorMessage name="title" component="div" className="error" />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-field">
                                            <label>Description</label>
                                            <Field name="description" as="textarea" rows="2" placeholder="Optional description" />
                                            <ErrorMessage name="description" component="div" className="error" />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-field">
                                            <label><FaRupeeSign /> Amount *</label>
                                            <Field name="amount" type="number" placeholder="Enter amount" min="0" />
                                            <ErrorMessage name="amount" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label><FaCreditCard /> Payment Mode *</label>
                                            <Field as="select" name="paymentMode">
                                                <option value="Cash">Cash</option>
                                                <option value="Bank">Bank</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="UPI">UPI</option>
                                            </Field>
                                            <ErrorMessage name="paymentMode" component="div" className="error" />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-field">
                                            <label>Payment Status</label>
                                            <Field as="select" name="paymentStatus">
                                                <option value="Paid">Paid</option>
                                                <option value="Unpaid">Unpaid</option>
                                                <option value="Partial">Partial</option>
                                            </Field>
                                            <ErrorMessage name="paymentStatus" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label><FaUpload /> Document (Optional)</label>
                                            <div className="file-upload-area">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                                                    onChange={handleFileChange}
                                                    style={{ display: 'none' }}
                                                />
                                                <button
                                                    type="button"
                                                    className="upload-btn"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <FaUpload /> Choose File
                                                </button>
                                                {uploadedFile && (
                                                    <div className="file-preview">
                                                        {uploadedFilePreview ? (
                                                            <img src={uploadedFilePreview} alt="Preview" className="preview-image" />
                                                        ) : (
                                                            <div className="file-info">
                                                                <FaFilePdf /> {uploadedFile.name}
                                                            </div>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="remove-file-btn"
                                                            onClick={handleRemoveFile}
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                )}
                                                <small className="field-hint">Allowed: PDF, JPG, PNG, GIF, WEBP (Max 5MB)</small>
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isFormSubmitting}>
                                        {isFormSubmitting ? (
                                            <>
                                                <div className="loading-spinner small"></div>
                                                Creating...
                                            </>
                                        ) : (
                                            "Add Expense"
                                        )}
                                    </button>
                                </Form>
                            )}
                        </Formik>
                    </div>
                )}

                {/* ===== EXPENSES TABLE ===== */}
                <div className="data-table">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner large"></div>
                            <p>Loading expenses...</p>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="empty-state">
                            <FaMoneyBillWave className="empty-icon" />
                            <p>No expenses found</p>
                            <small>Add your first expense to track spending</small>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Title</th>
                                    <th>Amount</th>
                                    <th>Payment</th>
                                    <th>Status</th>
                                    <th>Doc</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((expense, index) => (
                                    <tr
                                        key={expense.expenseId || index}
                                        className={selectedExpense === expense.expenseId ? "selected" : ""}
                                        onClick={() => setSelectedExpense(expense.expenseId)}
                                    >
                                        <td>{expense.expenseNumber}</td>
                                        <td>{formatDate(expense.date)}</td>
                                        <td><strong>{expense.title}</strong></td>
                                        <td className="amount-cell">{formatCurrency(expense.amount)}</td>
                                        <td>{getPaymentModeIcon(expense.paymentMode)} {expense.paymentMode}</td>
                                        <td>{getPaymentStatusBadge(expense.paymentStatus)}</td>
                                        <td>
                                            {expense.document ? (
                                                <a
                                                    href={getFileUrl(expense.document.fileUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="doc-link"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {getDocumentIcon(expense.document.fileType)}
                                                </a>
                                            ) : (
                                                <span className="no-doc">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ===== PAGINATION ===== */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            className="page-btn"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <FaChevronLeft />
                        </button>
                        <span className="page-info">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="page-btn"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                )}

                {/* ===== EXPENSE MODAL ===== */}
                {selectedExpense && (
                    <ExpenseModal
                        expense={expenses.find(e => e.expenseId === selectedExpense)}
                        onClose={() => setSelectedExpense(null)}
                        onUpdate={handleUpdateExpense}
                        onDelete={handleDeleteExpense}
                    />
                )}
            </div>
        </Navbar>
    );
};

export default Expense;