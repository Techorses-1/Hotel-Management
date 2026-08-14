import React, { useState, useEffect, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import {
    FaPlus, FaSearch, FaEdit, FaSave, FaTrash, FaTimes,
    FaCheck, FaBan, FaSync, FaEye, FaClock, FaCalendarAlt,
    FaDoorOpen, FaUser, FaPhone, FaEnvelope, FaList,
    FaCheckCircle, FaHourglassHalf, FaExclamationTriangle,
    FaClipboardCheck, FaBed, FaTag, FaUndo
} from "react-icons/fa";
import Navbar from "../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./Housekeeping.scss";

const Housekeeping = () => {
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completingTask, setCompletingTask] = useState(null);
    const [completeNote, setCompleteNote] = useState("");
    const [stats, setStats] = useState({
        pending: 0,
        completed: 0,
        cancelled: 0,
        today: 0
    });

    // ✅ ONLY REVERT CONFIRM - NO CANCEL/DELETE
    const [revertConfirmTask, setRevertConfirmTask] = useState(null);

    // ============================================
    // EFFECTS
    // ============================================
    useEffect(() => {
        window.scrollTo(0, 0);
        fetchTasks();
        fetchStats();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        fetchTasks(debouncedSearch, filterStatus, filterDate);
    }, [debouncedSearch, filterStatus, filterDate]);

    // ============================================
    // API CALLS
    // ============================================
    const fetchTasks = async (search = '', status = '', date = '') => {
        try {
            setIsLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/housekeeping/get-tasks`);
            url.searchParams.append('page', 1);
            url.searchParams.append('limit', 50);
            if (search) url.searchParams.append('search', search);
            if (status) url.searchParams.append('status', status);
            if (date) url.searchParams.append('startDate', date);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setTasks(data.data || []);
            } else {
                throw new Error(data.message || 'Failed to fetch tasks');
            }
        } catch (err) {
            console.error("Error fetching tasks:", err);
            toast.error("Failed to fetch tasks");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/housekeeping/stats`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const handleCompleteTask = async () => {
        if (!completingTask) return;

        try {
            setIsFormSubmitting(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/housekeeping/complete-task/${completingTask.taskId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ note: completeNote }),
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to complete task");
            }

            toast.success(`Room ${completingTask.roomNumber} cleaned successfully!`);
            setShowCompleteModal(false);
            setCompletingTask(null);
            setCompleteNote("");
            fetchTasks(debouncedSearch, filterStatus, filterDate);
            fetchStats();
        } catch (error) {
            console.error("Error completing task:", error);
            toast.error(error.message || "Error completing task");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    // ✅ NEW: REVERT TASK (Undo Completed)
    const handleRevertTask = async (taskId) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/housekeeping/revert-task/${taskId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to revert task");
            }

            toast.success("Task reverted to Pending successfully!");
            setSelectedTask(null);
            fetchTasks(debouncedSearch, filterStatus, filterDate);
            fetchStats();
        } catch (error) {
            console.error("Error reverting task:", error);
            toast.error(error.message || "Error reverting task");
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending':
                return <span className="status-badge status-pending"><FaHourglassHalf /> Pending</span>;
            case 'Completed':
                return <span className="status-badge status-completed"><FaCheckCircle /> Completed</span>;
            case 'Cancelled':
                return <span className="status-badge status-cancelled"><FaBan /> Cancelled</span>;
            default:
                return <span className="status-badge">{status}</span>;
        }
    };

    // ============================================
    // TASK DETAIL MODAL
    // ============================================
    const TaskModal = ({ task, onClose, onComplete, onRevert }) => {
        const [showRevertConfirm, setShowRevertConfirm] = useState(false);

        if (!task) return null;

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">
                            Task: {task.taskNumber}
                        </div>
                        <button className="modal-close" onClick={onClose}><FaTimes /></button>
                    </div>
                    <div className="modal-body">
                        <div className="wo-details-grid">
                            <div className="detail-row">
                                <span className="detail-label">Room</span>
                                <span className="detail-value">{task.roomNumber}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Category</span>
                                <span className="detail-value">{task.categoryName || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Check-out #</span>
                                <span className="detail-value">{task.checkOutNumber}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Guest</span>
                                <span className="detail-value">{task.customerName || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Phone</span>
                                <span className="detail-value">{task.customerPhone || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Status</span>
                                <span className="detail-value">{getStatusBadge(task.status)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Created At</span>
                                <span className="detail-value">{new Date(task.createdAt).toLocaleString()}</span>
                            </div>
                            {task.completedAt && (
                                <div className="detail-row">
                                    <span className="detail-label">Completed At</span>
                                    <span className="detail-value">{new Date(task.completedAt).toLocaleString()}</span>
                                </div>
                            )}
                            {task.completedBy && (
                                <div className="detail-row">
                                    <span className="detail-label">Completed By</span>
                                    <span className="detail-value">{task.completedBy.userName || 'N/A'}</span>
                                </div>
                            )}
                            {task.note && (
                                <div className="detail-row">
                                    <span className="detail-label">Note</span>
                                    <span className="detail-value">{task.note}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        {task.status === 'Pending' && (
                            <button className="update-btn" onClick={() => onComplete(task)}>
                                <FaCheck /> Mark Cleaned
                            </button>
                        )}
                        {task.status === 'Completed' && (
                            <button className="revert-btn" onClick={() => setShowRevertConfirm(true)}>
                                <FaUndo /> Revert to Pending
                            </button>
                        )}
                        <button className="cancel-btn" onClick={onClose}>Close</button>
                    </div>
                </div>

                {showRevertConfirm && (
                    <div className="confirm-dialog-overlay">
                        <div className="confirm-dialog">
                            <h3>Revert Task</h3>
                            <p>
                                Are you sure you want to revert task {task.taskNumber} (Room {task.roomNumber})
                                back to <strong>Pending</strong>?
                            </p>
                            <div className="confirm-buttons">
                                <button className="confirm-cancel" onClick={() => setShowRevertConfirm(false)}>Cancel</button>
                                <button className="confirm-revert" onClick={() => { onRevert(task.taskId); setShowRevertConfirm(false); }}>
                                    Revert to Pending
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ============================================
    // COMPLETE TASK MODAL
    // ============================================
    const CompleteTaskModal = ({ task, onClose, onConfirm, isSubmitting }) => {
        const [note, setNote] = useState('');

        if (!task) return null;

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">
                            <FaCheck /> Mark Room as Cleaned
                        </div>
                        <button className="modal-close" onClick={onClose}><FaTimes /></button>
                    </div>
                    <div className="modal-body">
                        <div className="detail-row">
                            <span className="detail-label">Room</span>
                            <span className="detail-value"><strong>{task.roomNumber}</strong></span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Check-out #</span>
                            <span className="detail-value">{task.checkOutNumber}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Guest</span>
                            <span className="detail-value">{task.customerName || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Note (Optional)</span>
                            <textarea
                                className="edit-textarea"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Add any notes about the cleaning..."
                                rows="3"
                            />
                        </div>
                        <div className="note-hint">
                            <small>Room will be marked as <strong>Available</strong> after cleaning is completed.</small>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="cancel-btn" onClick={onClose}>Cancel</button>
                        <button
                            className="update-btn"
                            onClick={() => onConfirm(note)}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="loading-spinner small"></div>
                                    Processing...
                                </>
                            ) : (
                                <><FaCheck /> Mark as Cleaned</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ============================================
    // MAIN RENDER
    // ============================================
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
                                placeholder="Search by Room, Guest, Check-out #..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filters-group">
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ===== STATS CARDS ===== */}
                <div className="stats-grid">
                    <div className="stat-card stat-pending">
                        <div className="stat-icon"><FaHourglassHalf /></div>
                        <div className="stat-info">
                            <span className="stat-number">{stats.pending}</span>
                            <span className="stat-label">Pending</span>
                        </div>
                    </div>
                    <div className="stat-card stat-completed">
                        <div className="stat-icon"><FaCheckCircle /></div>
                        <div className="stat-info">
                            <span className="stat-number">{stats.completed}</span>
                            <span className="stat-label">Completed</span>
                        </div>
                    </div>
                    <div className="stat-card stat-cancelled">
                        <div className="stat-icon"><FaBan /></div>
                        <div className="stat-info">
                            <span className="stat-number">{stats.cancelled}</span>
                            <span className="stat-label">Cancelled</span>
                        </div>
                    </div>
                    <div className="stat-card stat-today">
                        <div className="stat-icon"><FaCalendarAlt /></div>
                        <div className="stat-info">
                            <span className="stat-number">{stats.today}</span>
                            <span className="stat-label">Today's Tasks</span>
                        </div>
                    </div>
                </div>

                {/* ===== TASKS TABLE ===== */}
                <div className="data-table">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner large"></div>
                            <p>Loading tasks...</p>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="empty-state">
                            <FaClipboardCheck className="empty-icon" />
                            <p>No housekeeping tasks found</p>
                            <small>Tasks are auto-created when a guest checks out</small>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Task #</th>
                                    <th>Room</th>
                                    <th>Guest</th>
                                    <th>Check-out #</th>
                                    <th>Created</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task, index) => (
                                    <tr
                                        key={task.taskId || index}
                                        className={selectedTask === task.taskId ? "selected" : ""}
                                        onClick={() => setSelectedTask(task.taskId)}
                                    >
                                        <td>{task.taskNumber}</td>
                                        <td><strong>{task.roomNumber}</strong></td>
                                        <td>{task.customerName || 'N/A'}</td>
                                        <td>{task.checkOutNumber}</td>
                                        <td>{new Date(task.createdAt).toLocaleDateString()}</td>
                                        <td>{getStatusBadge(task.status)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                {task.status === 'Pending' && (
                                                    <button
                                                        className="action-btn complete-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCompletingTask(task);
                                                            setCompleteNote("");
                                                            setShowCompleteModal(true);
                                                        }}
                                                        title="Mark as Cleaned"
                                                    >
                                                        <FaCheck />
                                                    </button>
                                                )}
                                                {task.status === 'Completed' && (
                                                    <button
                                                        className="action-btn revert-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRevertConfirmTask(task);
                                                        }}
                                                        title="Revert to Pending"
                                                    >
                                                        <FaUndo />
                                                    </button>
                                                )}
                                                <button
                                                    className="action-btn view-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTask(task.taskId);
                                                    }}
                                                    title="View"
                                                >
                                                    <FaEye />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ===== TASK DETAIL MODAL ===== */}
                {selectedTask && (
                    <TaskModal
                        task={tasks.find(t => t.taskId === selectedTask)}
                        onClose={() => setSelectedTask(null)}
                        onComplete={(task) => {
                            setCompletingTask(task);
                            setCompleteNote("");
                            setShowCompleteModal(true);
                            setSelectedTask(null);
                        }}
                        onRevert={handleRevertTask}
                    />
                )}

                {/* ===== COMPLETE TASK MODAL ===== */}
                {showCompleteModal && completingTask && (
                    <CompleteTaskModal
                        task={completingTask}
                        onClose={() => {
                            setShowCompleteModal(false);
                            setCompletingTask(null);
                            setCompleteNote("");
                        }}
                        onConfirm={(note) => {
                            setCompleteNote(note);
                            handleCompleteTask();
                        }}
                        isSubmitting={isFormSubmitting}
                    />
                )}

                {/* ===== REVERT CONFIRM ===== */}
                {revertConfirmTask && (
                    <div className="confirm-dialog-overlay">
                        <div className="confirm-dialog">
                            <h3>Revert Task</h3>
                            <p>
                                Are you sure you want to revert task {revertConfirmTask.taskNumber} (Room {revertConfirmTask.roomNumber})
                                back to <strong>Pending</strong>?
                            </p>
                            <div className="confirm-buttons">
                                <button className="confirm-cancel" onClick={() => setRevertConfirmTask(null)}>
                                    Cancel
                                </button>
                                <button
                                    className="confirm-revert"
                                    onClick={() => {
                                        handleRevertTask(revertConfirmTask.taskId);
                                        setRevertConfirmTask(null);
                                    }}
                                >
                                    Revert to Pending
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Navbar>
    );
};

export default Housekeeping;