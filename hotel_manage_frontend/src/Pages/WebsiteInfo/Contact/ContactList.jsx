// Pages/Contact/ContactList.jsx
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
    FaEnvelope,
    FaSync,
    FaReply,
} from "react-icons/fa";
import { TbMessages } from "react-icons/tb";
import { HiOutlineMail } from "react-icons/hi";
import Navbar from "../../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./ContactList.scss";

const ContactList = () => {
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterIsRead, setFilterIsRead] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [showContactModal, setShowContactModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [summary, setSummary] = useState({
        total: 0,
        pending: 0,
        read: 0,
        unread: 0,
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
        fetchContacts();
        fetchStats();
    }, [debouncedSearch, filterStatus, filterIsRead, filterStartDate, filterEndDate, currentPage]);

    // ============================================
    // API CALLS
    // ============================================
    const fetchContacts = async () => {
        try {
            setIsLoading(true);
            const url = new URL(`${API_BASE_URL}/contact/get-contacts`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', 20);
            if (debouncedSearch) url.searchParams.append('search', debouncedSearch);
            if (filterStatus && filterStatus !== 'all') url.searchParams.append('status', filterStatus);
            if (filterIsRead !== '') url.searchParams.append('isRead', filterIsRead);
            if (filterStartDate) url.searchParams.append('startDate', filterStartDate);
            if (filterEndDate) url.searchParams.append('endDate', filterEndDate);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setContacts(data.data || []);
                setTotalPages(data.pagination?.totalPages || 1);
                setTotalItems(data.pagination?.total || 0);
            } else {
                throw new Error(data.message || 'Failed to fetch contacts');
            }
        } catch (error) {
            console.error("Error fetching contacts:", error);
            toast.error("Failed to fetch contacts");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/contact/get-contact-stats`,
                { credentials: 'include' }
            );
            const data = await response.json();

            if (data.success) {
                setSummary({
                    total: data.data.total || 0,
                    pending: data.data.pending || 0,
                    read: data.data.read || 0,
                    unread: data.data.unread || 0,
                    today: data.data.today || 0,
                });
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const handleUpdateStatus = async (contactId, status, adminNotes) => {
        try {
            setIsSubmitting(true);
            const response = await fetch(
                `${API_BASE_URL}/contact/update-contact/${contactId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status, adminNotes }),
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to update contact");
            }

            toast.success(`Contact status updated to ${status}!`);
            fetchContacts();
            fetchStats();
            setShowContactModal(false);
            setEditingContact(null);
        } catch (error) {
            console.error("Error updating contact:", error);
            toast.error(error.message || "Error updating contact");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteContact = async (contactId) => {
        if (!window.confirm("Are you sure you want to delete this contact message?")) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/contact/delete-contact/${contactId}`,
                {
                    method: "DELETE",
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete contact");
            }

            toast.success("Contact deleted successfully!");
            setSelectedContact(null);
            fetchContacts();
            fetchStats();
        } catch (error) {
            console.error("Error deleting contact:", error);
            toast.error(error.message || "Error deleting contact");
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
                return <span className="cl-status-badge cl-status-pending">⏳ Pending</span>;
            case 'Read':
                return <span className="cl-status-badge cl-status-read">📖 Read</span>;
            case 'Replied':
                return <span className="cl-status-badge cl-status-replied">✉️ Replied</span>;
            default:
                return <span className="cl-status-badge">{status}</span>;
        }
    };

    const getReadBadge = (isRead) => {
        return isRead ? (
            <span className="cl-read-badge cl-read-true">✅ Read</span>
        ) : (
            <span className="cl-read-badge cl-read-false">🔴 Unread</span>
        );
    };

    // ============================================
    // CONTACT MODAL
    // ============================================
    const ContactModal = ({ contact, onClose, onUpdate, onDelete }) => {
        const [status, setStatus] = useState(contact?.status || 'Pending');
        const [adminNotes, setAdminNotes] = useState(contact?.adminNotes || '');
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [isUpdating, setIsUpdating] = useState(false);

        useEffect(() => {
            document.body.style.overflow = 'hidden';
            return () => document.body.style.overflow = 'auto';
        }, []);

        if (!contact) return null;

        const handleSave = async () => {
            setIsUpdating(true);
            await onUpdate(contact.contactId, status, adminNotes);
            setIsUpdating(false);
        };

        return (
            <div className="cl-modal-overlay" onClick={onClose}>
                <div className="cl-modal-content cl-modal-lg" onClick={e => e.stopPropagation()}>
                    <div className="cl-modal-header">
                        <div className="cl-modal-title">
                            Contact: {contact.subject}
                        </div>
                        <button className="cl-modal-close" onClick={onClose}><FaTimes /></button>
                    </div>
                    <div className="cl-modal-body">
                        <div className="cl-details-grid">
                            <div className="cl-detail-row">
                                <span className="cl-detail-label"><FaUser /> From</span>
                                <span className="cl-detail-value"><strong>{contact.name}</strong></span>
                            </div>
                            <div className="cl-detail-row">
                                <span className="cl-detail-label"><FaEnvelope /> Email</span>
                                <span className="cl-detail-value">
                                    <a href={`mailto:${contact.email}`} className="cl-email-link">
                                        {contact.email}
                                    </a>
                                </span>
                            </div>
                            <div className="cl-detail-row">
                                <span className="cl-detail-label">📝 Subject</span>
                                <span className="cl-detail-value"><strong>{contact.subject}</strong></span>
                            </div>
                            <div className="cl-detail-row">
                                <span className="cl-detail-label">💬 Message</span>
                                <span className="cl-detail-value cl-message-content">{contact.message}</span>
                            </div>
                            <div className="cl-detail-row">
                                <span className="cl-detail-label"><FaCalendarAlt /> Submitted</span>
                                <span className="cl-detail-value">{formatDateTime(contact.submittedAt)}</span>
                            </div>
                            <div className="cl-detail-row">
                                <span className="cl-detail-label">Status</span>
                                <span className="cl-detail-value">
                                    <select
                                        className="cl-edit-input"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Read">Read</option>
                                        <option value="Replied">Replied</option>
                                    </select>
                                </span>
                            </div>
                            <div className="cl-detail-row">
                                <span className="cl-detail-label">Read Status</span>
                                <span className="cl-detail-value">{getReadBadge(contact.isRead)}</span>
                            </div>
                            <div className="cl-detail-row">
                                <span className="cl-detail-label">Admin Notes</span>
                                <span className="cl-detail-value">
                                    <textarea
                                        className="cl-edit-textarea"
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Add notes about this contact..."
                                        rows="3"
                                    />
                                </span>
                            </div>
                            {contact.updatedAt && contact.updatedAt !== contact.createdAt && (
                                <div className="cl-detail-row">
                                    <span className="cl-detail-label">Last Updated</span>
                                    <span className="cl-detail-value">{formatDateTime(contact.updatedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="cl-modal-footer">
                        <a
                            href={`mailto:${contact.email}?subject=Re: ${contact.subject}`}
                            className="cl-reply-btn"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <FaReply /> Reply
                        </a>
                        <button
                            className="cl-update-btn"
                            onClick={handleSave}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <>
                                    <div className="cl-loading-spinner cl-small"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FaEdit /> Update
                                </>
                            )}
                        </button>
                        <button className="cl-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                            <FaTrash /> Delete
                        </button>
                    </div>
                </div>

                {showDeleteConfirm && (
                    <div className="cl-confirm-dialog-overlay">
                        <div className="cl-confirm-dialog">
                            <h3>Confirm Deletion</h3>
                            <p>Are you sure you want to delete this contact message? This action cannot be undone.</p>
                            <div className="cl-confirm-buttons">
                                <button className="cl-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                                <button className="cl-confirm-delete" onClick={() => { onDelete(contact.contactId); setShowDeleteConfirm(false); }}>
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
            <div className="cl-main-container">
                <div className="cl-page-header">
                    <div className="cl-left-section">
                        <h2><TbMessages /> Contact Messages</h2>
                        <span className="cl-total-count">Total: {totalItems} messages</span>
                    </div>
                    <div className="cl-right-section">
                        <button className="cl-refresh-btn" onClick={() => { fetchContacts(); fetchStats(); }}>
                            <FaSync /> Refresh
                        </button>
                    </div>
                </div>

                {/* ===== SUMMARY CARDS ===== */}
                <div className="cl-summary-cards">
                    <div className="cl-summary-card cl-total">
                        <span className="cl-summary-label">Total Messages</span>
                        <span className="cl-summary-value">{summary.total}</span>
                    </div>
                    <div className="cl-summary-card cl-pending">
                        <span className="cl-summary-label">⏳ Pending</span>
                        <span className="cl-summary-value">{summary.pending}</span>
                    </div>
                    <div className="cl-summary-card cl-unread">
                        <span className="cl-summary-label">🔴 Unread</span>
                        <span className="cl-summary-value">{summary.unread}</span>
                    </div>
                    <div className="cl-summary-card cl-today">
                        <span className="cl-summary-label">📅 Today</span>
                        <span className="cl-summary-value">{summary.today}</span>
                    </div>
                </div>

                {/* ===== FILTERS ===== */}
                <div className="cl-filters-section">
                    <div className="cl-search-container">
                        <FaSearch className="cl-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, email, subject..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="cl-filter-group">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Read">Read</option>
                            <option value="Replied">Replied</option>
                        </select>
                        <select
                            value={filterIsRead}
                            onChange={(e) => setFilterIsRead(e.target.value)}
                        >
                            <option value="">All Read Status</option>
                            <option value="true">Read</option>
                            <option value="false">Unread</option>
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
                            className="cl-clear-filters"
                            onClick={() => {
                                setFilterStatus('');
                                setFilterIsRead('');
                                setFilterStartDate('');
                                setFilterEndDate('');
                                setSearchTerm('');
                            }}
                        >
                            <FaTimes /> Clear
                        </button>
                    </div>
                </div>

                {/* ===== CONTACTS TABLE ===== */}
                <div className="cl-data-table">
                    {isLoading ? (
                        <div className="cl-loading-container">
                            <div className="cl-loading-spinner cl-large"></div>
                            <p>Loading contacts...</p>
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="cl-empty-state">
                            <TbMessages className="cl-empty-icon" />
                            <p>No contact messages found</p>
                            <small>Contact form submissions will appear here</small>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Subject</th>
                                    <th>Status</th>
                                    {/* <th>Read</th> */}
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.map((contact) => (
                                    <tr
                                        key={contact.contactId}
                                        className={`${selectedContact === contact.contactId ? "cl-selected" : ""} ${!contact.isRead ? "cl-unread-row" : ""}`}
                                        onClick={() => {
                                            setSelectedContact(contact.contactId);
                                            setEditingContact(contact);
                                            setShowContactModal(true);
                                        }}
                                    >
                                        <td>#{contact.contactId?.slice(0, 8)}</td>
                                        <td>{formatDate(contact.submittedAt)}</td>
                                        <td><strong>{contact.name}</strong></td>
                                        <td>{contact.email}</td>
                                        <td>{contact.subject}</td>
                                        <td>{getStatusBadge(contact.status)}</td>
                                        {/* <td>{getReadBadge(contact.isRead)}</td> */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ===== PAGINATION ===== */}
                {totalPages > 1 && (
                    <div className="cl-pagination">
                        <button
                            className="cl-page-btn"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            <FaChevronLeft />
                        </button>
                        <span className="cl-page-info">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="cl-page-btn"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                )}

                {/* ===== CONTACT MODAL ===== */}
                {showContactModal && editingContact && (
                    <ContactModal
                        contact={editingContact}
                        onClose={() => {
                            setShowContactModal(false);
                            setEditingContact(null);
                            setSelectedContact(null);
                        }}
                        onUpdate={handleUpdateStatus}
                        onDelete={handleDeleteContact}
                    />
                )}
            </div>
        </Navbar>
    );
};

export default ContactList;