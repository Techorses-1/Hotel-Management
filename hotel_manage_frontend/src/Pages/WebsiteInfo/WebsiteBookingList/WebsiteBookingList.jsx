// Pages/WebsiteBooking/WebsiteBookingList.jsx
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
    FaSearch,
    FaEye,
    FaEdit,
    FaTrash,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaCalendarAlt,
    FaUser,
    FaPhone,
    FaEnvelope,
    FaSync,
} from "react-icons/fa";
import { TbMessages } from "react-icons/tb";
import Navbar from "../../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./WebsiteBookingList.scss";

const WebsiteBookingList = () => {
    const [bookings, setBookings] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [summary, setSummary] = useState({
        total: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
        today: 0,
    });

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
        fetchBookings();
        fetchStats();
    }, [debouncedSearch, filterStatus, filterStartDate, filterEndDate, currentPage]);

    // ============================================
    // API CALLS
    // ============================================
    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            const url = new URL(`${API_BASE_URL}/website-booking/get-website-bookings`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', 20);
            if (debouncedSearch) url.searchParams.append('search', debouncedSearch);
            if (filterStatus && filterStatus !== 'all') url.searchParams.append('status', filterStatus);
            if (filterStartDate) url.searchParams.append('startDate', filterStartDate);
            if (filterEndDate) url.searchParams.append('endDate', filterEndDate);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setBookings(data.data || []);
                setTotalPages(data.pagination?.totalPages || 1);
                setTotalItems(data.pagination?.total || 0);
            } else {
                throw new Error(data.message || 'Failed to fetch bookings');
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
            toast.error("Failed to fetch bookings");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/website-booking/get-website-booking-stats`,
                { credentials: 'include' }
            );
            const data = await response.json();

            if (data.success) {
                setSummary({
                    total: data.data.total || 0,
                    pending: data.data.byStatus?.Pending || 0,
                    confirmed: data.data.byStatus?.Confirmed || 0,
                    cancelled: data.data.byStatus?.Cancelled || 0,
                    completed: data.data.byStatus?.Completed || 0,
                    today: data.data.today || 0,
                });
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const handleUpdateStatus = async (bookingId, status, adminNotes) => {
        try {
            setIsSubmitting(true);
            const response = await fetch(
                `${API_BASE_URL}/website-booking/update-website-booking/${bookingId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status, adminNotes }),
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update booking");
            }

            toast.success(`Booking status updated to ${status}!`);
            fetchBookings();
            fetchStats();
            setShowBookingModal(false);
            setEditingBooking(null);
        } catch (error) {
            console.error("Error updating booking:", error);
            toast.error(error.message || "Error updating booking");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        if (!window.confirm("Are you sure you want to delete this booking?")) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/website-booking/delete-website-booking/${bookingId}`,
                {
                    method: "DELETE",
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete booking");
            }

            toast.success("Booking deleted successfully!");
            setSelectedBooking(null);
            fetchBookings();
            fetchStats();
        } catch (error) {
            console.error("Error deleting booking:", error);
            toast.error(error.message || "Error deleting booking");
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (date) => {
        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending':
                return <span className="wbl-status-badge wbl-status-pending">⏳ Pending</span>;
            case 'Completed':
                return <span className="wbl-status-badge wbl-status-completed">✅ Completed</span>;
            case 'Cancelled':
                return <span className="wbl-status-badge wbl-status-cancelled">❌ Cancelled</span>;
            default:
                return <span className="wbl-status-badge">{status}</span>;
        }
    };

    // ============================================
    // BOOKING MODAL
    // ============================================
    const BookingModal = ({ booking, onClose, onUpdate, onDelete }) => {
        const [status, setStatus] = useState(booking?.status || 'Pending');
        const [adminNotes, setAdminNotes] = useState(booking?.adminNotes || '');
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [isUpdating, setIsUpdating] = useState(false);

        useEffect(() => {
            document.body.style.overflow = 'hidden';
            return () => document.body.style.overflow = 'auto';
        }, []);

        if (!booking) return null;

        const handleSave = async () => {
            setIsUpdating(true);
            await onUpdate(booking.bookingId, status, adminNotes);
            setIsUpdating(false);
        };

        return (
            <div className="wbl-modal-overlay" onClick={onClose}>
                <div className="wbl-modal-content wbl-modal-lg" onClick={e => e.stopPropagation()}>
                    <div className="wbl-modal-header">
                        <div className="wbl-modal-title">
                            Booking: {booking.bookingNumber}
                        </div>
                        <button className="wbl-modal-close" onClick={onClose}><FaTimes /></button>
                    </div>
                    <div className="wbl-modal-body">
                        <div className="wbl-details-grid">
                            <div className="wbl-detail-row">
                                <span className="wbl-detail-label">Booking #</span>
                                <span className="wbl-detail-value"><strong>{booking.bookingNumber}</strong></span>
                            </div>
                            <div className="wbl-detail-row">
                                <span className="wbl-detail-label"><FaUser /> Guest Name</span>
                                <span className="wbl-detail-value"><strong>{booking.name}</strong></span>
                            </div>
                            <div className="wbl-detail-row">
                                <span className="wbl-detail-label"><FaPhone /> Phone</span>
                                <span className="wbl-detail-value">{booking.phone}</span>
                            </div>
                            <div className="wbl-detail-row">
                                <span className="wbl-detail-label"><FaEnvelope /> Email</span>
                                <span className="wbl-detail-value">{booking.email}</span>
                            </div>
                            <div className="wbl-detail-row">
                                <span className="wbl-detail-label"><FaCalendarAlt /> Booking Date</span>
                                <span className="wbl-detail-value">{formatDateTime(booking.bookingDate)}</span>
                            </div>
                            <div className="wbl-detail-row">
                                <span className="wbl-detail-label">Status</span>
                                <span className="wbl-detail-value">
                                    <select
                                        className="wbl-edit-input"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </span>
                            </div>
                            <div className="wbl-detail-row">
                                <span className="wbl-detail-label">Admin Notes</span>
                                <span className="wbl-detail-value">
                                    <textarea
                                        className="wbl-edit-textarea"
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Add notes about this booking..."
                                        rows="3"
                                    />
                                </span>
                            </div>
                            <div className="wbl-detail-row">
                                <span className="wbl-detail-label">Submitted</span>
                                <span className="wbl-detail-value">{formatDateTime(booking.createdAt)}</span>
                            </div>
                            {booking.updatedAt && booking.updatedAt !== booking.createdAt && (
                                <div className="wbl-detail-row">
                                    <span className="wbl-detail-label">Last Updated</span>
                                    <span className="wbl-detail-value">{formatDateTime(booking.updatedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="wbl-modal-footer">
                        <button
                            className="wbl-update-btn"
                            onClick={handleSave}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <>
                                    <div className="wbl-loading-spinner wbl-small"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FaEdit /> Update Status
                                </>
                            )}
                        </button>
                        <button className="wbl-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                            <FaTrash /> Delete
                        </button>
                    </div>
                </div>

                {showDeleteConfirm && (
                    <div className="wbl-confirm-dialog-overlay">
                        <div className="wbl-confirm-dialog">
                            <h3>Confirm Deletion</h3>
                            <p>Are you sure you want to delete booking {booking.bookingNumber}? This action cannot be undone.</p>
                            <div className="wbl-confirm-buttons">
                                <button className="wbl-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className="wbl-confirm-delete" onClick={() => { onDelete(booking.bookingId); setShowDeleteConfirm(false); }}>
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
    // MAIN RENDER
    // ============================================
    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="wbl-main-container">
                <div className="wbl-page-header">
                    <div className="wbl-left-section">
                        <h2><TbMessages /> Website Bookings</h2>
                        <span className="wbl-total-count">Total: {totalItems} bookings</span>
                    </div>
                    <div className="wbl-right-section">
                        <button className="wbl-refresh-btn" onClick={() => { fetchBookings(); fetchStats(); }}>
                            <FaSync /> Refresh
                        </button>
                    </div>
                </div>

                {/* ===== SUMMARY CARDS ===== */}
                <div className="wbl-summary-cards">
                    <div className="wbl-summary-card wbl-total">
                        <span className="wbl-summary-label">Total Bookings</span>
                        <span className="wbl-summary-value">{summary.total}</span>
                    </div>
                    <div className="wbl-summary-card wbl-pending">
                        <span className="wbl-summary-label">⏳ Pending</span>
                        <span className="wbl-summary-value">{summary.pending}</span>
                    </div>
                    <div className="wbl-summary-card wbl-confirmed">
                        <span className="wbl-summary-label">✅ Confirmed</span>
                        <span className="wbl-summary-value">{summary.confirmed}</span>
                    </div>
                    <div className="wbl-summary-card wbl-today">
                        <span className="wbl-summary-label">📅 Today</span>
                        <span className="wbl-summary-value">{summary.today}</span>
                    </div>
                </div>

                {/* ===== FILTERS ===== */}
                <div className="wbl-filters-section">
                    <div className="wbl-search-container">
                        <FaSearch className="wbl-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="wbl-filter-group">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
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
                            className="wbl-clear-filters"
                            onClick={() => {
                                setFilterStatus('');
                                setFilterStartDate('');
                                setFilterEndDate('');
                                setSearchTerm('');
                            }}
                        >
                            <FaTimes /> Clear
                        </button>
                    </div>
                </div>

                {/* ===== BOOKINGS TABLE ===== */}
                <div className="wbl-data-table">
                    {isLoading ? (
                        <div className="wbl-loading-container">
                            <div className="wbl-loading-spinner wbl-large"></div>
                            <p>Loading bookings...</p>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="wbl-empty-state">
                            <TbMessages className="wbl-empty-icon" />
                            <p>No bookings found</p>
                            <small>Website bookings will appear here</small>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((booking) => (
                                    <tr
                                        key={booking.bookingId}
                                        className={selectedBooking === booking.bookingId ? "wbl-selected" : ""}
                                        onClick={() => {
                                            setSelectedBooking(booking.bookingId);
                                            setEditingBooking(booking);
                                            setShowBookingModal(true);
                                        }}
                                    >
                                        <td>{booking.bookingNumber}</td>
                                        <td>{formatDate(booking.bookingDate)}</td>
                                        <td><strong>{booking.name}</strong></td>
                                        <td>{booking.phone}</td>
                                        <td>{booking.email}</td>
                                        <td>{getStatusBadge(booking.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ===== PAGINATION ===== */}
                {totalPages > 1 && (
                    <div className="wbl-pagination">
                        <button
                            className="wbl-page-btn"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <FaChevronLeft />
                        </button>
                        <span className="wbl-page-info">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="wbl-page-btn"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                )}

                {/* ===== BOOKING MODAL ===== */}
                {showBookingModal && editingBooking && (
                    <BookingModal
                        booking={editingBooking}
                        onClose={() => {
                            setShowBookingModal(false);
                            setEditingBooking(null);
                            setSelectedBooking(null);
                        }}
                        onUpdate={handleUpdateStatus}
                        onDelete={handleDeleteBooking}
                    />
                )}
            </div>
        </Navbar>
    );
};

export default WebsiteBookingList;