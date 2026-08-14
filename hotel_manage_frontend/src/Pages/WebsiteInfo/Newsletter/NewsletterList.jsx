// Pages/Newsletter/NewsletterList.jsx
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
    FaSearch,
    FaTrash,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaCalendarAlt,
    FaEnvelope,
    FaSync,
    FaUserCheck,
    FaUserTimes,
} from "react-icons/fa";
import { HiOutlineMail } from "react-icons/hi";
import Navbar from "../../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./NewsletterList.scss";

const NewsletterList = () => {
    const [subscribers, setSubscribers] = useState([]);
    const [selectedSubscriber, setSelectedSubscriber] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterActive, setFilterActive] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingSubscriber, setDeletingSubscriber] = useState(null);
    const [summary, setSummary] = useState({
        total: 0,
        active: 0,
        inactive: 0,
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
        fetchSubscribers();
        fetchStats();
    }, [debouncedSearch, filterActive, currentPage]);

    // ============================================
    // API CALLS
    // ============================================
    const fetchSubscribers = async () => {
        try {
            setIsLoading(true);
            const url = new URL(`${API_BASE_URL}/newsletter/subscribers`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', 20);
            if (debouncedSearch) url.searchParams.append('search', debouncedSearch);
            if (filterActive !== '') url.searchParams.append('isActive', filterActive);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setSubscribers(data.data || []);
                setTotalPages(data.pagination?.totalPages || 1);
                setTotalItems(data.pagination?.total || 0);
            } else {
                throw new Error(data.message || 'Failed to fetch subscribers');
            }
        } catch (error) {
            console.error("Error fetching subscribers:", error);
            toast.error("Failed to fetch subscribers");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/newsletter/subscriber-count`,
                { credentials: 'include' }
            );
            const data = await response.json();

            if (data.success) {
                setSummary({
                    total: data.data.total || 0,
                    active: data.data.active || 0,
                    inactive: data.data.inactive || 0,
                    today: data.data.today || 0,
                });
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const handleDeleteSubscriber = async (email) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/newsletter/unsubscribe`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to unsubscribe");
            }

            toast.success(`Successfully unsubscribed ${email}`);
            setShowDeleteConfirm(false);
            setDeletingSubscriber(null);
            fetchSubscribers();
            fetchStats();
        } catch (error) {
            console.error("Error unsubscribing:", error);
            toast.error(error.message || "Error unsubscribing");
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getStatusBadge = (isActive) => {
        return isActive ? (
            <span className="nl-status-badge nl-status-active"><FaUserCheck /> Active</span>
        ) : (
            <span className="nl-status-badge nl-status-inactive"><FaUserTimes /> Inactive</span>
        );
    };

    // ============================================
    // MAIN RENDER
    // ============================================
    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="nl-main-container">
                <div className="nl-page-header">
                    <div className="nl-left-section">
                        <h2><HiOutlineMail /> Newsletter Subscribers</h2>
                        <span className="nl-total-count">Total: {totalItems} subscribers</span>
                    </div>
                    <div className="nl-right-section">
                        <button className="nl-refresh-btn" onClick={() => { fetchSubscribers(); fetchStats(); }}>
                            <FaSync /> Refresh
                        </button>
                    </div>
                </div>

                {/* ===== SUMMARY CARDS ===== */}
                <div className="nl-summary-cards">
                    <div className="nl-summary-card nl-total">
                        <span className="nl-summary-label">Total Subscribers</span>
                        <span className="nl-summary-value">{summary.total}</span>
                    </div>
                    <div className="nl-summary-card nl-active">
                        <span className="nl-summary-label"><FaUserCheck /> Active</span>
                        <span className="nl-summary-value">{summary.active}</span>
                    </div>
                    <div className="nl-summary-card nl-inactive">
                        <span className="nl-summary-label"><FaUserTimes /> Inactive</span>
                        <span className="nl-summary-value">{summary.inactive}</span>
                    </div>
                    <div className="nl-summary-card nl-today">
                        <span className="nl-summary-label">📅 Today</span>
                        <span className="nl-summary-value">{summary.today}</span>
                    </div>
                </div>

                {/* ===== FILTERS ===== */}
                <div className="nl-filters-section">
                    <div className="nl-search-container">
                        <FaSearch className="nl-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="nl-filter-group">
                        <select
                            value={filterActive}
                            onChange={(e) => setFilterActive(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                        <button
                            className="nl-clear-filters"
                            onClick={() => {
                                setFilterActive('');
                                setSearchTerm('');
                            }}
                        >
                            <FaTimes /> Clear
                        </button>
                    </div>
                </div>

                {/* ===== SUBSCRIBERS TABLE ===== */}
                <div className="nl-data-table">
                    {isLoading ? (
                        <div className="nl-loading-container">
                            <div className="nl-loading-spinner nl-large"></div>
                            <p>Loading subscribers...</p>
                        </div>
                    ) : subscribers.length === 0 ? (
                        <div className="nl-empty-state">
                            <HiOutlineMail className="nl-empty-icon" />
                            <p>No subscribers found</p>
                            <small>Newsletter subscribers will appear here</small>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Email</th>
                                    <th>Subscribed Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscribers.map((subscriber) => (
                                    <tr
                                        key={subscriber.subscriptionId || subscriber._id}
                                        className={selectedSubscriber === subscriber._id ? "nl-selected" : ""}
                                    >
                                        <td>#{subscriber.subscriptionId?.slice(0, 8) || 'N/A'}</td>
                                        <td>
                                            <strong>
                                                <FaEnvelope className="nl-email-icon" /> {subscriber.email}
                                            </strong>
                                        </td>
                                        <td>{formatDate(subscriber.subscribedAt)}</td>
                                        <td>{getStatusBadge(subscriber.isActive)}</td>
                                        <td>
                                            <button
                                                className="nl-action-btn nl-delete-btn-sm"
                                                onClick={() => {
                                                    setDeletingSubscriber(subscriber);
                                                    setShowDeleteConfirm(true);
                                                }}
                                                title="Unsubscribe"
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ===== PAGINATION ===== */}
                {totalPages > 1 && (
                    <div className="nl-pagination">
                        <button
                            className="nl-page-btn"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <FaChevronLeft />
                        </button>
                        <span className="nl-page-info">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="nl-page-btn"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                )}

                {/* ===== DELETE CONFIRMATION MODAL ===== */}
                {showDeleteConfirm && deletingSubscriber && (
                    <div className="nl-confirm-dialog-overlay">
                        <div className="nl-confirm-dialog">
                            <h3>Confirm Unsubscribe</h3>
                            <p>
                                Are you sure you want to unsubscribe <strong>{deletingSubscriber.email}</strong>?
                                <br />
                                <span style={{ fontSize: '13px', color: '#888' }}>
                                    They will no longer receive newsletter emails.
                                </span>
                            </p>
                            <div className="nl-confirm-buttons">
                                <button
                                    className="nl-confirm-cancel"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeletingSubscriber(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="nl-confirm-delete"
                                    onClick={() => handleDeleteSubscriber(deletingSubscriber.email)}
                                >
                                    Unsubscribe
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Navbar>
    );
};

export default NewsletterList;