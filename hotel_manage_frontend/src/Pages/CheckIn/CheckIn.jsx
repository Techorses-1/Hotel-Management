import React, { useState, useEffect, useRef } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import {
    FaPlus, FaSearch, FaEdit, FaSave, FaTrash, FaTimes,
    FaUser, FaPhone, FaEnvelope, FaCalendarAlt, FaClock,
    FaDoorOpen, FaMoneyBillWave, FaCreditCard, FaFileInvoice,
    FaUpload, FaDownload, FaPrint, FaEye, FaCheck, FaHourglassHalf,
    FaBed, FaTag, FaList, FaArrowRight, FaArrowLeft, FaSync,
    FaIdCard, FaFileAlt, FaCalculator, FaRupeeSign, FaPlusCircle,
    FaMinusCircle, FaImage, FaExclamationTriangle, FaBook,
    FaWhatsapp, FaFilePdf, FaChevronLeft, FaChevronRight, FaFileExcel,
    FaUserPlus, FaExchangeAlt, FaTrashAlt, FaPlusSquare, FaUniversity, FaBuilding,
    FaMoon
} from "react-icons/fa";
import html2pdf from "html2pdf.js";
import * as XLSX from 'xlsx';
import Navbar from "../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./CheckIn.scss";
import CheckInPrint from "./CheckInPrint";

// ============================================
// MODULE-LEVEL CONSTANTS
// ============================================
const idProofLabels = ['Aadhar Card', 'Passport', 'Driving License', 'Voter ID', 'PAN Card', 'Other'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank', 'Cheque'];

// ============================================
// ADD CUSTOMER MODAL
// ============================================
const AddCustomerModal = ({ show, onClose, onSave, isSubmitting }) => {
    const [localData, setLocalData] = useState({
        customerName: '',
        contactNumber: '',
        email: ''
    });

    useEffect(() => {
        if (show) {
            setLocalData({
                customerName: '',
                contactNumber: '',
                email: ''
            });
        }
    }, [show]);

    if (!show) return null;

    return (
        <div className="ckin-modal-overlay" onClick={onClose}>
            <div className="ckin-modal-content" onClick={e => e.stopPropagation()}>
                <div className="ckin-modal-header">
                    <div className="ckin-modal-title">
                        <FaUserPlus /> Add New Customer
                    </div>
                    <button className="ckin-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="ckin-modal-body">
                    <div className="ckin-details-grid">
                        <div className="ckin-detail-row">
                            <span className="ckin-detail-label">Customer Name *</span>
                            <input
                                type="text"
                                className="ckin-edit-input"
                                value={localData.customerName}
                                onChange={(e) => setLocalData({ ...localData, customerName: e.target.value })}
                                placeholder="Enter full name"
                                autoFocus
                            />
                        </div>
                        <div className="ckin-detail-row">
                            <span className="ckin-detail-label">Phone Number *</span>
                            <input
                                type="text"
                                className="ckin-edit-input"
                                value={localData.contactNumber}
                                onChange={(e) => setLocalData({ ...localData, contactNumber: e.target.value })}
                                placeholder="Enter 10 digit number"
                            />
                        </div>
                        <div className="ckin-detail-row">
                            <span className="ckin-detail-label">Email (Optional)</span>
                            <input
                                type="email"
                                className="ckin-edit-input"
                                value={localData.email}
                                onChange={(e) => setLocalData({ ...localData, email: e.target.value })}
                                placeholder="Enter email address"
                            />
                        </div>
                    </div>
                </div>
                <div className="ckin-modal-footer">
                    <button className="ckin-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="ckin-update-btn"
                        onClick={() => onSave(localData)}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="ckin-loading-spinner small"></div>
                                Saving...
                            </>
                        ) : (
                            <><FaSave /> Save Customer</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// CHECKOUT MODAL
// ============================================
const CheckoutModal = ({ checkIn, onClose, onCheckout, isSubmitting }) => {
    const [paymentStatus, setPaymentStatus] = useState('Paid');
    const [amountPaid, setAmountPaid] = useState(checkIn?.grandTotal || 0);
    const [notes, setNotes] = useState('');

    if (!checkIn) return null;

    return (
        <div className="ckin-modal-overlay" onClick={onClose}>
            <div className="ckin-modal-content" onClick={e => e.stopPropagation()}>
                <div className="ckin-modal-header">
                    <div className="ckin-modal-title">Check-out</div>
                    <button className="ckin-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="ckin-modal-body">
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Guest</span>
                        <span className="ckin-detail-value">{checkIn.customerName}</span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Rooms</span>
                        <span className="ckin-detail-value">
                            {checkIn.roomDetails?.map(r => r.roomNumber).join(', ') || checkIn.roomNumber}
                        </span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Check-in</span>
                        <span className="ckin-detail-value">{new Date(checkIn.checkInDate).toLocaleString()}</span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Check-out</span>
                        <span className="ckin-detail-value">{new Date(checkIn.checkOutDate).toLocaleString()}</span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Grand Total</span>
                        <span className="ckin-detail-value ckin-grand-total-value">
                            ₹{(checkIn.grandTotal || 0).toFixed(2)}
                        </span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Balance</span>
                        <span className={`ckin-detail-value ckin-balance-value ${checkIn.balanceAmount > 0 ? 'ckin-balance-due' : 'ckin-balance-clear'}`}>
                            ₹{(checkIn.balanceAmount || 0).toFixed(2)}
                        </span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Payment Status</span>
                        <select className="ckin-edit-input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                            <option value="Paid">Paid</option>
                            <option value="Partial Paid">Partial Paid</option>
                            <option value="Not Paid">Not Paid</option>
                        </select>
                    </div>
                    {paymentStatus === 'Partial Paid' && (
                        <div className="ckin-detail-row">
                            <span className="ckin-detail-label">Amount Paying</span>
                            <input
                                type="number"
                                className="ckin-edit-input"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                min="0"
                                max={checkIn.grandTotal}
                            />
                        </div>
                    )}
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Notes</span>
                        <input
                            type="text"
                            className="ckin-edit-input"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes..."
                        />
                    </div>
                </div>
                <div className="ckin-modal-footer">
                    <button className="ckin-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="ckin-update-btn"
                        onClick={() => onCheckout(checkIn.checkInId, { paymentStatus, amountPaid, notes })}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="ckin-loading-spinner small"></div>
                                Processing...
                            </>
                        ) : (
                            <><FaCheck /> Complete Check-out</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// EXTENSION MODAL - UPDATED WITH MULTIPLE ROOM CHANGES
// ============================================
const ExtensionModal = ({ checkIn, onClose, onExtend, isSubmitting, fetchAvailableRoomsForExt }) => {
    const [newCheckOutDate, setNewCheckOutDate] = useState('');
    const [extensionOption, setExtensionOption] = useState('same-room');
    const [roomChanges, setRoomChanges] = useState([]);
    const [reason, setReason] = useState('');
    const [availableRoomsForExt, setAvailableRoomsForExt] = useState([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const [availabilityError, setAvailabilityError] = useState('');

    useEffect(() => {
        if (checkIn) {
            const defaultDate = new Date(checkIn.checkOutDate);
            defaultDate.setDate(defaultDate.getDate() + 1);
            setNewCheckOutDate(defaultDate.toISOString().slice(0, 16));
            loadAvailableRoomsForExt(defaultDate);
            setExtensionOption('same-room');

            const initialChanges = (checkIn.roomDetails || []).map(room => ({
                roomId: room.roomId,
                roomNumber: room.roomNumber,
                categoryName: room.categoryName,
                checkInDate: room.checkInDate,
                checkOutDate: room.checkOutDate,
                newRoomId: '',
                isChanging: false
            }));
            setRoomChanges(initialChanges);
            setAvailabilityError('');
        }
    }, [checkIn]);

    const loadAvailableRoomsForExt = async (newDate) => {
        try {
            setIsLoadingRooms(true);
            const rooms = await fetchAvailableRoomsForExt(checkIn?.checkInId, newDate);
            setAvailableRoomsForExt(rooms || []);
            setAvailabilityError('');
        } catch (error) {
            console.error("Error fetching available rooms:", error);
            toast.error("Failed to fetch available rooms");
        } finally {
            setIsLoadingRooms(false);
        }
    };

    const handleNewDateChange = (e) => {
        const value = e.target.value;
        setNewCheckOutDate(value);
        setAvailabilityError('');
        if (value) {
            const date = new Date(value);
            if (date > new Date(checkIn.checkOutDate)) {
                clearTimeout(window._extendDateTimeout);
                window._extendDateTimeout = setTimeout(() => {
                    loadAvailableRoomsForExt(date);
                }, 500);
            }
        }
    };

    const handleRoomChangeToggle = (index, isChecked) => {
        const updated = [...roomChanges];
        updated[index].isChanging = isChecked;
        if (!isChecked) {
            updated[index].newRoomId = '';
        }
        setRoomChanges(updated);
        setAvailabilityError('');
    };

    const handleNewRoomSelect = (index, newRoomId) => {
        const updated = [...roomChanges];
        updated[index].newRoomId = newRoomId;
        setRoomChanges(updated);
        setAvailabilityError('');
    };

    const handleSubmit = () => {
        if (!newCheckOutDate) {
            toast.error("Please select a new check-out date");
            return;
        }

        const newDate = new Date(newCheckOutDate);
        const currentCheckOut = new Date(checkIn.checkOutDate);

        if (newDate <= currentCheckOut) {
            toast.error("New check-out date must be after current check-out date");
            return;
        }

        if (extensionOption === 'same-room') {
            onExtend(checkIn.checkInId, {
                newCheckOutDate,
                option: 'same-room',
                changedRooms: [],
                reason
            });
            return;
        }

        if (extensionOption === 'change-room') {
            const changes = roomChanges
                .filter(room => room.isChanging && room.newRoomId)
                .map(room => ({
                    oldRoomId: room.roomId,
                    newRoomId: room.newRoomId
                }));

            if (changes.length === 0) {
                toast.error("Please select at least one room to change");
                return;
            }

            const existingRoomIds = checkIn.roomIds;
            for (const change of changes) {
                if (existingRoomIds.includes(change.newRoomId)) {
                    const room = roomChanges.find(r => r.roomId === change.newRoomId);
                    toast.error(`Room ${room?.roomNumber || change.newRoomId} is already in this check-in`);
                    return;
                }
            }

            for (const change of changes) {
                if (change.oldRoomId === change.newRoomId) {
                    toast.error("Cannot change a room to itself");
                    return;
                }
            }

            onExtend(checkIn.checkInId, {
                newCheckOutDate,
                option: 'change-room',
                changedRooms: changes,
                reason
            });
        }
    };

    if (!checkIn) return null;

    const currentRooms = checkIn.roomDetails || [];

    const getAvailableRoomsForRoom = (excludeRoomId) => {
        return availableRoomsForExt.filter(r => {
            if (checkIn.roomIds.includes(r.roomId)) return false;
            if (r.roomId === excludeRoomId) return false;
            return true;
        });
    };

    const hasAvailableOptions = (roomId) => {
        return getAvailableRoomsForRoom(roomId).length > 0;
    };

    return (
        <div className="ckin-modal-overlay" onClick={onClose}>
            <div className="ckin-modal-content ckin-modal-lg" onClick={e => e.stopPropagation()}>
                <div className="ckin-modal-header">
                    <div className="ckin-modal-title">
                        <FaSync /> Extend Stay - {currentRooms.length} Room(s)
                    </div>
                    <button className="ckin-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="ckin-modal-body">
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Guest</span>
                        <span className="ckin-detail-value">{checkIn.customerName}</span>
                    </div>

                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Current Check-out</span>
                        <span className="ckin-detail-value">{new Date(checkIn.checkOutDate).toLocaleString()}</span>
                    </div>

                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">New Check-out</span>
                        <input
                            type="datetime-local"
                            className="ckin-edit-input"
                            value={newCheckOutDate}
                            onChange={handleNewDateChange}
                        />
                        <small className="ckin-field-hint">Select new check-out date and time for ALL rooms</small>
                    </div>

                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Extension Type</span>
                        <div className="ckin-extension-options">
                            <label className="ckin-extension-option">
                                <input
                                    type="radio"
                                    name="extensionOption"
                                    value="same-room"
                                    checked={extensionOption === 'same-room'}
                                    onChange={() => {
                                        setExtensionOption('same-room');
                                        const resetChanges = roomChanges.map(room => ({
                                            ...room,
                                            isChanging: false,
                                            newRoomId: ''
                                        }));
                                        setRoomChanges(resetChanges);
                                        setAvailabilityError('');
                                    }}
                                />
                                <span>Stay in Same Room</span>
                                <small className="ckin-option-hint">Extend all rooms to new date without changing rooms</small>
                            </label>
                            <label className="ckin-extension-option">
                                <input
                                    type="radio"
                                    name="extensionOption"
                                    value="change-room"
                                    checked={extensionOption === 'change-room'}
                                    onChange={() => {
                                        setExtensionOption('change-room');
                                        setAvailabilityError('');
                                    }}
                                />
                                <span>Change Room with Extend</span>
                                <small className="ckin-option-hint">Change one or more rooms while extending the stay</small>
                            </label>
                        </div>
                    </div>

                    {extensionOption === 'change-room' && (
                        <div className="ckin-detail-row">
                            <span className="ckin-detail-label">Room Changes</span>
                            <div className="ckin-room-change-table">
                                <div className="ckin-room-change-header">
                                    <span className="ckin-room-change-col ckin-room-change-check">Change</span>
                                    <span className="ckin-room-change-col ckin-room-change-current">Current Room</span>
                                    <span className="ckin-room-change-col ckin-room-change-new">New Room</span>
                                </div>
                                {roomChanges.map((room, index) => {
                                    const availableRooms = getAvailableRoomsForRoom(room.roomId);
                                    const isChanging = room.isChanging;
                                    const hasAvailable = hasAvailableOptions(room.roomId);

                                    return (
                                        <div key={room.roomId} className="ckin-room-change-row">
                                            <div className="ckin-room-change-col ckin-room-change-check">
                                                <input
                                                    type="checkbox"
                                                    checked={isChanging}
                                                    onChange={(e) => handleRoomChangeToggle(index, e.target.checked)}
                                                    disabled={!hasAvailable && !isChanging}
                                                />
                                                {!hasAvailable && !isChanging && (
                                                    <span className="ckin-no-rooms-hint" title="No available rooms for this room">
                                                        ⚠️
                                                    </span>
                                                )}
                                            </div>
                                            <div className="ckin-room-change-col ckin-room-change-current">
                                                <strong>{room.roomNumber}</strong>
                                                <span className="ckin-room-category">({room.categoryName})</span>
                                                <br />
                                                <small>
                                                    Check-in: {new Date(room.checkInDate).toLocaleDateString()}
                                                </small>
                                            </div>
                                            <div className="ckin-room-change-col ckin-room-change-new">
                                                {isChanging ? (
                                                    isLoadingRooms ? (
                                                        <div className="ckin-loading-text">Loading...</div>
                                                    ) : availableRooms.length > 0 ? (
                                                        <select
                                                            className="ckin-edit-input"
                                                            value={room.newRoomId}
                                                            onChange={(e) => handleNewRoomSelect(index, e.target.value)}
                                                        >
                                                            <option value="">Select a room</option>
                                                            {availableRooms.map(availRoom => (
                                                                <option key={availRoom.roomId} value={availRoom.roomId}>
                                                                    {availRoom.roomNumber} ({availRoom.categoryDetails?.categoryName})
                                                                    - ₹{availRoom.categoryDetails?.pricing?.perDay}/day
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="ckin-no-rooms-warning">
                                                            No available rooms for this date
                                                        </div>
                                                    )
                                                ) : (
                                                    <span className="ckin-room-unchanged">No change</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {roomChanges.filter(r => r.isChanging && r.newRoomId).length === 0 && extensionOption === 'change-room' && (
                                <small className="ckin-field-hint ckin-text-warning">
                                    Please select at least one room to change
                                </small>
                            )}
                            {availabilityError && (
                                <div className="ckin-error-message">{availabilityError}</div>
                            )}
                        </div>
                    )}

                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Reason (Optional)</span>
                        <input
                            type="text"
                            className="ckin-edit-input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for extension..."
                        />
                    </div>

                    {newCheckOutDate && (
                        <div className="ckin-extension-summary">
                            <h4>Extension Summary</h4>
                            <div className="ckin-summary-grid">
                                <span>Current Check-out:</span>
                                <span>{new Date(checkIn.checkOutDate).toLocaleString()}</span>
                                <span>New Check-out:</span>
                                <span className="ckin-text-success">{new Date(newCheckOutDate).toLocaleString()}</span>

                                {extensionOption === 'change-room' && (
                                    <>
                                        <span>Rooms to Change:</span>
                                        <span>
                                            {roomChanges.filter(r => r.isChanging && r.newRoomId).length > 0 ? (
                                                roomChanges
                                                    .filter(r => r.isChanging && r.newRoomId)
                                                    .map(r => {
                                                        const newRoom = availableRoomsForExt.find(ar => ar.roomId === r.newRoomId);
                                                        return `${r.roomNumber} → ${newRoom?.roomNumber || r.newRoomId}`;
                                                    })
                                                    .join(', ')
                                            ) : (
                                                <span className="ckin-text-warning">None selected</span>
                                            )}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="ckin-modal-footer">
                    <button className="ckin-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="ckin-update-btn"
                        onClick={handleSubmit}
                        disabled={
                            !newCheckOutDate ||
                            isSubmitting ||
                            (extensionOption === 'change-room' &&
                                roomChanges.filter(r => r.isChanging && r.newRoomId).length === 0)
                        }
                    >
                        {isSubmitting ? (
                            <>
                                <div className="ckin-loading-spinner small"></div>
                                Extending...
                            </>
                        ) : (
                            <><FaSync /> Extend Stay</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ChangeRoomModal = ({ checkIn, onClose, onConfirm, isSubmitting, fetchAvailableRoomsForCheckInId }) => {
    const [selectedOldRoom, setSelectedOldRoom] = useState('');
    const [selectedNewRoom, setSelectedNewRoom] = useState('');
    const [availableRooms, setAvailableRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (checkIn) {
            loadAvailableRooms();
        }
    }, [checkIn]);

    const loadAvailableRooms = async () => {
        try {
            setIsLoading(true);
            const rooms = await fetchAvailableRoomsForCheckInId(
                checkIn.checkInId,
                checkIn.checkInDate,
                checkIn.checkOutDate
            );
            setAvailableRooms(rooms);
        } catch (error) {
            console.error("Error loading rooms:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!checkIn) return null;

    const currentRooms = checkIn.roomDetails || [];

    return (
        <div className="ckin-modal-overlay" onClick={onClose}>
            <div className="ckin-modal-content" onClick={e => e.stopPropagation()}>
                <div className="ckin-modal-header">
                    <div className="ckin-modal-title">
                        <FaExchangeAlt /> Change Room
                    </div>
                    <button className="ckin-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="ckin-modal-body">
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Guest</span>
                        <span className="ckin-detail-value">{checkIn.customerName}</span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Current Room(s)</span>
                        <div className="ckin-detail-value ckin-rooms-list">
                            {currentRooms.map((room, idx) => (
                                <div key={idx} className="ckin-room-detail-item">
                                    <strong>{room.roomNumber}</strong> ({room.categoryName})
                                    <br />
                                    <small>Check-in: {new Date(room.checkInDate).toLocaleString()}</small>
                                    <br />
                                    <small>Check-out: {new Date(room.checkOutDate).toLocaleString()}</small>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Select Room to Change</span>
                        <select
                            className="ckin-edit-input"
                            value={selectedOldRoom}
                            onChange={(e) => setSelectedOldRoom(e.target.value)}
                        >
                            <option value="">Select a room</option>
                            {currentRooms.map(room => (
                                <option key={room.roomId} value={room.roomId}>
                                    {room.roomNumber} ({room.categoryName})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Select New Room</span>
                        {isLoading ? (
                            <div className="ckin-loading-text">Loading available rooms...</div>
                        ) : (
                            <select
                                className="ckin-edit-input"
                                value={selectedNewRoom}
                                onChange={(e) => setSelectedNewRoom(e.target.value)}
                            >
                                <option value="">Select a room</option>
                                {availableRooms
                                    .filter(r => !checkIn.roomIds.includes(r.roomId))
                                    .map(room => (
                                        <option key={room.roomId} value={room.roomId}>
                                            {room.roomNumber} ({room.categoryDetails?.categoryName})
                                            - ₹{room.categoryDetails?.pricing?.perDay}/day
                                        </option>
                                    ))}
                            </select>
                        )}
                        {availableRooms.length === 0 && !isLoading && (
                            <div className="ckin-no-rooms-warning">
                                No available rooms for the current dates
                            </div>
                        )}
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Note</span>
                        <small className="ckin-field-hint">
                            Room will be changed with prorated pricing based on hours used.
                            Previous room will be stored in history.
                        </small>
                    </div>
                </div>
                <div className="ckin-modal-footer">
                    <button className="ckin-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="ckin-update-btn"
                        onClick={() => {
                            if (!selectedOldRoom) {
                                toast.error("Please select a room to change");
                                return;
                            }
                            if (!selectedNewRoom) {
                                toast.error("Please select a new room");
                                return;
                            }
                            onConfirm(checkIn.checkInId, selectedOldRoom, selectedNewRoom);
                        }}
                        disabled={!selectedOldRoom || !selectedNewRoom || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="ckin-loading-spinner small"></div>
                                Changing...
                            </>
                        ) : (
                            <><FaCheck /> Change Room</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// ADD ROOM MODAL - UPDATED
// ============================================
const AddRoomModal = ({ checkIn, onClose, onConfirm, isSubmitting, fetchAvailableRoomsForCheckInId }) => {
    const [selectedRoom, setSelectedRoom] = useState('');
    const [availableRooms, setAvailableRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (checkIn) {
            loadAvailableRooms();
        }
    }, [checkIn]);

    const loadAvailableRooms = async () => {
        try {
            setIsLoading(true);
            const rooms = await fetchAvailableRoomsForCheckInId(
                checkIn.checkInId,
                checkIn.checkInDate,
                checkIn.checkOutDate
            );
            setAvailableRooms(rooms);
        } catch (error) {
            console.error("Error loading rooms:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!checkIn) return null;

    const currentRoomNumbers = checkIn.roomDetails?.map(r => r.roomNumber) || [];

    return (
        <div className="ckin-modal-overlay" onClick={onClose}>
            <div className="ckin-modal-content" onClick={e => e.stopPropagation()}>
                <div className="ckin-modal-header">
                    <div className="ckin-modal-title">
                        <FaPlusSquare /> Add New Room
                    </div>
                    <button className="ckin-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="ckin-modal-body">
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Current Room(s)</span>
                        <span className="ckin-detail-value">
                            {currentRoomNumbers.join(', ') || 'N/A'}
                        </span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Guest</span>
                        <span className="ckin-detail-value">{checkIn.customerName}</span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Select Room to Add</span>
                        {isLoading ? (
                            <div className="ckin-loading-text">Loading available rooms...</div>
                        ) : (
                            <select
                                className="ckin-edit-input"
                                value={selectedRoom}
                                onChange={(e) => setSelectedRoom(e.target.value)}
                            >
                                <option value="">Select a room</option>
                                {availableRooms
                                    .filter(r => !checkIn.roomIds?.includes(r.roomId))
                                    .map(room => (
                                        <option key={room.roomId} value={room.roomId}>
                                            {room.roomNumber} ({room.categoryDetails?.categoryName})
                                            - ₹{room.categoryDetails?.pricing?.perDay}/day
                                        </option>
                                    ))}
                            </select>
                        )}
                        {availableRooms.length === 0 && !isLoading && (
                            <div className="ckin-no-rooms-warning">
                                No available rooms for the current dates
                            </div>
                        )}
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Note</span>
                        <small className="ckin-field-hint">
                            Room will be added with check-in = current time and check-out = main check-out
                        </small>
                    </div>
                </div>
                <div className="ckin-modal-footer">
                    <button className="ckin-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="ckin-update-btn"
                        onClick={() => {
                            if (!selectedRoom) {
                                toast.error("Please select a room");
                                return;
                            }
                            onConfirm(checkIn.checkInId, selectedRoom);
                        }}
                        disabled={!selectedRoom || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="ckin-loading-spinner small"></div>
                                Adding...
                            </>
                        ) : (
                            <><FaPlus /> Add Room</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// REMOVE ROOM MODAL - UPDATED
// ============================================
const RemoveRoomModal = ({ checkIn, onClose, onConfirm, isSubmitting }) => {
    const [selectedRoom, setSelectedRoom] = useState('');
    const [price, setPrice] = useState(0);
    const [reason, setReason] = useState('');
    const [roomOptions, setRoomOptions] = useState([]);

    useEffect(() => {
        if (checkIn && checkIn.roomDetails) {
            setRoomOptions(checkIn.roomDetails);
            if (checkIn.roomDetails.length > 0) {
                setSelectedRoom(checkIn.roomDetails[0].roomId);
            }
        }
    }, [checkIn]);

    useEffect(() => {
        if (selectedRoom && checkIn) {
            const room = checkIn.roomDetails.find(r => r.roomId === selectedRoom);
            if (room) {
                const currentDate = new Date();
                const roomCheckIn = new Date(room.checkInDate);
                const hoursUsed = Math.ceil((currentDate - roomCheckIn) / (1000 * 60 * 60));

                const pricing = room.categoryDetails?.pricing || {};
                let calcPrice = 0;

                if (hoursUsed <= 0) {
                    calcPrice = 0;
                } else if (hoursUsed <= 6) {
                    calcPrice = pricing.per6Hours || 0;
                } else if (hoursUsed <= 12) {
                    calcPrice = pricing.per12Hours || 0;
                } else if (hoursUsed <= 24) {
                    calcPrice = pricing.perDay || 0;
                } else {
                    const days = Math.floor(hoursUsed / 24);
                    const remainingHours = hoursUsed % 24;
                    calcPrice = days * (pricing.perDay || 0);
                    if (remainingHours > 0) {
                        if (remainingHours <= 6) calcPrice += pricing.per6Hours || 0;
                        else if (remainingHours <= 12) calcPrice += pricing.per12Hours || 0;
                        else calcPrice += pricing.perDay || 0;
                    }
                }

                setPrice(Math.round(calcPrice));
            }
        }
    }, [selectedRoom, checkIn]);

    if (!checkIn) return null;

    return (
        <div className="ckin-modal-overlay" onClick={onClose}>
            <div className="ckin-modal-content" onClick={e => e.stopPropagation()}>
                <div className="ckin-modal-header">
                    <div className="ckin-modal-title">
                        <FaTrashAlt /> Remove Room
                    </div>
                    <button className="ckin-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="ckin-modal-body">
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Select Room to Remove</span>
                        <select
                            className="ckin-edit-input"
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value)}
                        >
                            {roomOptions.map(room => (
                                <option key={room.roomId} value={room.roomId}>
                                    {room.roomNumber} ({room.categoryName})
                                    ({new Date(room.checkInDate).toLocaleDateString()} - {new Date(room.checkOutDate).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Guest</span>
                        <span className="ckin-detail-value">{checkIn.customerName}</span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Hours Used</span>
                        <span className="ckin-detail-value">
                            {(() => {
                                const room = checkIn.roomDetails.find(r => r.roomId === selectedRoom);
                                if (room) {
                                    const currentDate = new Date();
                                    const roomCheckIn = new Date(room.checkInDate);
                                    const hours = Math.ceil((currentDate - roomCheckIn) / (1000 * 60 * 60));
                                    return `${hours} hours`;
                                }
                                return 'N/A';
                            })()}
                        </span>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Price (Admin can edit)</span>
                        <input
                            type="number"
                            className="ckin-edit-input"
                            value={price}
                            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                            min="0"
                        />
                        <small className="ckin-field-hint">Auto-calculated based on hours used, editable</small>
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Reason (Optional)</span>
                        <input
                            type="text"
                            className="ckin-edit-input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for removal..."
                        />
                    </div>
                    <div className="ckin-detail-row">
                        <span className="ckin-detail-label">Note</span>
                        <small className="ckin-field-hint ckin-text-danger">
                            Room will become available for other customers after removal.
                            Room history will be stored with original check-in/out dates.
                        </small>
                    </div>
                </div>
                <div className="ckin-modal-footer">
                    <button className="ckin-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="ckin-delete-btn"
                        onClick={() => {
                            if (!selectedRoom) {
                                toast.error("Please select a room");
                                return;
                            }
                            onConfirm(checkIn.checkInId, selectedRoom, price, reason);
                        }}
                        disabled={!selectedRoom || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="ckin-loading-spinner small"></div>
                                Removing...
                            </>
                        ) : (
                            <><FaTrash /> Remove Room</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// CHECK-IN MODAL (view / edit / actions) - UPDATED WITH BOOKING TYPE
// ============================================
const CheckInModal = ({
    checkIn,
    onClose,
    onUpdate,
    onDelete,
    onExtend,
    onSendWhatsApp,
    onGeneratePDF,
    onPrintAndWhatsApp,
    onOpenChangeRoom,
    onOpenAddRoom,
    onOpenRemoveRoom,
    isPDFGenerating,
    isWhatsAppSending,
    isPrintAndWhatsAppProcessing
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedCheckIn, setEditedCheckIn] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editExtraRequirements, setEditExtraRequirements] = useState([]);
    const [editIdProofs, setEditIdProofs] = useState([]);
    const [editPaymentDetails, setEditPaymentDetails] = useState([]);
    const [editRoomDetails, setEditRoomDetails] = useState([]);
    const [newProofLabel, setNewProofLabel] = useState('Other');
    const [newProofFile, setNewProofFile] = useState(null);
    const [checkOutTimeError, setCheckOutTimeError] = useState('');
    const [paymentValidationError, setPaymentValidationError] = useState('');
    const [bookingType, setBookingType] = useState('simple');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => document.body.style.overflow = 'auto';
    }, []);

    useEffect(() => {
        if (checkIn) {
            setEditedCheckIn({ ...checkIn });
            setEditExtraRequirements(checkIn.extraRequirements || []);
            setEditIdProofs(checkIn.idProofs || []);
            setEditPaymentDetails(checkIn.paymentDetails || []);
            setEditRoomDetails(checkIn.roomDetails || []);
            setBookingType(checkIn.bookingType || 'simple');
            setCheckOutTimeError('');
            setPaymentValidationError('');
        }
    }, [checkIn]);

    // Calculate live price for edit mode
    useEffect(() => {
        if (isEditing && checkIn) {
            calculateLivePrice();
        }
    }, [editedCheckIn.taxSlab, editExtraRequirements, editPaymentDetails, isEditing, editedCheckIn.amountPaid, editRoomDetails]);

    const calculateLivePrice = () => {
        if (!checkIn) return;

        const basePrice = editRoomDetails.reduce((sum, room) => sum + (room.price || 0), 0);
        const extrasTotal = editExtraRequirements.reduce((sum, req) => sum + (parseFloat(req.price) || 0), 0);
        const subtotal = basePrice + extrasTotal;
        const taxSlab = parseInt(editedCheckIn.taxSlab) || 18;
        const taxAmount = (subtotal * taxSlab) / 100;
        const grandTotal = subtotal + taxAmount;

        const amountPaid = parseFloat(editedCheckIn.amountPaid) || 0;
        const remainingAmount = Math.max(0, grandTotal - amountPaid);

        const paymentTotal = editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
        let validationError = '';
        if (editPaymentDetails.length > 0 && paymentTotal > grandTotal) {
            validationError = `Total payment (₹${paymentTotal.toFixed(2)}) exceeds Grand Total (₹${grandTotal.toFixed(2)})`;
        }

        setPaymentValidationError(validationError);
        setLiveCalculatedPrice({
            basePrice,
            extrasTotal,
            subtotal,
            taxSlab,
            taxAmount,
            grandTotal,
            amountPaid,
            remainingAmount,
            paymentTotal
        });
    };

    const [liveCalculatedPrice, setLiveCalculatedPrice] = useState(null);

    const handleRoomPriceChange = (index, newPrice) => {
        const updated = [...editRoomDetails];
        updated[index].price = parseFloat(newPrice) || 0;
        setEditRoomDetails(updated);
        calculateLivePrice();
    };

    if (!checkIn) return null;

    const isCheckOutDateValid = (newDate) => {
        const currentSystemDate = new Date(checkIn.checkOutDate);
        const checkInDate = new Date(checkIn.checkInDate);
        const selectedDate = new Date(newDate);

        if (selectedDate < checkInDate) {
            setCheckOutTimeError("Check-out cannot be before check-in time");
            return false;
        }
        if (selectedDate > currentSystemDate) {
            setCheckOutTimeError(`Cannot extend beyond ${currentSystemDate.toLocaleString()}`);
            return false;
        }
        setCheckOutTimeError('');
        return true;
    };

    const handleCheckOutDateChange = (e) => {
        const newValue = e.target.value;
        if (!newValue) {
            setEditedCheckIn(prev => ({ ...prev, checkOutDate: '' }));
            return;
        }

        const selectedDate = new Date(newValue);

        if (isCheckOutDateValid(selectedDate)) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const hours = String(selectedDate.getHours()).padStart(2, '0');
            const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
            const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

            setEditedCheckIn(prev => ({ ...prev, checkOutDate: localDateTime }));
        }
    };

    const handleEditExtraRequirementChange = (index, field, value) => {
        const updated = [...editExtraRequirements];
        updated[index][field] = value;
        setEditExtraRequirements(updated);
    };

    const handleAddEditExtraRequirement = () => {
        setEditExtraRequirements([...editExtraRequirements, { description: '', price: 0 }]);
    };

    const handleRemoveEditExtraRequirement = (index) => {
        const updated = [...editExtraRequirements];
        updated.splice(index, 1);
        setEditExtraRequirements(updated);
    };

    const handleEditProofLabelChange = (index, label) => {
        const updated = [...editIdProofs];
        updated[index].label = label;
        setEditIdProofs(updated);
    };

    const handleAddEditProof = () => {
        if (!newProofFile) {
            toast.error("Please select a file");
            return;
        }

        const newProof = {
            proofId: 'temp-' + Date.now(),
            label: newProofLabel,
            fileName: newProofFile.name,
            fileUrl: URL.createObjectURL(newProofFile),
            fileSize: newProofFile.size,
            file: newProofFile,
            isNew: true
        };

        setEditIdProofs([...editIdProofs, newProof]);
        setNewProofFile(null);
        setNewProofLabel('Other');

        const fileInput = document.getElementById('edit-proof-input');
        if (fileInput) fileInput.value = '';
    };

    const handleRemoveEditProof = (index) => {
        const updated = [...editIdProofs];
        updated.splice(index, 1);
        setEditIdProofs(updated);
    };

    // PAYMENT DETAILS HANDLERS
    const handlePaymentDetailChange = (index, field, value) => {
        const updated = [...editPaymentDetails];
        updated[index][field] = value;
        setEditPaymentDetails(updated);
    };

    const getAvailablePaymentMethods = (currentIndex) => {
        const usedMethods = editPaymentDetails
            .filter((_, idx) => idx !== currentIndex)
            .map(p => p.method);
        return PAYMENT_METHODS.filter(m => !usedMethods.includes(m));
    };

    const handleAddPaymentDetail = () => {
        const usedMethods = editPaymentDetails.map(p => p.method);
        const availableMethod = PAYMENT_METHODS.find(m => !usedMethods.includes(m));

        if (availableMethod) {
            setEditPaymentDetails([...editPaymentDetails, { method: availableMethod, amount: 0, reference: '' }]);
        } else {
            toast.warning("All payment methods are already added");
        }
    };

    const handleRemovePaymentDetail = (index) => {
        const updated = [...editPaymentDetails];
        updated.splice(index, 1);
        setEditPaymentDetails(updated);
    };

    const renderPaymentDetails = () => {
        if (!checkIn.paymentDetails || checkIn.paymentDetails.length === 0) {
            return <span className="ckin-detail-value">No payment details</span>;
        }

        return (
            <div className="ckin-payment-details-list">
                {checkIn.paymentDetails.map((payment, idx) => (
                    <div key={idx} className="ckin-payment-detail-item">
                        <span className="ckin-payment-method">{payment.method}:</span>
                        <span className="ckin-payment-amount">₹{payment.amount.toFixed(2)}</span>
                        {payment.reference && <span className="ckin-payment-ref">({payment.reference})</span>}
                    </div>
                ))}
                <div className="ckin-payment-total">
                    <strong>Payment Type:</strong> {checkIn.paymentType || 'Cash'}
                </div>
            </div>
        );
    };

    const renderLivePriceBreakdown = () => {
        if (!liveCalculatedPrice) return null;

        const { basePrice, extrasTotal, subtotal, taxSlab, taxAmount, grandTotal, amountPaid, remainingAmount, paymentTotal } = liveCalculatedPrice;

        return (
            <div className="ckin-price-breakdown-box ckin-live-price">
                <h4><FaCalculator /> Live Price Calculation</h4>
                <div className="ckin-price-breakdown-grid">
                    <span><strong>Booking Type:</strong></span>
                    <span className="ckin-price-val">{bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}</span>

                    <span>Base Price:</span>
                    <span className="ckin-price-val">₹{basePrice.toFixed(2)}</span>

                    <span>Extra Requirements:</span>
                    <span className="ckin-price-val">₹{extrasTotal.toFixed(2)}</span>

                    <hr className="ckin-price-divider" />

                    <span><strong>Subtotal:</strong></span>
                    <span className="ckin-price-val"><strong>₹{subtotal.toFixed(2)}</strong></span>

                    <span>Tax ({taxSlab}%):</span>
                    <span className="ckin-price-val">₹{taxAmount.toFixed(2)}</span>

                    <hr className="ckin-price-divider ckin-price-divider-thick" />

                    <span className="ckin-price-grand-label"><strong>Grand Total:</strong></span>
                    <span className="ckin-price-val ckin-price-grand-value">
                        ₹{grandTotal.toFixed(2)}
                    </span>

                    <hr className="ckin-price-divider" />

                    <span>Amount Paid:</span>
                    <span className="ckin-price-val">₹{amountPaid.toFixed(2)}</span>

                    <span className="ckin-price-grand-label"><strong>Remaining Amount:</strong></span>
                    <span className={`ckin-price-val ckin-price-grand-value ${remainingAmount > 0 ? 'ckin-balance-due' : 'ckin-balance-clear'}`}>
                        ₹{remainingAmount.toFixed(2)}
                    </span>

                    {editPaymentDetails.length > 0 && (
                        <>
                            <hr className="ckin-price-divider" />
                            <span className="ckin-price-grand-label"><strong>Payment Total:</strong></span>
                            <span className={`ckin-price-val ckin-price-grand-value ${paymentTotal > grandTotal ? 'ckin-balance-due' : ''}`}>
                                ₹{paymentTotal.toFixed(2)}
                            </span>
                            {paymentTotal > grandTotal && (
                                <span className="ckin-price-error" style={{ gridColumn: '1 / -1', color: '#dc3545', fontSize: '13px' }}>
                                    ⚠️ Payment total exceeds Grand Total!
                                </span>
                            )}
                        </>
                    )}
                </div>
                {paymentValidationError && (
                    <div className="ckin-error-message" style={{ color: '#dc3545', marginTop: '8px', padding: '8px', background: '#f8d7da', borderRadius: '4px' }}>
                        <FaExclamationTriangle /> {paymentValidationError}
                    </div>
                )}
                <small className="ckin-live-price-hint">* Prices update automatically when you change Tax Slab, Requirements or Room Prices</small>
            </div>
        );
    };

    const handleSaveEdit = async () => {
        if (editedCheckIn.checkOutDate) {
            const selectedDate = new Date(editedCheckIn.checkOutDate);
            const currentSystemDate = new Date(checkIn.checkOutDate);
            const checkInDate = new Date(checkIn.checkInDate);

            if (selectedDate < checkInDate) {
                toast.error("Check-out cannot be before check-in time");
                return;
            }
            if (selectedDate > currentSystemDate) {
                toast.error(`Cannot extend beyond ${currentSystemDate.toLocaleString()}`);
                return;
            }
        }

        // Validate payment details don't exceed grand total
        const grandTotal = liveCalculatedPrice?.grandTotal || checkIn.grandTotal || 0;
        const paymentTotal = editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
        if (editPaymentDetails.length > 0 && paymentTotal > grandTotal) {
            toast.error(`Total payment (₹${paymentTotal.toFixed(2)}) cannot exceed Grand Total (₹${grandTotal.toFixed(2)})`);
            return;
        }

        if (editedCheckIn.paymentStatus === 'Partial Paid') {
            const amountPaid = parseFloat(editedCheckIn.amountPaid) || 0;
            if (amountPaid > grandTotal) {
                toast.error(`Amount paid (₹${amountPaid.toFixed(2)}) cannot exceed Grand Total (₹${grandTotal.toFixed(2)})`);
                return;
            }
        }

        const updateData = {
            ...editedCheckIn,
            extraRequirements: editExtraRequirements,
            idProofs: editIdProofs,
            paymentDetails: editPaymentDetails,
            roomDetails: editRoomDetails,
            bookingType: bookingType
        };

        await onUpdate(checkIn.checkInId, updateData);
        setIsEditing(false);
    };

    const renderPriceBreakdown = (overrideAmountPaid) => {
        const amountPaidVal = overrideAmountPaid !== undefined
            ? (parseFloat(overrideAmountPaid) || 0)
            : (checkIn.amountPaid || 0);
        const remainingVal = Math.max(0, (checkIn.grandTotal || 0) - amountPaidVal);

        const activeRooms = (checkIn.roomDetails || []).filter(r => !r.isRemoved);
        const removedRooms = (checkIn.removedRooms || []);

        return (
            <div className="ckin-price-breakdown-box">
                <h4><FaCalculator /> Price Breakdown</h4>
                <div className="ckin-price-breakdown-grid">
                    <span><strong>Booking Type:</strong></span>
                    <span className="ckin-price-val">{checkIn.bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}</span>

                    <span className="ckin-price-section-label"><strong>Active Rooms:</strong></span>
                    <span></span>
                    {activeRooms.map((room, idx) => (
                        <React.Fragment key={idx}>
                            <span className="ckin-room-price-label">Room {room.roomNumber} ({room.categoryName})</span>
                            <span className="ckin-price-val">₹{(room.price || 0).toFixed(2)}</span>
                        </React.Fragment>
                    ))}

                    {activeRooms.length > 0 && (
                        <>
                            <span className="ckin-price-total-label">Active Rooms Total:</span>
                            <span className="ckin-price-val ckin-price-total">
                                ₹{activeRooms.reduce((sum, r) => sum + (r.price || 0), 0).toFixed(2)}
                            </span>
                        </>
                    )}

                    {removedRooms.length > 0 && (
                        <>
                            <span className="ckin-price-section-label ckin-removed-label"><strong>Removed Rooms:</strong></span>
                            <span></span>
                            {removedRooms.map((room, idx) => (
                                <React.Fragment key={idx}>
                                    <span className="ckin-room-price-label ckin-removed-text">
                                        Room {room.roomNumber} ({room.categoryName}) - <span className="ckin-removed-badge">Removed</span>
                                    </span>
                                    <span className="ckin-price-val">₹{(room.price || 0).toFixed(2)}</span>
                                </React.Fragment>
                            ))}
                            <span className="ckin-price-total-label ckin-removed-text">Removed Rooms Total:</span>
                            <span className="ckin-price-val ckin-removed-text">
                                ₹{removedRooms.reduce((sum, r) => sum + (r.price || 0), 0).toFixed(2)}
                            </span>
                        </>
                    )}

                    <hr className="ckin-price-divider" />

                    <span><strong>Base Price:</strong></span>
                    <span className="ckin-price-val"><strong>₹{(checkIn.basePrice || 0).toFixed(2)}</strong></span>

                    <span>Extra Requirements:</span>
                    <span className="ckin-price-val">₹{(checkIn.extraRequirementsTotal || 0).toFixed(2)}</span>

                    <hr className="ckin-price-divider" />

                    <span><strong>Subtotal:</strong></span>
                    <span className="ckin-price-val"><strong>₹{(checkIn.subtotal || 0).toFixed(2)}</strong></span>

                    <span>Tax ({checkIn.taxSlab}%):</span>
                    <span className="ckin-price-val">₹{(checkIn.taxAmount || 0).toFixed(2)}</span>

                    <hr className="ckin-price-divider ckin-price-divider-thick" />

                    <span className="ckin-price-grand-label"><strong>Grand Total:</strong></span>
                    <span className="ckin-price-val ckin-price-grand-value">
                        ₹{(checkIn.grandTotal || 0).toFixed(2)}
                    </span>

                    <hr className="ckin-price-divider" />

                    <span>Amount Paid:</span>
                    <span className="ckin-price-val">₹{amountPaidVal.toFixed(2)}</span>

                    <span className="ckin-price-grand-label"><strong>Remaining Amount:</strong></span>
                    <span className={`ckin-price-val ckin-price-grand-value ${remainingVal > 0 ? 'ckin-balance-due' : 'ckin-balance-clear'}`}>
                        ₹{remainingVal.toFixed(2)}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="ckin-modal-overlay" onClick={onClose}>
            <div className="ckin-modal-content ckin-modal-lg" onClick={e => e.stopPropagation()}>
                <div className="ckin-modal-header">
                    <div className="ckin-modal-title">
                        {isEditing ? "Edit Check-in" : `Check-in: ${checkIn.checkInNumber}`}
                        {!isEditing && checkIn.bookingType === 'perNight' && (
                            <span className="ckin-booking-type-badge ckin-pernight-badge">🌙 Night Stay</span>
                        )}
                    </div>
                    <button className="ckin-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="ckin-modal-body">
                    {isEditing ? (
                        <div className="ckin-details-grid">
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Booking Type</span>
                                <span className="ckin-detail-value">
                                    <span className="ckin-booking-type-badge ckin-pernight-badge">
                                        {bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}
                                    </span>
                                    <small className="ckin-field-hint" style={{ display: 'block', marginTop: '4px' }}>
                                        Booking type cannot be changed
                                    </small>
                                </span>
                            </div>

                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Guest Name</span>
                                <input
                                    type="text"
                                    className="ckin-edit-input"
                                    value={editedCheckIn.customerName || ''}
                                    onChange={(e) => setEditedCheckIn(prev => ({ ...prev, customerName: e.target.value }))}
                                />
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Phone</span>
                                <input
                                    type="text"
                                    className="ckin-edit-input"
                                    value={editedCheckIn.customerPhone || ''}
                                    onChange={(e) => setEditedCheckIn(prev => ({ ...prev, customerPhone: e.target.value }))}
                                />
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Email</span>
                                <input
                                    type="email"
                                    className="ckin-edit-input"
                                    value={editedCheckIn.customerEmail || ''}
                                    onChange={(e) => setEditedCheckIn(prev => ({ ...prev, customerEmail: e.target.value }))}
                                />
                            </div>

                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Check-in Date</span>
                                <input
                                    type="text"
                                    className="ckin-edit-input ckin-read-only-input"
                                    value={new Date(checkIn.checkInDate).toLocaleString()}
                                    disabled
                                />
                            </div>

                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Check-out Date</span>
                                <input
                                    type="datetime-local"
                                    className={`ckin-edit-input ${checkOutTimeError ? 'ckin-input-error-border' : 'ckin-input-highlight-border'}`}
                                    value={editedCheckIn.checkOutDate || ''}
                                    onChange={handleCheckOutDateChange}
                                />
                                {checkOutTimeError && (
                                    <div className="ckin-error-message">
                                        <FaExclamationTriangle /> {checkOutTimeError}
                                    </div>
                                )}
                                {!checkOutTimeError && (
                                    <small className="ckin-field-hint">
                                        Current system check-out: {new Date(checkIn.checkOutDate).toLocaleString()}
                                    </small>
                                )}
                            </div>

                            {/* ===== EDITABLE ROOM PRICES ===== */}
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Room Prices</span>
                                <div className="ckin-edit-room-prices">
                                    {editRoomDetails.map((room, index) => (
                                        <div key={index} className="ckin-room-price-edit-row">
                                            <div className="ckin-room-info-edit">
                                                <strong>{room.roomNumber}</strong>
                                                <span className="ckin-room-category">{room.categoryName}</span>
                                                <span className="ckin-room-duration">{room.durationLabel}</span>
                                            </div>
                                            <div className="ckin-room-price-input-group">
                                                <span className="ckin-currency-symbol">₹</span>
                                                <input
                                                    type="number"
                                                    className="ckin-edit-input ckin-room-price-input"
                                                    value={room.price || 0}
                                                    onChange={(e) => handleRoomPriceChange(index, e.target.value)}
                                                    min="0"
                                                    step="1"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <small className="ckin-field-hint">Edit room prices as needed</small>
                                </div>
                            </div>

                            {renderLivePriceBreakdown()}

                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Tax Slab</span>
                                <select
                                    className="ckin-edit-input"
                                    value={editedCheckIn.taxSlab || 18}
                                    onChange={(e) => setEditedCheckIn(prev => ({ ...prev, taxSlab: parseInt(e.target.value) }))}
                                >
                                    <option value="5">5%</option>
                                    <option value="10">10%</option>
                                    <option value="18">18%</option>
                                </select>
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Payment Status</span>
                                <select
                                    className="ckin-edit-input"
                                    value={editedCheckIn.paymentStatus || 'Not Paid'}
                                    onChange={(e) => {
                                        const newStatus = e.target.value;
                                        setEditedCheckIn(prev => ({ ...prev, paymentStatus: newStatus }));
                                        if (newStatus === 'Not Paid') {
                                            setEditPaymentDetails([]);
                                        }
                                    }}
                                >
                                    <option value="Paid">Paid</option>
                                    <option value="Partial Paid">Partial Paid</option>
                                    <option value="Not Paid">Not Paid</option>
                                </select>
                            </div>

                            {editedCheckIn.paymentStatus === 'Partial Paid' && (
                                <div className="ckin-detail-row">
                                    <span className="ckin-detail-label">Amount Paid</span>
                                    <input
                                        type="number"
                                        className="ckin-edit-input"
                                        min="0"
                                        max={liveCalculatedPrice?.grandTotal || checkIn.grandTotal || 0}
                                        value={editedCheckIn.amountPaid || 0}
                                        onChange={(e) => {
                                            const newAmount = parseFloat(e.target.value) || 0;
                                            const maxAmount = liveCalculatedPrice?.grandTotal || checkIn.grandTotal || 0;
                                            if (newAmount > maxAmount) {
                                                toast.warning(`Amount cannot exceed Grand Total (₹${maxAmount.toFixed(2)})`);
                                                return;
                                            }
                                            setEditedCheckIn(prev => ({ ...prev, amountPaid: newAmount }));
                                        }}
                                    />
                                    <small className="ckin-field-hint">
                                        Max: ₹{(liveCalculatedPrice?.grandTotal || checkIn.grandTotal || 0).toFixed(2)}
                                    </small>
                                </div>
                            )}

                            {/* ===== PAYMENT DETAILS - Only show if NOT "Not Paid" ===== */}
                            {editedCheckIn.paymentStatus !== 'Not Paid' && (
                                <div className="ckin-detail-row">
                                    <span className="ckin-detail-label">Payment Details</span>
                                    <div className="ckin-payment-details-edit">
                                        {editPaymentDetails.map((payment, index) => {
                                            const availableMethods = getAvailablePaymentMethods(index);
                                            const grandTotal = liveCalculatedPrice?.grandTotal || checkIn.grandTotal || 0;
                                            const currentPaymentTotal = editPaymentDetails.reduce((sum, p, idx) =>
                                                idx === index ? sum : sum + (p.amount || 0), 0
                                            );
                                            const maxAmountForThis = Math.max(0, grandTotal - currentPaymentTotal);

                                            return (
                                                <div key={index} className="ckin-payment-row">
                                                    <select
                                                        className="ckin-edit-input ckin-payment-method-select"
                                                        value={payment.method || 'Cash'}
                                                        onChange={(e) => handlePaymentDetailChange(index, 'method', e.target.value)}
                                                    >
                                                        <option value={payment.method}>{payment.method}</option>
                                                        {availableMethods.map(m => (
                                                            <option key={m} value={m}>{m}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        className="ckin-edit-input ckin-payment-amount-input"
                                                        placeholder="Amount"
                                                        value={payment.amount || 0}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            const maxAmount = values.paymentStatus === 'Partial Paid'
                                                                ? (values.amountPaid || grandTotal)
                                                                : grandTotal;
                                                            if (val > maxAmount) {
                                                                toast.warning(`Amount cannot exceed ₹${maxAmount.toFixed(2)}`);
                                                                return;
                                                            }
                                                            const newPayments = [...form.values.paymentDetails];
                                                            newPayments[index].amount = val;
                                                            form.setFieldValue('paymentDetails', newPayments);
                                                        }}
                                                        min="0"
                                                        max={values.paymentStatus === 'Partial Paid' ? (values.amountPaid || grandTotal) : grandTotal}
                                                    />
                                                    <input
                                                        type="text"
                                                        className="ckin-edit-input ckin-payment-ref-input"
                                                        placeholder="Reference (optional)"
                                                        value={payment.reference || ''}
                                                        onChange={(e) => handlePaymentDetailChange(index, 'reference', e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="ckin-remove-payment-btn"
                                                        onClick={() => handleRemovePaymentDetail(index)}
                                                        disabled={editPaymentDetails.length <= 1}
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        <div className="ckin-payment-actions">
                                            <button
                                                type="button"
                                                className="ckin-add-payment-btn"
                                                onClick={handleAddPaymentDetail}
                                                disabled={editPaymentDetails.length >= PAYMENT_METHODS.length}
                                            >
                                                <FaPlus /> Add Payment Method
                                            </button>
                                            {editPaymentDetails.length >= PAYMENT_METHODS.length && (
                                                <small className="ckin-field-hint">All payment methods are already added</small>
                                            )}
                                        </div>
                                        {editPaymentDetails.length > 0 && (
                                            <small className="ckin-field-hint">
                                                Total: ₹{editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                                                {' | '}Type: {new Set(editPaymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : (editPaymentDetails[0]?.method || 'Cash')}
                                                {editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0) > (liveCalculatedPrice?.grandTotal || checkIn.grandTotal || 0) && (
                                                    <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                                                        ⚠️ Exceeds Grand Total!
                                                    </span>
                                                )}
                                            </small>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Extra Requirements</span>
                                <div className="ckin-edit-requirements">
                                    {editExtraRequirements.map((req, index) => (
                                        <div key={index} className="ckin-edit-req-row">
                                            <input
                                                type="text"
                                                placeholder="Description"
                                                value={req.description || ''}
                                                onChange={(e) => handleEditExtraRequirementChange(index, 'description', e.target.value)}
                                                className="ckin-edit-req-desc"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={req.price || 0}
                                                onChange={(e) => handleEditExtraRequirementChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                className="ckin-edit-req-price"
                                            />
                                            <button type="button" className="ckin-edit-req-remove" onClick={() => handleRemoveEditExtraRequirement(index)}>
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="ckin-add-req-btn" onClick={handleAddEditExtraRequirement}>
                                        <FaPlus /> Add Requirement
                                    </button>
                                </div>
                            </div>

                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">ID Proofs</span>
                                <div className="ckin-edit-id-proofs">
                                    {editIdProofs.map((proof, index) => (
                                        <div key={index} className="ckin-edit-proof-row">
                                            <span className="ckin-edit-proof-name">{proof.fileName}</span>
                                            <select
                                                value={proof.label || 'Other'}
                                                onChange={(e) => handleEditProofLabelChange(index, e.target.value)}
                                                className="ckin-edit-proof-select"
                                            >
                                                {idProofLabels.map(label => (
                                                    <option key={label} value={label}>{label}</option>
                                                ))}
                                            </select>
                                            <button type="button" className="ckin-edit-req-remove" onClick={() => handleRemoveEditProof(index)}>
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="ckin-edit-proof-add-row">
                                        <input
                                            type="file"
                                            id="edit-proof-input"
                                            accept="image/*"
                                            onChange={(e) => setNewProofFile(e.target.files[0])}
                                            className="ckin-edit-proof-file-input"
                                        />
                                        <select
                                            value={newProofLabel}
                                            onChange={(e) => setNewProofLabel(e.target.value)}
                                            className="ckin-edit-proof-select"
                                        >
                                            {idProofLabels.map(label => (
                                                <option key={label} value={label}>{label}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="ckin-add-proof-btn" onClick={handleAddEditProof}>
                                            <FaPlus /> Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Notes</span>
                                <textarea
                                    className="ckin-edit-textarea"
                                    value={editedCheckIn.notes || ''}
                                    onChange={(e) => setEditedCheckIn(prev => ({ ...prev, notes: e.target.value }))}
                                    rows="2"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="ckin-details-grid">
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Guest Name</span>
                                <span className="ckin-detail-value">{checkIn.customerName}</span>
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Phone</span>
                                <span className="ckin-detail-value">{checkIn.customerPhone}</span>
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Email</span>
                                <span className="ckin-detail-value">{checkIn.customerEmail || 'N/A'}</span>
                            </div>
                            {checkIn.bookingNumber && (
                                <div className="ckin-detail-row">
                                    <span className="ckin-detail-label">Booking #</span>
                                    <span className="ckin-detail-value ckin-booking-number-value">
                                        {checkIn.bookingNumber}
                                    </span>
                                </div>
                            )}
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Booking Type</span>
                                <span className="ckin-detail-value">
                                    <span className={`ckin-booking-type-badge ${checkIn.bookingType === 'perNight' ? 'ckin-pernight-badge' : 'ckin-simple-badge'}`}>
                                        {checkIn.bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}
                                    </span>
                                </span>
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Rooms</span>
                                <div className="ckin-detail-value ckin-rooms-list">
                                    {checkIn.roomDetails?.map((room, idx) => (
                                        <div key={idx} className="ckin-room-detail-item">
                                            <strong>{room.roomNumber}</strong> ({room.categoryName})
                                            <br />
                                            <small>Check-in: {new Date(room.checkInDate).toLocaleString()}</small>
                                            <br />
                                            <small>Check-out: {new Date(room.checkOutDate).toLocaleString()}</small>
                                            <br />
                                            <small>Price: ₹{room.price.toFixed(2)}</small>
                                        </div>
                                    )) || checkIn.roomNumber}
                                </div>
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Check-in</span>
                                <span className="ckin-detail-value">{new Date(checkIn.checkInDate).toLocaleString()}</span>
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Check-out</span>
                                <span className="ckin-detail-value">{new Date(checkIn.checkOutDate).toLocaleString()}</span>
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Duration</span>
                                <span className="ckin-detail-value">{checkIn.durationLabel}</span>
                            </div>

                            {/* ===== PAYMENT DETAILS - VIEW ===== */}
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Payment Type</span>
                                <span className="ckin-detail-value">
                                    <span className={`ckin-payment-type-badge ckin-payment-type-${(checkIn.paymentType || 'Cash').toLowerCase()}`}>
                                        {checkIn.paymentType || 'Cash'}
                                    </span>
                                </span>
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Payment Details</span>
                                <div className="ckin-detail-value">
                                    {renderPaymentDetails()}
                                </div>
                            </div>

                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Status</span>
                                <span className={`ckin-status-badge ckin-status-${checkIn.status?.toLowerCase()}`}>
                                    {checkIn.status}
                                </span>
                            </div>
                            <div className="ckin-detail-row">
                                <span className="ckin-detail-label">Payment</span>
                                <span className={`ckin-status-badge ckin-status-${checkIn.paymentStatus?.toLowerCase().replace(' ', '')}`}>
                                    {checkIn.paymentStatus}
                                </span>
                            </div>

                            {checkIn.extraRequirements && checkIn.extraRequirements.length > 0 && (
                                <div className="ckin-detail-row">
                                    <span className="ckin-detail-label">Extra Requirements</span>
                                    <div className="ckin-detail-value ckin-extra-req-list">
                                        {checkIn.extraRequirements.map((req, idx) => (
                                            <div key={idx} className="ckin-extra-req-list-item">
                                                {req.description}: ₹{req.price.toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {checkIn.idProofs && checkIn.idProofs.length > 0 && (
                                <div className="ckin-detail-row">
                                    <span className="ckin-detail-label">ID Proofs</span>
                                    <div className="ckin-detail-value ckin-id-proofs-list">
                                        {checkIn.idProofs.map(proof => (
                                            <div key={proof.proofId}>
                                                <strong>{proof.label}:</strong> {proof.fileName}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {checkIn.removedRooms && checkIn.removedRooms.length > 0 && (
                                <div className="ckin-detail-row">
                                    <span className="ckin-detail-label">Removed/Changed Rooms History</span>
                                    <div className="ckin-detail-value ckin-removed-rooms-list">
                                        {checkIn.removedRooms.map((room, idx) => (
                                            <div key={idx} className="ckin-removed-room-item">
                                                <div className="ckin-removed-room-header">
                                                    <strong>{room.roomNumber}</strong> ({room.categoryName})
                                                    <span className="ckin-removed-room-status">Removed</span>
                                                </div>
                                                <div className="ckin-removed-room-details">
                                                    <div className="ckin-removed-room-date">
                                                        <span className="ckin-removed-label">Check-in:</span>
                                                        <span>{new Date(room.checkInDate).toLocaleString()}</span>
                                                    </div>
                                                    <div className="ckin-removed-room-date">
                                                        <span className="ckin-removed-label">Removed on:</span>
                                                        <span>{new Date(room.checkOutDate).toLocaleString()}</span>
                                                    </div>
                                                    <div className="ckin-removed-room-date">
                                                        <span className="ckin-removed-label">Original Check-out:</span>
                                                        <span>{new Date(room.actualCheckOut).toLocaleString()}</span>
                                                    </div>
                                                    <div className="ckin-removed-room-price">
                                                        <span className="ckin-removed-label">Price Charged:</span>
                                                        <span className="ckin-removed-price-value">₹{room.price.toFixed(2)}</span>
                                                    </div>
                                                    <div className="ckin-removed-room-hours">
                                                        <span className="ckin-removed-label">Hours Used:</span>
                                                        <span>{room.hoursUsed} hours ({room.durationLabel})</span>
                                                    </div>
                                                    {room.reason && (
                                                        <div className="ckin-removed-room-reason">
                                                            <span className="ckin-removed-label">Reason:</span>
                                                            <span>{room.reason}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {checkIn.isExtended && (
                                <div className="ckin-detail-row">
                                    <span className="ckin-detail-label">Extended</span>
                                    <span className="ckin-detail-value ckin-extended-note">
                                        Yes - Original check-out: {new Date(checkIn.originalCheckOut).toLocaleString()}
                                    </span>
                                </div>
                            )}

                            {checkIn.notes && (
                                <div className="ckin-detail-row">
                                    <span className="ckin-detail-label">Notes</span>
                                    <span className="ckin-detail-value">{checkIn.notes}</span>
                                </div>
                            )}

                            <div className="ckin-detail-row ckin-price-breakdown-row">
                                <span className="ckin-detail-label">Price Breakdown</span>
                                {renderPriceBreakdown()}
                            </div>
                        </div>
                    )}
                </div>

                <div className="ckin-modal-footer">
                    {!isEditing && checkIn.status === 'Active' && (
                        <>
                            <button
                                className="ckin-change-room-btn"
                                onClick={() => {
                                    onOpenChangeRoom(checkIn);
                                    onClose();
                                }}
                            >
                                <FaExchangeAlt /> Change Room
                            </button>
                            <button
                                className="ckin-add-room-btn"
                                onClick={() => {
                                    onOpenAddRoom(checkIn);
                                    onClose();
                                }}
                            >
                                <FaPlusSquare /> Add Room
                            </button>
                            <button
                                className="ckin-remove-room-btn"
                                onClick={() => {
                                    onOpenRemoveRoom(checkIn);
                                    onClose();
                                }}
                            >
                                <FaTrashAlt /> Remove Room
                            </button>
                            <button className="ckin-extend-btn" onClick={() => onExtend(checkIn)}>
                                <FaSync /> Extend
                            </button>
                        </>
                    )}
                    {!isEditing && (
                        <>
                            <button
                                className="ckin-whatsapp-btn"
                                onClick={() => onSendWhatsApp(checkIn)}
                                disabled={isWhatsAppSending}
                            >
                                {isWhatsAppSending ? (
                                    <>
                                        <div className="ckin-loading-spinner small"></div>
                                        Sending...
                                    </>
                                ) : (
                                    <><FaWhatsapp /> WhatsApp</>
                                )}
                            </button>
                            <button
                                className="ckin-export-btn"
                                onClick={() => onGeneratePDF(checkIn)}
                                disabled={isPDFGenerating}
                            >
                                {isPDFGenerating ? (
                                    <>
                                        <div className="ckin-loading-spinner small"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <><FaFilePdf /> PDF</>
                                )}
                            </button>
                            <button
                                className="ckin-export-btn"
                                onClick={() => onPrintAndWhatsApp(checkIn)}
                                disabled={isPrintAndWhatsAppProcessing}
                            >
                                {isPrintAndWhatsAppProcessing ? (
                                    <>
                                        <div className="ckin-loading-spinner small"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <><FaPrint /> PDF + WhatsApp</>
                                )}
                            </button>
                        </>
                    )}
                    <button
                        className={`ckin-update-btn ${isEditing ? 'ckin-save-btn' : ''}`}
                        onClick={isEditing ? handleSaveEdit : () => setIsEditing(true)}
                    >
                        {isEditing ? <FaSave /> : <FaEdit />}
                        {isEditing ? "Save" : "Update"}
                    </button>
                    {!isEditing && (
                        <button className="ckin-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                            <FaTrash /> Delete
                        </button>
                    )}
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="ckin-confirm-dialog-overlay">
                    <div className="ckin-confirm-dialog">
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete check-in {checkIn.checkInNumber}? This action cannot be undone.</p>
                        <div className="ckin-confirm-buttons">
                            <button className="ckin-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className="ckin-confirm-delete" onClick={() => { onDelete(checkIn.checkInId); setShowDeleteConfirm(false); }}>
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
// MAIN COMPONENT
// ============================================
const CheckIn = () => {
    const [showForm, setShowForm] = useState(false);
    const [checkIns, setCheckIns] = useState([]);
    const [selectedCheckIn, setSelectedCheckIn] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);

    const [filterStatuses, setFilterStatuses] = useState(['Active', 'Extended']);
    const [filterDate, setFilterDate] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [timeFilter, setTimeFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [checkinForPrint, setCheckinForPrint] = useState(null);

    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const statusFilterRef = useRef(null);

    // ===== LOADING STATES FOR BUTTONS =====
    const [isPDFGenerating, setIsPDFGenerating] = useState(false);
    const [isWhatsAppSending, setIsWhatsAppSending] = useState(false);
    const [isPrintAndWhatsAppProcessing, setIsPrintAndWhatsAppProcessing] = useState(false);
    const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
    const [isExtending, setIsExtending] = useState(false);
    const [isChangingRoom, setIsChangingRoom] = useState(false);
    const [isAddingRoom, setIsAddingRoom] = useState(false);
    const [isRemovingRoom, setIsRemovingRoom] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pagination
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCheckIns: 0,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false,
        startIndex: 0,
        endIndex: 0
    });

    // Customer search
    const [customers, setCustomers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Add Customer Modal
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);

    // Booking search
    const [bookingSearch, setBookingSearch] = useState("");
    const [bookings, setBookings] = useState([]);
    const [showBookingDropdown, setShowBookingDropdown] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [isSearchingBookings, setIsSearchingBookings] = useState(false);

    // Customer creation inline
    const [showCreateCustomer, setShowCreateCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({
        customerName: '',
        contactNumber: '',
        email: ''
    });
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

    // Room availability
    const [availableRooms, setAvailableRooms] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const [selectedRooms, setSelectedRooms] = useState([]);

    // File upload
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadedFileLabels, setUploadedFileLabels] = useState([]);
    const fileInputRef = useRef(null);

    // ===== MODAL STATES =====
    const [showChangeRoomModal, setShowChangeRoomModal] = useState(false);
    const [changeRoomData, setChangeRoomData] = useState(null);
    const [showAddRoomModal, setShowAddRoomModal] = useState(false);
    const [addRoomData, setAddRoomData] = useState(null);
    const [showRemoveRoomModal, setShowRemoveRoomModal] = useState(false);
    const [removeRoomData, setRemoveRoomData] = useState(null);

    // Extension modal
    const [showExtensionModal, setShowExtensionModal] = useState(false);
    const [extendCheckIn, setExtendCheckIn] = useState(null);

    // Checkout modal
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [checkoutData, setCheckoutData] = useState(null);

    // Price calculation state for create form
    const [calculatedPrice, setCalculatedPrice] = useState(null);
    const [bookingType, setBookingType] = useState('simple');
    const [editableRoomPrices, setEditableRoomPrices] = useState([]);

    // Ref for Formik
    const formikRef = useRef(null);

    // ============================================
    // EFFECTS
    // ============================================
    useEffect(() => {
        window.scrollTo(0, 0);
        fetchCategories();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        fetchCheckIns(debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter);
    }, [debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter, pagination.currentPage]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (statusFilterRef.current && !statusFilterRef.current.contains(e.target)) {
                setShowStatusDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ============================================
    // API CALLS
    // ============================================
    const fetchCategories = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/category/get-categories?limit=100`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) {
                setCategories(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    const fetchCheckIns = async (search = '', statuses = [], date = '', time = '', year = '') => {
        try {
            setIsLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/checkin/get-checkins`);
            url.searchParams.append('page', pagination.currentPage);
            url.searchParams.append('limit', pagination.limit);
            if (search) url.searchParams.append('search', search);
            if (statuses && statuses.length > 0) {
                url.searchParams.append('status', statuses.join(','));
            }
            if (date) url.searchParams.append('startDate', date);
            if (time) url.searchParams.append('timeFilter', time);
            if (year) url.searchParams.append('yearFilter', year);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setCheckIns(data.data || []);
                if (data.pagination) {
                    setPagination({
                        currentPage: data.pagination.currentPage,
                        totalPages: data.pagination.totalPages,
                        totalCheckIns: data.pagination.totalCheckIns,
                        limit: data.pagination.limit,
                        hasNextPage: data.pagination.hasNextPage,
                        hasPrevPage: data.pagination.hasPrevPage,
                        startIndex: data.pagination.startIndex,
                        endIndex: data.pagination.endIndex
                    });
                }
            } else {
                throw new Error(data.message || 'Failed to fetch check-ins');
            }
        } catch (err) {
            console.error("Error fetching check-ins:", err);
            toast.error("Failed to fetch check-ins");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCustomers = async (search) => {
        try {
            const url = new URL(`${import.meta.env.VITE_API_URL}/customer/get-customers`);
            url.searchParams.append('search', search);
            url.searchParams.append('limit', 10);
            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setCustomers(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    const fetchBookingsForCheckin = async (search) => {
        try {
            setIsSearchingBookings(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/checkin/search-bookings`);
            if (search && search.trim() !== '') {
                url.searchParams.append('search', search.trim());
            }
            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setBookings(data.data || []);
                setShowBookingDropdown(data.data.length > 0);
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
        } finally {
            setIsSearchingBookings(false);
        }
    };

    const fetchAvailableRooms = async (checkInDate, checkOutDate, categoryId = '') => {
        try {
            setIsLoadingRooms(true);
            setSelectedRooms([]);
            setCalculatedPrice(null);
            setEditableRoomPrices([]);
            const url = new URL(`${import.meta.env.VITE_API_URL}/checkin/available-rooms`);
            url.searchParams.append('checkInDate', checkInDate);
            url.searchParams.append('checkOutDate', checkOutDate);
            if (categoryId) url.searchParams.append('categoryId', categoryId);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setAvailableRooms(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching available rooms:", error);
            toast.error("Failed to fetch available rooms");
        } finally {
            setIsLoadingRooms(false);
        }
    };

    const fetchAvailableRoomsForExt = async (checkInId, newDate) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/available-rooms-for-extension/${checkInId}?newDate=${new Date(newDate).toISOString()}`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) {
                return data.data || [];
            }
            return [];
        } catch (error) {
            console.error("Error fetching available rooms for extension:", error);
            toast.error("Failed to fetch available rooms");
            return [];
        }
    };

    const fetchAvailableRoomsForCheckInId = async (checkInId, checkInDate, checkOutDate) => {
        try {
            const url = new URL(`${import.meta.env.VITE_API_URL}/checkin/available-rooms`);
            url.searchParams.append('checkInDate', checkInDate);
            url.searchParams.append('checkOutDate', checkOutDate);
            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error("Error fetching available rooms:", error);
            toast.error("Failed to fetch available rooms");
            return [];
        }
    };

    // ============================================
    // ROOM HANDLERS WITH LOADING STATES
    // ============================================
    const handleChangeRoom = async (checkInId, oldRoomId, newRoomId) => {
        try {
            setIsChangingRoom(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/change-room/${checkInId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ oldRoomId, newRoomId }),
                    credentials: 'include'
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to change room");
            }
            toast.success("Room changed successfully!");
            setShowChangeRoomModal(false);
            setChangeRoomData(null);
            fetchCheckIns(debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter);
            setSelectedCheckIn(null);
        } catch (error) {
            console.error("Error changing room:", error);
            toast.error(error.message || "Error changing room");
        } finally {
            setIsChangingRoom(false);
        }
    };

    const handleAddRoom = async (checkInId, newRoomId) => {
        try {
            setIsAddingRoom(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/add-room/${checkInId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ newRoomId }),
                    credentials: 'include'
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to add room");
            }
            toast.success("Room added successfully!");
            setShowAddRoomModal(false);
            setAddRoomData(null);
            fetchCheckIns(debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter);
            setSelectedCheckIn(null);
        } catch (error) {
            console.error("Error adding room:", error);
            toast.error(error.message || "Error adding room");
        } finally {
            setIsAddingRoom(false);
        }
    };

    const handleRemoveRoom = async (checkInId, roomId, price, reason) => {
        try {
            setIsRemovingRoom(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/remove-room/${checkInId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roomId, price, reason }),
                    credentials: 'include'
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to remove room");
            }
            toast.success("Room removed successfully!");
            setShowRemoveRoomModal(false);
            setRemoveRoomData(null);
            fetchCheckIns(debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter);
            setSelectedCheckIn(null);
        } catch (error) {
            console.error("Error removing room:", error);
            toast.error(error.message || "Error removing room");
        } finally {
            setIsRemovingRoom(false);
        }
    };

    // ============================================
    // ADD CUSTOMER MODAL HANDLERS
    // ============================================
    const handleOpenAddCustomerModal = () => {
        setShowAddCustomerModal(true);
        setShowCustomerDropdown(false);
    };

    const handleCloseAddCustomerModal = () => {
        setShowAddCustomerModal(false);
    };

    const handleAddCustomer = async (customerData) => {
        try {
            setIsAddingCustomer(true);

            if (!customerData.customerName || !customerData.contactNumber) {
                toast.error("Name and Phone are required");
                setIsAddingCustomer(false);
                return;
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/customer/create-customer`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(customerData),
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create customer");
            }

            toast.success("Customer created successfully!");
            setSelectedCustomer(data.data);
            setCustomerSearch(data.data.customerName);
            setShowAddCustomerModal(false);

            if (data.data.customerName) {
                fetchCustomers(data.data.customerName);
            }
        } catch (error) {
            console.error("Error creating customer:", error);
            toast.error(error.message || "Error creating customer");
        } finally {
            setIsAddingCustomer(false);
        }
    };

    // ============================================
    // WHATSAPP INTEGRATION WITH LOADING
    // ============================================
    const sendWhatsAppMessage = async (checkIn) => {
        if (!checkIn) return;
        if (isWhatsAppSending) return;

        try {
            setIsWhatsAppSending(true);

            const customerPhone = checkIn.customerPhone?.replace(/\D/g, '') || '';
            if (!customerPhone) {
                toast.error("Customer phone number not available");
                setIsWhatsAppSending(false);
                return;
            }

            const roomNumbers = checkIn.roomDetails?.map(r => r.roomNumber).join(', ') || checkIn.roomNumber;
            const durationDisplay = checkIn.bookingType === 'perNight' ? '🌙 Night Stay' : checkIn.durationLabel;

            const message = `🏨 *CHECK-IN COMPLETE* 🏨

Hello ${checkIn.customerName},

Your check-in has been completed successfully!

📋 *Check-in Details:*
🆔 Check-in #: ${checkIn.checkInNumber}
🛏️ Room(s): ${roomNumbers}
📅 Check-in: ${new Date(checkIn.checkInDate).toLocaleString()}
📅 Check-out: ${new Date(checkIn.checkOutDate).toLocaleString()}
⏱️ Duration: ${durationDisplay}

💰 *Payment Summary:*
📊 Subtotal: ₹${(checkIn.subtotal || 0).toFixed(2)}
🧾 Tax (${checkIn.taxSlab || 18}%): ₹${(checkIn.taxAmount || 0).toFixed(2)}
💰 Grand Total: ₹${(checkIn.grandTotal || 0).toFixed(2)}`;

            let paymentMessage = '';
            if (checkIn.amountPaid > 0) {
                paymentMessage += `💳 Amount Paid: ₹${(checkIn.amountPaid || 0).toFixed(2)}\n`;
            }
            if (checkIn.balanceAmount > 0) {
                paymentMessage += `⚖️ Balance: ₹${(checkIn.balanceAmount || 0).toFixed(2)}\n`;
            }
            if (checkIn.paymentType) {
                paymentMessage += `💳 Payment Type: ${checkIn.paymentType}\n`;
            }

            const finalMessage = message +
                (paymentMessage ? `\n${paymentMessage}` : '') +
                `

Thank you for choosing us! 🙏
We hope you have a pleasant stay!`;

            const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(finalMessage)}`;
            window.open(whatsappUrl, '_blank');

            toast.success("WhatsApp message opened!");
        } catch (error) {
            console.error("Error sending WhatsApp:", error);
            toast.error("Failed to send WhatsApp message");
        } finally {
            setIsWhatsAppSending(false);
        }
    };

    // ============================================
    // PDF GENERATION WITH LOADING
    // ============================================
    const generatePDF = async (checkIn) => {
        if (!checkIn) return;
        if (isPDFGenerating) return;

        try {
            setIsPDFGenerating(true);
            setCheckinForPrint(checkIn);
            await new Promise(resolve => setTimeout(resolve, 500));

            const element = document.getElementById("checkin-pdf");
            if (!element) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const retryElement = document.getElementById("checkin-pdf");
                if (!retryElement) {
                    throw new Error("PDF print element not found");
                }
            }

            const addFooterToEachPage = (pdf) => {
                const totalPages = pdf.internal.getNumberOfPages();
                const pageHeight = pdf.internal.pageSize.getHeight();

                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(8);
                    pdf.setFont("helvetica", "italic");
                    pdf.setTextColor(100, 100, 100);

                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const text = "THIS IS A COMPUTER GENERATED BILL";
                    const textWidth = pdf.getTextWidth(text);
                    const xPosition = (pageWidth - textWidth) / 2;
                    const yPosition = pageHeight - 10;

                    pdf.text(text, xPosition, yPosition);
                    pdf.setDrawColor(200, 200, 200);
                    pdf.line(15, yPosition - 3, pageWidth - 15, yPosition - 3);
                }

                return pdf;
            };

            const opt = {
                filename: `CheckIn_${checkIn.checkInNumber}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    letterRendering: true
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait"
                },
                pagebreak: {
                    mode: ['css', 'legacy'],
                    avoid: ['tr', '.invoice-footer']
                },
                margin: [0, 0, 20, 0]
            };

            await html2pdf()
                .set(opt)
                .from(element)
                .toPdf()
                .get('pdf')
                .then((pdf) => {
                    return addFooterToEachPage(pdf);
                })
                .save();

            toast.success("PDF generated successfully!");

        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export PDF");
        } finally {
            setIsPDFGenerating(false);
            setCheckinForPrint(null);
        }
    };

    const handlePrintAndWhatsApp = async (checkIn) => {
        if (!checkIn) return;
        if (isPrintAndWhatsAppProcessing) return;

        try {
            setIsPrintAndWhatsAppProcessing(true);
            await generatePDF(checkIn);
            await new Promise(resolve => setTimeout(resolve, 1500));
            await sendWhatsAppMessage(checkIn);

        } catch (error) {
            console.error("Error in Print and WhatsApp:", error);
            toast.error("Failed to complete Print and WhatsApp action");
        } finally {
            setIsPrintAndWhatsAppProcessing(false);
        }
    };

    // ============================================
    // EXPORT EXCEL WITH LOADING
    // ============================================
    const handleExportExcel = async () => {
        if (isExporting) return;

        try {
            setIsExporting(true);
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (filterStatuses && filterStatuses.length > 0) {
                params.append('status', filterStatuses.join(','));
            }
            if (filterDate) params.append('startDate', filterDate);
            if (timeFilter) params.append('timeFilter', timeFilter);
            if (yearFilter) params.append('yearFilter', yearFilter);

            const loadingToast = toast.loading("Fetching all check-ins for export...");

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/export-checkins?${params.toString()}`,
                { credentials: 'include' }
            );

            const data = await response.json();
            toast.dismiss(loadingToast);

            if (!data.success) {
                throw new Error(data.message || "Failed to fetch check-ins for export");
            }

            const allCheckIns = data.data;

            if (allCheckIns.length === 0) {
                toast.warn("No check-ins to export");
                setIsExporting(false);
                return;
            }

            const excelData = allCheckIns.map(checkIn => ({
                'Check-in #': checkIn.checkInNumber,
                'Booking #': checkIn.bookingNumber || 'N/A',
                'Guest Name': checkIn.customerName,
                'Phone': checkIn.customerPhone,
                'Email': checkIn.customerEmail || 'N/A',
                'Room(s)': checkIn.roomDetails?.map(r => r.roomNumber).join(', ') || checkIn.roomNumber,
                'Category': checkIn.categoryName || 'N/A',
                'Booking Type': checkIn.bookingType || 'simple',
                'Check-in Date': new Date(checkIn.checkInDate).toLocaleString(),
                'Check-out Date': new Date(checkIn.checkOutDate).toLocaleString(),
                'Duration': checkIn.durationLabel || 'N/A',
                'Total Hours': checkIn.totalHours || 0,
                'Base Price': `₹${(checkIn.basePrice || 0).toFixed(2)}`,
                'Extra Hours': `₹${(checkIn.extraHoursPrice || 0).toFixed(2)}`,
                'Extra Requirements': `₹${(checkIn.extraRequirementsTotal || 0).toFixed(2)}`,
                'Subtotal': `₹${(checkIn.subtotal || 0).toFixed(2)}`,
                'Tax Rate': `${checkIn.taxSlab || 18}%`,
                'Tax Amount': `₹${(checkIn.taxAmount || 0).toFixed(2)}`,
                'Grand Total': `₹${(checkIn.grandTotal || 0).toFixed(2)}`,
                'Amount Paid': `₹${(checkIn.amountPaid || 0).toFixed(2)}`,
                'Advance Paid': `₹${(checkIn.advancePaid || 0).toFixed(2)}`,
                'Balance': `₹${(checkIn.balanceAmount || 0).toFixed(2)}`,
                'Payment Status': checkIn.paymentStatus || 'Not Paid',
                'Payment Type': checkIn.paymentType || 'Cash',
                'Status': checkIn.status || 'Active',
                'Is Extended': checkIn.isExtended ? 'Yes' : 'No',
                'Notes': checkIn.notes || '',
                'Created At': new Date(checkIn.createdAt).toLocaleString(),
                'Updated At': new Date(checkIn.updatedAt).toLocaleString()
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Check-ins");

            const colWidths = Object.keys(excelData[0]).map(key => ({
                wch: Math.max(key.length * 2, 15)
            }));
            worksheet['!cols'] = colWidths;

            let fileName = "checkins";
            if (timeFilter) fileName += `_${timeFilter.replace(/\s+/g, '_')}`;
            if (yearFilter) fileName += `_${yearFilter}`;
            if (filterStatuses && filterStatuses.length > 0) fileName += `_${filterStatuses.join('_')}`;
            fileName += ".xlsx";

            XLSX.writeFile(workbook, fileName);
            toast.success(`Exported ${allCheckIns.length} check-ins successfully!`);

        } catch (error) {
            console.error("Export error:", error);
            toast.error(error.message || "Failed to export check-ins");
        } finally {
            setIsExporting(false);
        }
    };

    // ============================================
    // PRICE CALCULATION FUNCTIONS
    // ============================================
    const calculatePricePreview = (checkInDate, checkOutDate, roomIds = selectedRooms, roomsPool = availableRooms, isPerNight = false) => {
        if (roomIds.length > 0 && roomsPool.length > 0) {
            const selectedRoomData = roomsPool.filter(r => roomIds.includes(r.roomId));
            let total = 0;
            let breakdown = [];
            let editablePrices = [];

            selectedRoomData.forEach(room => {
                const pricing = room.categoryDetails?.pricing;
                if (pricing) {
                    let price = 0;
                    let label = '';

                    if (isPerNight) {
                        // PER NIGHT MODE - Directly use perNight price
                        price = pricing.perNight || 0;
                        label = 'Night Stay';
                    } else {
                        // SIMPLE MODE - Duration based calculation
                        const start = new Date(checkInDate);
                        const end = new Date(checkOutDate);
                        const diffMs = end - start;
                        const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));

                        if (totalHours <= 6) {
                            price = pricing.per6Hours || 0;
                            label = '6 Hours';
                        } else if (totalHours <= 12) {
                            price = pricing.per12Hours || 0;
                            label = '12 Hours';
                        } else if (totalHours <= 24) {
                            price = pricing.perDay || 0;
                            label = '1 Day';
                        } else {
                            const days = Math.floor(totalHours / 24);
                            const remainingHours = totalHours % 24;
                            price = days * (pricing.perDay || 0);

                            if (remainingHours === 0) {
                                label = days === 1 ? '1 Day' : `${days} Days`;
                            } else if (remainingHours <= 6) {
                                price += pricing.per6Hours || 0;
                                label = days === 1 ? '1 Day + 6 Hours' : `${days} Days + 6 Hours`;
                            } else if (remainingHours <= 12) {
                                price += pricing.per12Hours || 0;
                                label = days === 1 ? '1 Day + 12 Hours' : `${days} Days + 12 Hours`;
                            } else {
                                price += pricing.perDay || 0;
                                label = days + 1 === 1 ? '1 Day' : `${days + 1} Days`;
                            }
                        }
                    }

                    total += price;
                    breakdown.push({
                        roomId: room.roomId,
                        roomNumber: room.roomNumber,
                        price: price,
                        label: label,
                        categoryName: room.categoryDetails?.categoryName
                    });
                    editablePrices.push({
                        roomId: room.roomId,
                        roomNumber: room.roomNumber,
                        price: price,
                        label: label,
                        categoryName: room.categoryDetails?.categoryName
                    });
                }
            });

            setCalculatedPrice({
                total: total,
                breakdown: breakdown
            });
            setEditableRoomPrices(editablePrices);
        } else {
            setCalculatedPrice(null);
            setEditableRoomPrices([]);
        }
    };

    const handleRoomPriceChange = (index, newPrice) => {
        const updated = [...editableRoomPrices];
        updated[index].price = parseFloat(newPrice) || 0;
        setEditableRoomPrices(updated);

        const total = updated.reduce((sum, room) => sum + room.price, 0);
        setCalculatedPrice(prev => ({
            ...prev,
            total: total,
            breakdown: updated.map(room => ({
                roomNumber: room.roomNumber,
                price: room.price,
                label: room.label
            }))
        }));
    };

    // ============================================
    // HANDLERS
    // ============================================
    const handleCustomerSearch = (value) => {
        setCustomerSearch(value);
        setShowCreateCustomer(false);
        if (value.length > 1) {
            fetchCustomers(value);
            setShowCustomerDropdown(true);
        } else {
            setShowCustomerDropdown(false);
        }
    };

    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setCustomerSearch(customer.customerName);
        setShowCustomerDropdown(false);
        setShowCreateCustomer(false);
    };

    const handleShowCreateCustomer = () => {
        setShowCustomerDropdown(false);
        setShowCreateCustomer(true);
        setNewCustomerData({ customerName: customerSearch || '', contactNumber: '', email: '' });
    };

    const handleCancelCreateCustomer = () => {
        setShowCreateCustomer(false);
        setCustomerSearch('');
        setNewCustomerData({ customerName: '', contactNumber: '', email: '' });
    };

    const handleStatusToggle = (status) => {
        setFilterStatuses(prev => {
            if (prev.includes(status)) {
                if (prev.length === 1) {
                    toast.warning("At least one status must be selected");
                    return prev;
                }
                return prev.filter(s => s !== status);
            } else {
                return [...prev, status];
            }
        });
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleClearStatuses = () => {
        setFilterStatuses(['Active', 'Extended']);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleBookingSearch = (value) => {
        setBookingSearch(value);
        if (value.length > 1) {
            fetchBookingsForCheckin(value);
        } else {
            setBookings([]);
            setShowBookingDropdown(false);
        }
    };

    const handleSelectBooking = async (booking) => {
        try {
            const now = new Date();
            const checkInDate = new Date(booking.checkInDate);
            const checkOutDate = new Date(booking.checkOutDate);

            if (now < checkInDate) {
                toast.error(`⏰ This booking cannot be checked in yet. Check-in starts on ${checkInDate.toLocaleString()}.`);
                return;
            }

            if (now > checkOutDate) {
                toast.error(`⏰ This booking has expired. Check-out was on ${checkOutDate.toLocaleString()}.`);
                return;
            }

            setSelectedBooking(booking);
            setBookingSearch(booking.bookingNumber + ' - ' + booking.customerName);
            setShowBookingDropdown(false);

            const customerResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/customer/get-customer/${booking.customerId}`,
                { credentials: 'include' }
            );
            const customerData = await customerResponse.json();

            const customer = customerData && customerData.success === false
                ? null
                : (customerData.data || customerData);

            if (customer && (customer.customerId || customer._id)) {
                setSelectedCustomer(customer);
                setCustomerSearch(customer.customerName);
            } else {
                toast.error("Could not load customer details for this booking");
            }

            // ✅ USE BOOKING DATES AS-IS - DO NOT RECALCULATE
            const checkInDateObj = new Date(booking.checkInDate);
            const checkOutDateObj = new Date(booking.checkOutDate);

            const checkInStr =
                checkInDateObj.getFullYear() + '-' +
                String(checkInDateObj.getMonth() + 1).padStart(2, '0') + '-' +
                String(checkInDateObj.getDate()).padStart(2, '0') + 'T' +
                String(checkInDateObj.getHours()).padStart(2, '0') + ':' +
                String(checkInDateObj.getMinutes()).padStart(2, '0');

            const checkOutStr =
                checkOutDateObj.getFullYear() + '-' +
                String(checkOutDateObj.getMonth() + 1).padStart(2, '0') + '-' +
                String(checkOutDateObj.getDate()).padStart(2, '0') + 'T' +
                String(checkOutDateObj.getHours()).padStart(2, '0') + ':' +
                String(checkOutDateObj.getMinutes()).padStart(2, '0');

            if (formikRef.current) {
                formikRef.current.setFieldValue('checkInDate', checkInStr);
                formikRef.current.setFieldValue('checkOutDate', checkOutStr);
                formikRef.current.setFieldValue('taxSlab', booking.taxSlab || 18);

                const combinedPaid = (booking.amountPaid || 0) + (booking.advancePaid || 0);
                formikRef.current.setFieldValue('amountPaid', combinedPaid);
                formikRef.current.setFieldValue('advancePaid', 0);

                if (booking.paymentStatus) {
                    formikRef.current.setFieldValue('paymentStatus', booking.paymentStatus);
                }

                if (booking.notes) {
                    formikRef.current.setFieldValue('notes', booking.notes);
                }

                if (booking.extraRequirements && booking.extraRequirements.length > 0) {
                    formikRef.current.setFieldValue('extraRequirements', booking.extraRequirements);
                }

                if (booking.paymentDetails && booking.paymentDetails.length > 0) {
                    formikRef.current.setFieldValue('paymentDetails', booking.paymentDetails);
                }

                // ✅ Set booking type from booking
                if (booking.bookingType) {
                    setBookingType(booking.bookingType);
                }
            }

            // ✅ FETCH ROOMS WITH BOOKING DATES
            const url = new URL(`${import.meta.env.VITE_API_URL}/checkin/available-rooms`);
            url.searchParams.append('checkInDate', checkInStr);
            url.searchParams.append('checkOutDate', checkOutStr);
            url.searchParams.append('bookingId', booking.bookingId);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setAvailableRooms(data.data || []);

                const bookingRoomIds = booking.roomIds || [];
                const availableRoomIds = data.data.map(r => r.roomId);

                const selectableRooms = bookingRoomIds.filter(id => availableRoomIds.includes(id));

                let finalSelectedRooms = [];
                if (selectableRooms.length > 0) {
                    finalSelectedRooms = selectableRooms;
                    setSelectedRooms(selectableRooms);
                } else if (bookingRoomIds.length > 0) {
                    finalSelectedRooms = bookingRoomIds;
                    setSelectedRooms(bookingRoomIds);
                }

                // ✅ Calculate price preview using booking data (not category)
                if (formikRef.current && finalSelectedRooms.length > 0) {
                    const { checkInDate, checkOutDate } = formikRef.current.values;
                    if (checkInDate && checkOutDate) {
                        // Use booking room details prices
                        const bookingRoomPrices = {};
                        if (booking.roomDetails) {
                            booking.roomDetails.forEach(room => {
                                bookingRoomPrices[room.roomId] = {
                                    price: room.price,
                                    label: room.durationLabel
                                };
                            });
                        }

                        // Calculate total from booking data
                        let total = 0;
                        let breakdown = [];
                        let editablePrices = [];

                        finalSelectedRooms.forEach(roomId => {
                            const roomData = data.data.find(r => r.roomId === roomId);
                            const bookingPrice = bookingRoomPrices[roomId];

                            if (bookingPrice) {
                                total += bookingPrice.price;
                                breakdown.push({
                                    roomId: roomId,
                                    roomNumber: roomData?.roomNumber || roomId,
                                    price: bookingPrice.price,
                                    label: bookingPrice.label || (bookingType === 'perNight' ? 'Night Stay' : ''),
                                    categoryName: roomData?.categoryDetails?.categoryName || ''
                                });
                                editablePrices.push({
                                    roomId: roomId,
                                    roomNumber: roomData?.roomNumber || roomId,
                                    price: bookingPrice.price,
                                    label: bookingPrice.label || (bookingType === 'perNight' ? 'Night Stay' : ''),
                                    categoryName: roomData?.categoryDetails?.categoryName || ''
                                });
                            } else {
                                // Fallback: use category price if booking price not available
                                const pricing = roomData?.categoryDetails?.pricing;
                                if (pricing) {
                                    let price = 0;
                                    let label = '';
                                    if (bookingType === 'perNight') {
                                        price = pricing.perNight || 0;
                                        label = 'Night Stay';
                                    } else {
                                        const start = new Date(checkInDate);
                                        const end = new Date(checkOutDate);
                                        const totalHours = Math.ceil((end - start) / (1000 * 60 * 60));
                                        if (totalHours <= 6) {
                                            price = pricing.per6Hours || 0;
                                            label = '6 Hours';
                                        } else if (totalHours <= 12) {
                                            price = pricing.per12Hours || 0;
                                            label = '12 Hours';
                                        } else if (totalHours <= 24) {
                                            price = pricing.perDay || 0;
                                            label = '1 Day';
                                        } else {
                                            const days = Math.floor(totalHours / 24);
                                            const remainingHours = totalHours % 24;
                                            price = days * (pricing.perDay || 0);
                                            if (remainingHours === 0) {
                                                label = days === 1 ? '1 Day' : `${days} Days`;
                                            } else if (remainingHours <= 6) {
                                                price += pricing.per6Hours || 0;
                                                label = days === 1 ? '1 Day + 6 Hours' : `${days} Days + 6 Hours`;
                                            } else if (remainingHours <= 12) {
                                                price += pricing.per12Hours || 0;
                                                label = days === 1 ? '1 Day + 12 Hours' : `${days} Days + 12 Hours`;
                                            } else {
                                                price += pricing.perDay || 0;
                                                label = days + 1 === 1 ? '1 Day' : `${days + 1} Days`;
                                            }
                                        }
                                    }
                                    total += price;
                                    breakdown.push({
                                        roomId: roomId,
                                        roomNumber: roomData?.roomNumber || roomId,
                                        price: price,
                                        label: label,
                                        categoryName: roomData?.categoryDetails?.categoryName || ''
                                    });
                                    editablePrices.push({
                                        roomId: roomId,
                                        roomNumber: roomData?.roomNumber || roomId,
                                        price: price,
                                        label: label,
                                        categoryName: roomData?.categoryDetails?.categoryName || ''
                                    });
                                }
                            }
                        });

                        setCalculatedPrice({
                            total: total,
                            breakdown: breakdown
                        });
                        setEditableRoomPrices(editablePrices);
                    }
                }
            }

            toast.success(`Booking ${booking.bookingNumber} loaded for check-in!`);

        } catch (error) {
            console.error("Error auto-filling booking:", error);
            toast.error("Failed to load booking details");
        }
    };

    const handleDateChange = (setFieldValue, checkInDate, checkOutDate) => {
        if (checkInDate && checkOutDate) {
            const start = new Date(checkInDate);
            const end = new Date(checkOutDate);

            if (end > start) {
                fetchAvailableRooms(checkInDate, checkOutDate);
                setTimeout(() => {
                    if (selectedRooms.length > 0) {
                        calculatePricePreview(checkInDate, checkOutDate, selectedRooms, availableRooms, bookingType === 'perNight');
                    }
                }, 500);
            } else if (end.getTime() === start.getTime()) {
                toast.warning("Check-in and Check-out time cannot be the same");
                setCalculatedPrice(null);
                setEditableRoomPrices([]);
            } else {
                toast.warning("Check-out must be after check-in time");
                setCalculatedPrice(null);
                setEditableRoomPrices([]);
            }
        }
    };

    const handleRoomSelection = (roomId) => {
        setSelectedRooms(prev => {
            const newSelection = prev.includes(roomId)
                ? prev.filter(id => id !== roomId)
                : [...prev, roomId];

            if (newSelection.length > 0) {
                if (formikRef.current) {
                    const { checkInDate, checkOutDate } = formikRef.current.values;
                    if (checkInDate && checkOutDate) {
                        calculatePricePreview(checkInDate, checkOutDate, newSelection, availableRooms, bookingType === 'perNight');
                    }
                }
            } else {
                setCalculatedPrice(null);
                setEditableRoomPrices([]);
            }

            return newSelection;
        });
    };

    const handleFileUpload = (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            const newFiles = Array.from(files).map(file => ({
                fileName: file.name,
                fileSize: file.size,
                file: file
            }));
            setUploadedFiles([...uploadedFiles, ...newFiles]);
            const newLabels = newFiles.map(() => 'Other');
            setUploadedFileLabels([...uploadedFileLabels, ...newLabels]);
        }
        event.target.value = '';
    };

    const handleLabelChange = (index, label) => {
        const newLabels = [...uploadedFileLabels];
        newLabels[index] = label;
        setUploadedFileLabels(newLabels);
    };

    const removeFile = (index) => {
        const newFiles = [...uploadedFiles];
        newFiles.splice(index, 1);
        setUploadedFiles(newFiles);
        const newLabels = [...uploadedFileLabels];
        newLabels.splice(index, 1);
        setUploadedFileLabels(newLabels);
    };

    const validatePaymentDetails = (values, grandTotal) => {
        if (values.paymentStatus === 'Not Paid') {
            return { valid: true };
        }

        const paymentTotal = (values.paymentDetails || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        if (paymentTotal > grandTotal) {
            return {
                valid: false,
                message: `Total payment (₹${paymentTotal.toFixed(2)}) cannot exceed Grand Total (₹${grandTotal.toFixed(2)})`
            };
        }

        if (values.paymentStatus === 'Partial Paid') {
            const amountPaid = parseFloat(values.amountPaid) || 0;
            if (amountPaid > grandTotal) {
                return {
                    valid: false,
                    message: `Amount paid (₹${amountPaid.toFixed(2)}) cannot exceed Grand Total (₹${grandTotal.toFixed(2)})`
                };
            }
        }

        return { valid: true };
    };

    // ============================================
    // SET DATES AFTER CUSTOMER SELECTION
    // ============================================
    const setDatesAfterCustomerSelect = (setFieldValue, isPerNight) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const checkInStr = `${year}-${month}-${day}T${hours}:${minutes}`;

        let checkOutStr;
        if (isPerNight) {
            // Night Mode: Next day 10:00 AM
            const checkOut = new Date(now);
            checkOut.setDate(checkOut.getDate() + 1);
            checkOut.setHours(10, 0, 0, 0);
            const outYear = checkOut.getFullYear();
            const outMonth = String(checkOut.getMonth() + 1).padStart(2, '0');
            const outDay = String(checkOut.getDate()).padStart(2, '0');
            const outHours = String(checkOut.getHours()).padStart(2, '0');
            const outMinutes = String(checkOut.getMinutes()).padStart(2, '0');
            checkOutStr = `${outYear}-${outMonth}-${outDay}T${outHours}:${outMinutes}`;
        } else {
            // Simple Mode: Tomorrow same time
            const checkOut = new Date(now);
            checkOut.setDate(checkOut.getDate() + 1);
            const outYear = checkOut.getFullYear();
            const outMonth = String(checkOut.getMonth() + 1).padStart(2, '0');
            const outDay = String(checkOut.getDate()).padStart(2, '0');
            const outHours = String(checkOut.getHours()).padStart(2, '0');
            const outMinutes = String(checkOut.getMinutes()).padStart(2, '0');
            checkOutStr = `${outYear}-${outMonth}-${outDay}T${outHours}:${outMinutes}`;
        }

        setFieldValue('checkInDate', checkInStr);
        setFieldValue('checkOutDate', checkOutStr);

        // ✅ Fetch rooms after dates are set
        setTimeout(() => {
            fetchAvailableRooms(checkInStr, checkOutStr);
        }, 300);
    };

    // ============================================
    // CREATE CHECK-IN - UPDATED WITH PER NIGHT & EDITABLE PRICES
    // ============================================
    const handleCreateCheckIn = async (values, { resetForm, setFieldError }) => {
        try {
            setIsFormSubmitting(true);

            if (!selectedCustomer) {
                toast.error("Please select a customer");
                setIsFormSubmitting(false);
                return;
            }

            if (selectedRooms.length === 0) {
                toast.error("Please select at least one room");
                setIsFormSubmitting(false);
                return;
            }

            // Build room details with editable prices
            const roomDetails = editableRoomPrices.map(room => {
                const originalRoom = availableRooms.find(r => r.roomId === room.roomId);
                return {
                    roomId: room.roomId,
                    roomNumber: room.roomNumber,
                    categoryId: originalRoom?.categoryId || '',
                    categoryName: room.categoryName || '',
                    checkInDate: values.checkInDate,
                    checkOutDate: values.checkOutDate,
                    price: room.price,
                    totalHours: 0,
                    totalDays: 0,
                    remainingHours: 0,
                    durationLabel: room.label || (bookingType === 'perNight' ? 'Night Stay' : '')
                };
            });

            // Calculate totals
            const totalBasePrice = roomDetails.reduce((sum, room) => sum + room.price, 0);
            const extrasTotal = (values.extraRequirements || []).reduce((sum, req) => sum + (parseFloat(req.price) || 0), 0);
            const subtotal = totalBasePrice + extrasTotal;
            const taxSlabValue = parseInt(values.taxSlab) || 18;
            const taxAmount = (subtotal * taxSlabValue) / 100;
            const grandTotal = subtotal + taxAmount;

            // Validate payment details
            const validation = validatePaymentDetails(values, grandTotal);
            if (!validation.valid) {
                toast.error(validation.message);
                setIsFormSubmitting(false);
                return;
            }

            const formData = new FormData();
            formData.append('customerId', selectedCustomer.customerId);
            formData.append('customerName', selectedCustomer.customerName);
            formData.append('customerPhone', selectedCustomer.contactNumber);
            formData.append('customerEmail', selectedCustomer.email || '');
            formData.append('roomIds', JSON.stringify(selectedRooms));
            formData.append('roomDetails', JSON.stringify(roomDetails));
            formData.append('checkInDate', values.checkInDate);
            formData.append('checkOutDate', values.checkOutDate);
            formData.append('bookingType', bookingType);
            formData.append('durationLabel', bookingType === 'perNight' ? 'Night Stay' : (calculatedPrice?.breakdown[0]?.label || ''));
            formData.append('taxSlab', values.taxSlab);
            formData.append('amountPaid', values.amountPaid || 0);
            formData.append('advancePaid', values.advancePaid || 0);
            formData.append('notes', values.notes || '');
            formData.append('bookingId', selectedBooking?.bookingId || '');
            formData.append('paymentStatus', values.paymentStatus || 'Not Paid');

            if (values.extraRequirements && values.extraRequirements.length > 0) {
                formData.append('extraRequirements', JSON.stringify(values.extraRequirements));
            }

            if (values.paymentDetails && values.paymentDetails.length > 0) {
                formData.append('paymentDetails', JSON.stringify(values.paymentDetails));
            }

            if (uploadedFiles.length > 0) {
                uploadedFiles.forEach((file, index) => {
                    formData.append('idProofs', file.file);
                });
                formData.append('idProofLabels', JSON.stringify(uploadedFileLabels));
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/create-checkin`,
                {
                    method: "POST",
                    body: formData,
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create check-in");
            }

            toast.success(`Check-in created successfully with ${selectedRooms.length} room(s)!`);

            if (data.data) {
                await sendWhatsAppMessage(data.data);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await generatePDF(data.data);
            }

            resetForm();
            setUploadedFiles([]);
            setUploadedFileLabels([]);
            setSelectedCustomer(null);
            setCustomerSearch("");
            setAvailableRooms([]);
            setSelectedRooms([]);
            setCalculatedPrice(null);
            setEditableRoomPrices([]);
            setBookingType('simple');
            setSelectedBooking(null);
            setBookingSearch("");
            setShowForm(false);
            fetchCheckIns(debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter);
        } catch (error) {
            console.error("Error creating check-in:", error);
            toast.error(error.message || "Error creating check-in");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    const handleUpdateCheckIn = async (checkInId, values) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/update-checkin/${checkInId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update check-in");
            }

            toast.success("Check-in updated successfully!");
            fetchCheckIns(debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter);
            setSelectedCheckIn(null);
        } catch (error) {
            console.error("Error updating check-in:", error);
            toast.error(error.message || "Error updating check-in");
        }
    };

    const handleCheckout = async (checkInId, paymentData) => {
        if (isCheckoutProcessing) return;

        try {
            setIsCheckoutProcessing(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/checkout/${checkInId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(paymentData),
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to process checkout");
            }

            toast.success("Check-out completed successfully!");
            setShowCheckoutModal(false);
            fetchCheckIns(debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter);
            setSelectedCheckIn(null);
        } catch (error) {
            console.error("Error processing checkout:", error);
            toast.error(error.message || "Error processing checkout");
        } finally {
            setIsCheckoutProcessing(false);
        }
    };

    const handleExtendStay = async (checkInId, extensionData) => {
        if (isExtending) return;

        try {
            setIsExtending(true);

            let payload = {
                newCheckOutDate: extensionData.newCheckOutDate,
                option: extensionData.option || 'same-room',
                reason: extensionData.reason || ''
            };

            if (extensionData.option === 'change-room') {
                payload.changedRooms = extensionData.changedRooms || [];

                if (payload.changedRooms.length === 0) {
                    toast.error("Please select at least one room to change");
                    setIsExtending(false);
                    return;
                }
            } else {
                payload.changedRooms = [];
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/extend-stay/${checkInId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to extend stay");
            }

            toast.success(`Stay extended successfully!`);
            setShowExtensionModal(false);
            fetchCheckIns(debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter);
            setSelectedCheckIn(null);
        } catch (error) {
            console.error("Error extending stay:", error);
            toast.error(error.message || "Error extending stay");
        } finally {
            setIsExtending(false);
        }
    };

    const handleDeleteCheckIn = async (checkInId) => {
        if (isDeleting) return;

        try {
            setIsDeleting(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkin/delete-checkin/${checkInId}`,
                {
                    method: "DELETE",
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete check-in");
            }

            toast.success("Check-in deleted successfully!");
            setSelectedCheckIn(null);
            fetchCheckIns(debouncedSearch, filterStatuses, filterDate, timeFilter, yearFilter);
        } catch (error) {
            console.error("Error deleting check-in:", error);
            toast.error(error.message || "Error deleting check-in");
        } finally {
            setIsDeleting(false);
        }
    };

    // ============================================
    // GET AVAILABLE YEARS
    // ============================================
    const getAvailableYears = () => {
        const years = new Set();
        checkIns.forEach(checkIn => {
            if (checkIn.checkInDate) {
                const year = new Date(checkIn.checkInDate).getFullYear();
                years.add(year.toString());
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    };

    // ============================================
    // INITIAL VALUES FOR FORM - UPDATED WITH PAYMENT DETAILS
    // ============================================
    const initialValues = {
        checkInDate: "",
        checkOutDate: "",
        taxSlab: 18,
        paymentStatus: "Not Paid",
        amountPaid: 0,
        advancePaid: 0,
        extraRequirements: [],
        paymentDetails: [],
        notes: "",
        idProofs: []
    };

    // ============================================
    // VALIDATION SCHEMA
    // ============================================
    const validationSchema = Yup.object({
        checkInDate: Yup.string().required("Check-in date is required"),
        checkOutDate: Yup.string().required("Check-out date is required"),
        taxSlab: Yup.number().required("Tax slab is required"),
        paymentStatus: Yup.string().required("Payment status is required"),
        amountPaid: Yup.number().min(0, "Amount cannot be negative"),
        advancePaid: Yup.number().min(0, "Amount cannot be negative")
    });

    // ============================================
    // ROOM MODAL OPEN HANDLERS (passed to CheckInModal)
    // ============================================
    const handleOpenChangeRoom = (checkIn) => {
        setChangeRoomData(checkIn);
        setShowChangeRoomModal(true);
    };

    const handleOpenAddRoom = (checkIn) => {
        setAddRoomData(checkIn);
        setShowAddRoomModal(true);
    };

    const handleOpenRemoveRoom = (checkIn) => {
        setRemoveRoomData(checkIn);
        setShowRemoveRoomModal(true);
    };

    // ============================================
    // MAIN RENDER
    // ============================================
    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="ckin-main">
                <AddCustomerModal
                    show={showAddCustomerModal}
                    onClose={handleCloseAddCustomerModal}
                    onSave={handleAddCustomer}
                    isSubmitting={isAddingCustomer}
                />

                {showChangeRoomModal && changeRoomData && (
                    <ChangeRoomModal
                        checkIn={changeRoomData}
                        onClose={() => { setShowChangeRoomModal(false); setChangeRoomData(null); }}
                        onConfirm={handleChangeRoom}
                        isSubmitting={isChangingRoom}
                        fetchAvailableRoomsForCheckInId={fetchAvailableRoomsForCheckInId}
                    />
                )}

                {showAddRoomModal && addRoomData && (
                    <AddRoomModal
                        checkIn={addRoomData}
                        onClose={() => { setShowAddRoomModal(false); setAddRoomData(null); }}
                        onConfirm={handleAddRoom}
                        isSubmitting={isAddingRoom}
                        fetchAvailableRoomsForCheckInId={fetchAvailableRoomsForCheckInId}
                    />
                )}

                {showRemoveRoomModal && removeRoomData && (
                    <RemoveRoomModal
                        checkIn={removeRoomData}
                        onClose={() => { setShowRemoveRoomModal(false); setRemoveRoomData(null); }}
                        onConfirm={handleRemoveRoom}
                        isSubmitting={isRemovingRoom}
                    />
                )}

                <div className="ckin-page-header">
                    <div className="ckin-search-container">
                        <FaSearch className="ckin-search-icon" />
                        <input
                            type="text"
                            placeholder="Search by Guest, Phone, Room..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="ckin-filters-group">
                        <select value={timeFilter} onChange={(e) => {
                            setTimeFilter(e.target.value);
                            if (e.target.value) setYearFilter("");
                        }}>
                            <option value="">All Time</option>
                            <option value="today">Today</option>
                            <option value="this-week">This Week</option>
                            <option value="this-month">This Month</option>
                            <option value="last-6-months">Last 6 Months</option>
                            <option value="this-year">This Year</option>
                        </select>

                        <select value={yearFilter} onChange={(e) => {
                            setYearFilter(e.target.value);
                            if (e.target.value) setTimeFilter("");
                        }}>
                            <option value="">All Years</option>
                            {getAvailableYears().map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        <div className="ckin-status-filter-wrapper" ref={statusFilterRef}>
                            <div
                                className={`ckin-status-filter-toggle ${filterStatuses.length > 0 ? 'ckin-status-filter-active' : ''}`}
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            >
                                <span className="ckin-status-filter-label">Status:</span>
                                <span className="ckin-status-filter-selected">
                                    {filterStatuses.length === 4 ? 'All' : filterStatuses.join(', ')}
                                    <span className="ckin-status-count">{filterStatuses.length}</span>
                                </span>
                                <span className={`ckin-status-filter-arrow ${showStatusDropdown ? 'ckin-status-filter-arrow-open' : ''}`}>
                                    ▼
                                </span>
                            </div>

                            {showStatusDropdown && (
                                <div className="ckin-status-dropdown">
                                    <div className="ckin-status-dropdown-header">
                                        <span className="ckin-status-dropdown-title">Filter by Status</span>
                                        <span
                                            className="ckin-status-select-all"
                                            onClick={() => setFilterStatuses(['Active', 'Extended', 'Checked-out', 'Cancelled'])}
                                        >
                                            Select All
                                        </span>
                                    </div>
                                    <div className="ckin-status-options">
                                        {[
                                            { label: 'Active', dot: 'ckin-dot-active', checkedClass: 'ckin-status-checked-active' },
                                            { label: 'Extended', dot: 'ckin-dot-extended', checkedClass: 'ckin-status-checked-extended' },
                                            { label: 'Checked-out', dot: 'ckin-dot-checkedout', checkedClass: 'ckin-status-checked-checkedout' },
                                            { label: 'Cancelled', dot: 'ckin-dot-cancelled', checkedClass: 'ckin-status-checked-cancelled' }
                                        ].map((status) => {
                                            const isChecked = filterStatuses.includes(status.label);
                                            return (
                                                <label
                                                    key={status.label}
                                                    className={`ckin-status-checkbox-item ${isChecked ? status.checkedClass : ''}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleStatusToggle(status.label)}
                                                    />
                                                    <span className={`ckin-status-color-dot ${status.dot}`}></span>
                                                    <span className="ckin-status-checkbox-label">{status.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <div className="ckin-status-dropdown-footer">
                                        <button className="ckin-status-reset-btn" onClick={handleClearStatuses}>
                                            <FaTimes /> Reset
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                    <div className="ckin-action-buttons-group">
                        <button
                            className="ckin-export-all-btn"
                            onClick={handleExportExcel}
                            disabled={isExporting}
                        >
                            {isExporting ? (
                                <>
                                    <div className="ckin-loading-spinner small"></div>
                                    Exporting...
                                </>
                            ) : (
                                <><FaFileExcel /> Export</>
                            )}
                        </button>
                        <button className="ckin-add-btn" onClick={() => setShowForm(!showForm)}>
                            <FaPlus /> {showForm ? "Close" : "Check-in"}
                        </button>
                    </div>
                </div>

                {showForm && (
                    <div className="ckin-form-container ckin-premium">
                        <h2>New Check-in</h2>

                        {/* ===== PER NIGHT CHECKBOX - ONLY ONCE ===== */}
                        <div className="ckin-form-row">
                            <div className="ckin-form-field">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={bookingType === 'perNight'}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            setBookingType(isChecked ? 'perNight' : 'simple');
                                            // If customer is already selected, update dates
                                            if (selectedCustomer && formikRef.current) {
                                                setDatesAfterCustomerSelect(formikRef.current.setFieldValue, isChecked);
                                            }
                                        }}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <FaMoon style={{ color: '#6c5ce7' }} />
                                    <span style={{ fontWeight: '500' }}>Per Night Booking</span>
                                    <small style={{ color: '#666', marginLeft: '8px', fontWeight: 'normal' }}>
                                        (No duration logic - uses perNight price from category)
                                    </small>
                                </label>
                                {bookingType === 'perNight' && (
                                    <div className="ckin-pernight-info" style={{ marginTop: '8px', padding: '8px 12px', background: '#f0f0ff', borderRadius: '4px', border: '1px solid #6c5ce7' }}>
                                        <small style={{ color: '#6c5ce7' }}>
                                            🌙 <strong>Night Stay Mode:</strong> Price will be taken directly from category's perNight price. Check-out auto-set to next day 10:00 AM (editable).
                                        </small>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ===== CUSTOMER SELECTION + BOOKING SEARCH - ONLY ONCE ===== */}
                        <div className="ckin-form-row">
                            <div className="ckin-form-field">
                                <label><FaUser /> Select Customer *</label>
                                <div className="ckin-customer-search-wrap">
                                    <div className="ckin-customer-search-row">
                                        <input
                                            type="text"
                                            value={customerSearch}
                                            onChange={(e) => handleCustomerSearch(e.target.value)}
                                            placeholder="Search customer by name or phone..."
                                            className="ckin-customer-search-input"
                                        />
                                        <button
                                            type="button"
                                            className="ckin-add-customer-btn"
                                            onClick={handleOpenAddCustomerModal}
                                            title="Add New Customer"
                                        >
                                            <FaUserPlus /> Add Customer
                                        </button>
                                    </div>
                                    {showCustomerDropdown && !showCreateCustomer && (
                                        <div className="ckin-dropdown-list">
                                            {customers.length > 0 ? (
                                                customers.map(customer => (
                                                    <div
                                                        key={customer.customerId}
                                                        className="ckin-dropdown-item"
                                                        onClick={() => handleSelectCustomer(customer)}
                                                    >
                                                        <strong>{customer.customerName}</strong>
                                                        <span className="ckin-dropdown-item-sub">
                                                            {customer.contactNumber} {customer.email ? `- ${customer.email}` : ''}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="ckin-dropdown-item ckin-dropdown-item-center">
                                                    No customer found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {selectedCustomer && (
                                    <div className="ckin-selected-customer">
                                        <FaCheck className="ckin-selected-customer-icon" />
                                        {selectedCustomer.customerName} ({selectedCustomer.contactNumber})
                                        <button
                                            type="button"
                                            className="ckin-remove-btn"
                                            onClick={() => {
                                                setSelectedCustomer(null);
                                                setCustomerSearch('');
                                                if (formikRef.current) {
                                                    formikRef.current.setFieldValue('amountPaid', 0);
                                                    formikRef.current.setFieldValue('paymentStatus', 'Not Paid');
                                                    formikRef.current.setFieldValue('paymentDetails', []);
                                                    formikRef.current.setFieldValue('checkInDate', '');
                                                    formikRef.current.setFieldValue('checkOutDate', '');
                                                }
                                                setAvailableRooms([]);
                                                setSelectedRooms([]);
                                                setCalculatedPrice(null);
                                                setEditableRoomPrices([]);
                                            }}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                )}

                                {showCreateCustomer && (
                                    <div className="ckin-inline-customer-create">
                                        <h4><FaPlusCircle /> Create New Customer</h4>
                                        <div className="ckin-inline-customer-grid">
                                            <div className="ckin-inline-customer-field">
                                                <label>Customer Name *</label>
                                                <input
                                                    type="text"
                                                    value={newCustomerData.customerName}
                                                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, customerName: e.target.value }))}
                                                    placeholder="Enter full name"
                                                />
                                            </div>
                                            <div className="ckin-inline-customer-field">
                                                <label>Phone Number *</label>
                                                <input
                                                    type="text"
                                                    value={newCustomerData.contactNumber}
                                                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, contactNumber: e.target.value }))}
                                                    placeholder="Enter 10 digit number"
                                                />
                                            </div>
                                            <div className="ckin-inline-customer-field ckin-inline-customer-field-full">
                                                <label>Email (Optional)</label>
                                                <input
                                                    type="email"
                                                    value={newCustomerData.email}
                                                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="Enter email address"
                                                />
                                            </div>
                                        </div>
                                        <div className="ckin-inline-customer-actions">
                                            <button
                                                type="button"
                                                className="ckin-create-customer-submit"
                                                onClick={() => {
                                                    if (!newCustomerData.customerName || !newCustomerData.contactNumber) {
                                                        toast.error("Name and Phone are required");
                                                        return;
                                                    }
                                                    // Create customer inline
                                                    const customerPayload = {
                                                        customerName: newCustomerData.customerName,
                                                        contactNumber: newCustomerData.contactNumber,
                                                        email: newCustomerData.email
                                                    };
                                                    handleAddCustomer(customerPayload);
                                                    setShowCreateCustomer(false);
                                                }}
                                                disabled={isCreatingCustomer}
                                            >
                                                {isCreatingCustomer ? 'Creating...' : <><FaCheck /> Create & Select</>}
                                            </button>
                                            <button type="button"
                                                className="ckin-cancel-create-customer"
                                                onClick={handleCancelCreateCustomer}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <small className="ckin-field-hint">
                                    Type to search existing customer or click "Add Customer" to create new
                                </small>
                            </div>

                            <div className="ckin-form-field">
                                <label><FaBook /> Search Booking (Optional)</label>
                                <div className="ckin-booking-search-wrap">
                                    <input
                                        type="text"
                                        value={bookingSearch}
                                        onChange={(e) => handleBookingSearch(e.target.value)}
                                        placeholder="Search by Booking #, Customer Name or Phone..."
                                        className="ckin-booking-search-input"
                                    />
                                    <FaSearch className="ckin-booking-search-icon" />
                                    {isSearchingBookings && (
                                        <div className="ckin-searching-spinner"><FaSync className="ckin-spin" /></div>
                                    )}
                                    {showBookingDropdown && (
                                        <div className="ckin-dropdown-list ckin-booking-dropdown">
                                            {bookings.length > 0 ? (
                                                bookings.map(booking => (
                                                    <div
                                                        key={booking.bookingId}
                                                        className="ckin-dropdown-item"
                                                        onClick={() => handleSelectBooking(booking)}
                                                    >
                                                        <div className="ckin-booking-dropdown-item">
                                                            <strong className="ckin-booking-dropdown-number">{booking.bookingNumber}</strong>
                                                            <span className="ckin-booking-dropdown-guest">{booking.customerName}</span>
                                                            <span className="ckin-booking-dropdown-phone">{booking.customerPhone}</span>
                                                            <span className="ckin-booking-dropdown-date">
                                                                {new Date(booking.checkInDate).toLocaleString()} - {new Date(booking.checkOutDate).toLocaleString()}
                                                            </span>
                                                            <span className="ckin-booking-dropdown-rooms">
                                                                Rooms: {booking.roomDetails?.map(r => r.roomNumber).join(', ') || booking.roomNumber}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="ckin-dropdown-item ckin-dropdown-item-center">
                                                    No bookings found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {selectedBooking && (
                                    <div className="ckin-selected-booking-info">
                                        <FaCheck className="ckin-selected-booking-icon" />
                                        <span className="ckin-selected-booking-text">
                                            Booking <strong>{selectedBooking.bookingNumber}</strong> loaded - {selectedBooking.customerName}
                                        </span>
                                        <button
                                            type="button"
                                            className="ckin-selected-booking-remove"
                                            onClick={() => {
                                                setSelectedBooking(null);
                                                setBookingSearch("");
                                                setBookings([]);
                                                setShowBookingDropdown(false);
                                                if (formikRef.current) {
                                                    formikRef.current.setFieldValue('checkInDate', '');
                                                    formikRef.current.setFieldValue('checkOutDate', '');
                                                    formikRef.current.setFieldValue('amountPaid', 0);
                                                    formikRef.current.setFieldValue('advancePaid', 0);
                                                    formikRef.current.setFieldValue('paymentStatus', 'Not Paid');
                                                    formikRef.current.setFieldValue('extraRequirements', []);
                                                    formikRef.current.setFieldValue('paymentDetails', []);
                                                }
                                                setSelectedRooms([]);
                                                setSelectedCustomer(null);
                                                setCustomerSearch('');
                                                setCalculatedPrice(null);
                                                setEditableRoomPrices([]);
                                                setBookingType('simple');
                                                setAvailableRooms([]);
                                            }}
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                )}
                                <small className="ckin-field-hint">
                                    Search for a confirmed booking to auto-fill customer, rooms, and dates
                                </small>
                            </div>
                        </div>

                        <hr className="ckin-booking-section-divider" />

                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleCreateCheckIn}
                        >
                            {({ values, setFieldValue, handleChange }) => {
                                formikRef.current = { values, setFieldValue, handleChange };

                                // Calculate grand total for validation
                                const extrasTotal = (values.extraRequirements || []).reduce(
                                    (sum, req) => sum + (parseFloat(req.price) || 0), 0
                                );
                                const roomSubtotal = calculatedPrice?.total || 0;
                                const subtotal = roomSubtotal + extrasTotal;
                                const taxSlabValue = parseInt(values.taxSlab) || 18;
                                const taxAmount = (subtotal * taxSlabValue) / 100;
                                const grandTotal = subtotal + taxAmount;

                                // Get available payment methods (not already used)
                                const usedMethods = values.paymentDetails.map(p => p.method);
                                const availableMethods = PAYMENT_METHODS.filter(m => !usedMethods.includes(m));

                                // ✅ AUTO-SET DATES AFTER CUSTOMER SELECTED
                                useEffect(() => {
                                    if (selectedCustomer && !values.checkInDate && !values.checkOutDate) {
                                        setDatesAfterCustomerSelect(setFieldValue, bookingType === 'perNight');
                                    }
                                }, [selectedCustomer]);

                                return (
                                    <Form>
                                        <div className="ckin-form-row">
                                            <div className="ckin-form-field">
                                                <label><FaCalendarAlt /> Check-in Date & Time *</label>
                                                <Field
                                                    name="checkInDate"
                                                    type="datetime-local"
                                                    onChange={(e) => {
                                                        handleChange(e);

                                                        // AUTO-FILL CHECKOUT FOR PER NIGHT WHEN CHECK-IN CHANGES (but editable)
                                                        if (bookingType === 'perNight' && e.target.value) {
                                                            const checkIn = new Date(e.target.value);
                                                            const checkOut = new Date(checkIn);
                                                            checkOut.setDate(checkOut.getDate() + 1);
                                                            checkOut.setHours(10, 0, 0, 0);

                                                            const year = checkOut.getFullYear();
                                                            const month = String(checkOut.getMonth() + 1).padStart(2, '0');
                                                            const day = String(checkOut.getDate()).padStart(2, '0');
                                                            const hours = String(checkOut.getHours()).padStart(2, '0');
                                                            const minutes = String(checkOut.getMinutes()).padStart(2, '0');
                                                            const checkOutString = `${year}-${month}-${day}T${hours}:${minutes}`;

                                                            setFieldValue('checkOutDate', checkOutString);
                                                        }

                                                        if (values.checkOutDate) {
                                                            handleDateChange(setFieldValue, e.target.value, values.checkOutDate);
                                                        }
                                                    }}
                                                />
                                                <ErrorMessage name="checkInDate" component="div" className="ckin-error" />
                                            </div>
                                            <div className="ckin-form-field">
                                                <label><FaCalendarAlt /> Check-out Date & Time *</label>
                                                <Field
                                                    name="checkOutDate"
                                                    type="datetime-local"
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        if (values.checkInDate) {
                                                            handleDateChange(setFieldValue, values.checkInDate, e.target.value);
                                                        }
                                                    }}
                                                />
                                                <ErrorMessage name="checkOutDate" component="div" className="ckin-error" />
                                                {bookingType === 'perNight' && (
                                                    <small className="ckin-field-hint" style={{ color: '#6c5ce7' }}>
                                                        🌙 Auto-set to next day 10:00 AM for Night Stay (editable)
                                                    </small>
                                                )}
                                            </div>
                                        </div>

                                        <div className="ckin-form-row">
                                            <div className="ckin-form-field">
                                                <label><FaDoorOpen /> Select Rooms *</label>
                                                {isLoadingRooms ? (
                                                    <div className="ckin-rooms-loading-text">Loading available rooms...</div>
                                                ) : availableRooms.length === 0 ? (
                                                    <div className="ckin-no-rooms-warning-box">
                                                        No rooms available for selected dates
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="ckin-room-grid">
                                                            {availableRooms.map(room => (
                                                                <div
                                                                    key={room.roomId}
                                                                    className={`ckin-room-checkbox ${selectedRooms.includes(room.roomId) ? 'ckin-selected' : ''}`}
                                                                    onClick={() => handleRoomSelection(room.roomId)}
                                                                >
                                                                    <label>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedRooms.includes(room.roomId)}
                                                                            onChange={() => { }}
                                                                        />
                                                                        <div className="ckin-room-info">
                                                                            <strong>{room.roomNumber}</strong>
                                                                            <span>{room.categoryDetails?.categoryName}</span>
                                                                            <span>
                                                                                {bookingType === 'perNight'
                                                                                    ? `₹${room.categoryDetails?.pricing?.perNight}/night`
                                                                                    : `₹${room.categoryDetails?.pricing?.perDay}/day`
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {selectedRooms.length > 0 && calculatedPrice && editableRoomPrices.length > 0 && (
                                                            <div className="ckin-price-preview">
                                                                <h4><FaCalculator /> Price Calculation</h4>
                                                                <div className="ckin-price-preview-list">
                                                                    {editableRoomPrices.map((item, idx) => (
                                                                        <div key={idx} className="ckin-price-preview-item ckin-editable-price-item">
                                                                            <div className="ckin-price-preview-room-info">
                                                                                <span>Room {item.roomNumber} ({item.label})</span>
                                                                                <span className="ckin-room-category-tag">{item.categoryName}</span>
                                                                            </div>
                                                                            <div className="ckin-price-preview-input-group">
                                                                                <span className="ckin-currency-symbol">₹</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="ckin-price-edit-input"
                                                                                    value={item.price || 0}
                                                                                    onChange={(e) => handleRoomPriceChange(idx, e.target.value)}
                                                                                    min="0"
                                                                                    step="1"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    <hr className="ckin-price-preview-divider" />
                                                                    <div className="ckin-price-preview-total">
                                                                        <span>Total Base Price</span>
                                                                        <span className="ckin-price-preview-total-value">₹{calculatedPrice.total.toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                                <small className="ckin-field-hint">
                                                                    * You can edit each room's price above. Tax will be added based on selected slab.
                                                                </small>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {selectedRooms.length > 0 && (
                                                    <div className="ckin-selected-rooms-summary">
                                                        <strong>Selected: {selectedRooms.length} room(s)</strong>
                                                        <div className="ckin-selected-rooms-list">
                                                            {availableRooms
                                                                .filter(r => selectedRooms.includes(r.roomId))
                                                                .map(r => r.roomNumber)
                                                                .join(', ')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="ckin-form-row">
                                            <div className="ckin-form-field">
                                                <label>Extra Requirements</label>
                                                <FieldArray name="extraRequirements">
                                                    {({ push, remove, form }) => (
                                                        <div>
                                                            {form.values.extraRequirements.map((req, index) => (
                                                                <div key={index} className="ckin-extra-req-row">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Description"
                                                                        value={req.description || ''}
                                                                        onChange={(e) => {
                                                                            const newReqs = [...form.values.extraRequirements];
                                                                            newReqs[index].description = e.target.value;
                                                                            form.setFieldValue('extraRequirements', newReqs);
                                                                        }}
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        placeholder="Price"
                                                                        value={req.price || 0}
                                                                        onChange={(e) => {
                                                                            const newReqs = [...form.values.extraRequirements];
                                                                            newReqs[index].price = parseFloat(e.target.value) || 0;
                                                                            form.setFieldValue('extraRequirements', newReqs);
                                                                        }}
                                                                    />
                                                                    <button type="button" onClick={() => remove(index)}>
                                                                        <FaTimes />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button type="button" className="ckin-add-req-btn" onClick={() => push({ description: '', price: 0 })}>
                                                                <FaPlus /> Add Requirement
                                                            </button>
                                                        </div>
                                                    )}
                                                </FieldArray>
                                            </div>

                                            <div className="ckin-form-field">
                                                <label><FaTag /> Tax Slab *</label>
                                                <Field as="select" name="taxSlab">
                                                    <option value="5">5%</option>
                                                    <option value="10">10%</option>
                                                    <option value="18">18%</option>
                                                </Field>
                                                <ErrorMessage name="taxSlab" component="div" className="ckin-error" />
                                            </div>
                                        </div>

                                        <div className="ckin-form-row">
                                            <div className="ckin-form-field">
                                                <label><FaMoneyBillWave /> Payment Status *</label>
                                                <Field as="select" name="paymentStatus">
                                                    <option value="Not Paid">Not Paid</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Partial Paid">Partial Paid</option>
                                                </Field>
                                                <ErrorMessage name="paymentStatus" component="div" className="ckin-error" />

                                                {values.paymentStatus === 'Partial Paid' && (
                                                    <div className="ckin-inline-amount-paid">
                                                        <label><FaMoneyBillWave /> Amount Paid</label>
                                                        <Field
                                                            name="amountPaid"
                                                            type="number"
                                                            min="0"
                                                            max={grandTotal}
                                                        />
                                                        <small className="ckin-field-hint">
                                                            Max: ₹{grandTotal.toFixed(2)}
                                                        </small>
                                                        <ErrorMessage name="amountPaid" component="div" className="ckin-error" />
                                                        {selectedBooking && (
                                                            <small className="ckin-field-hint">
                                                                Auto-filled from booking {selectedBooking.bookingNumber}
                                                            </small>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {values.paymentStatus !== 'Not Paid' && (
                                                <div className="ckin-form-field">
                                                    <label><FaCreditCard /> Payment Details</label>
                                                    <FieldArray name="paymentDetails">
                                                        {({ push, remove, form }) => {
                                                            // ✅ Calculate current total of payment details
                                                            const currentPaymentTotal = form.values.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);

                                                            return (
                                                                <div className="ckin-payment-details-edit">
                                                                    {form.values.paymentDetails.map((payment, index) => {
                                                                        const usedMethods = form.values.paymentDetails
                                                                            .filter((_, idx) => idx !== index)
                                                                            .map(p => p.method);
                                                                        const availableForThis = PAYMENT_METHODS.filter(m => !usedMethods.includes(m));
                                                                        const options = [payment.method, ...availableForThis.filter(m => m !== payment.method)];

                                                                        // ✅ Max allowed for this individual payment
                                                                        const maxAllowed = values.paymentStatus === 'Partial Paid'
                                                                            ? (parseFloat(values.amountPaid) || grandTotal)
                                                                            : grandTotal;

                                                                        // ✅ Remaining amount allowed for this payment
                                                                        const remainingAllowed = Math.max(0, maxAllowed - (currentPaymentTotal - (payment.amount || 0)));

                                                                        return (
                                                                            <div key={index} className="ckin-payment-row">
                                                                                <select
                                                                                    className="ckin-edit-input ckin-payment-method-select"
                                                                                    value={payment.method || 'Cash'}
                                                                                    onChange={(e) => {
                                                                                        const newPayments = [...form.values.paymentDetails];
                                                                                        newPayments[index].method = e.target.value;
                                                                                        form.setFieldValue('paymentDetails', newPayments);
                                                                                    }}
                                                                                >
                                                                                    {options.map(m => (
                                                                                        <option key={m} value={m}>{m}</option>
                                                                                    ))}
                                                                                </select>
                                                                                <input
                                                                                    type="number"
                                                                                    className="ckin-edit-input ckin-payment-amount-input"
                                                                                    placeholder="Amount"
                                                                                    value={payment.amount || 0}
                                                                                    onChange={(e) => {
                                                                                        const val = parseFloat(e.target.value) || 0;
                                                                                        // ✅ Check if this payment exceeds remaining allowed
                                                                                        if (val > remainingAllowed) {
                                                                                            toast.warning(`Amount cannot exceed ₹${remainingAllowed.toFixed(2)} (remaining from ₹${maxAllowed.toFixed(2)})`);
                                                                                            return;
                                                                                        }
                                                                                        // ✅ Check if total would exceed maxAllowed
                                                                                        const newTotal = currentPaymentTotal - (payment.amount || 0) + val;
                                                                                        if (newTotal > maxAllowed) {
                                                                                            toast.warning(`Total payment (₹${newTotal.toFixed(2)}) cannot exceed ₹${maxAllowed.toFixed(2)}`);
                                                                                            return;
                                                                                        }
                                                                                        const newPayments = [...form.values.paymentDetails];
                                                                                        newPayments[index].amount = val;
                                                                                        form.setFieldValue('paymentDetails', newPayments);
                                                                                    }}
                                                                                    min="0"
                                                                                    max={remainingAllowed}
                                                                                />
                                                                                <input
                                                                                    type="text"
                                                                                    className="ckin-edit-input ckin-payment-ref-input"
                                                                                    placeholder="Reference (optional)"
                                                                                    value={payment.reference || ''}
                                                                                    onChange={(e) => {
                                                                                        const newPayments = [...form.values.paymentDetails];
                                                                                        newPayments[index].reference = e.target.value;
                                                                                        form.setFieldValue('paymentDetails', newPayments);
                                                                                    }}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    className="ckin-remove-payment-btn"
                                                                                    onClick={() => remove(index)}
                                                                                    disabled={form.values.paymentDetails.length <= 1}
                                                                                >
                                                                                    <FaTimes />
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    <div className="ckin-payment-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="ckin-add-payment-btn"
                                                                            onClick={() => {
                                                                                const used = form.values.paymentDetails.map(p => p.method);
                                                                                const available = PAYMENT_METHODS.find(m => !used.includes(m));
                                                                                if (available) {
                                                                                    push({ method: available, amount: 0, reference: '' });
                                                                                } else {
                                                                                    toast.warning("All payment methods are already added");
                                                                                }
                                                                            }}
                                                                            disabled={form.values.paymentDetails.length >= PAYMENT_METHODS.length}
                                                                        >
                                                                            <FaPlus /> Add Payment Method
                                                                        </button>
                                                                        {form.values.paymentDetails.length >= PAYMENT_METHODS.length && (
                                                                            <small className="ckin-field-hint">All payment methods are already added</small>
                                                                        )}
                                                                    </div>
                                                                    {form.values.paymentDetails.length > 0 && (
                                                                        <small className="ckin-field-hint">
                                                                            Total: ₹{currentPaymentTotal.toFixed(2)}
                                                                            {' | '}Type: {new Set(form.values.paymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : (form.values.paymentDetails[0]?.method || 'Cash')}
                                                                            {values.paymentStatus === 'Partial Paid' && currentPaymentTotal > (parseFloat(values.amountPaid) || 0) && (
                                                                                <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                                                                                    ⚠️ Exceeds Amount Paid (₹{(parseFloat(values.amountPaid) || 0).toFixed(2)})!
                                                                                </span>
                                                                            )}
                                                                            {currentPaymentTotal > grandTotal && (
                                                                                <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                                                                                    ⚠️ Exceeds Grand Total!
                                                                                </span>
                                                                            )}
                                                                        </small>
                                                                    )}
                                                                </div>
                                                            );
                                                        }}
                                                    </FieldArray>
                                                </div>
                                            )}
                                        </div>

                                        <div className="ckin-form-row">
                                            <div className="ckin-form-field">
                                                <label><FaIdCard /> ID Proof Upload</label>
                                                <div className="ckin-file-upload-area">
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        accept="image/*"
                                                        multiple
                                                        onChange={handleFileUpload}
                                                        style={{ display: 'none' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="ckin-upload-btn"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <FaUpload /> Upload Files (Max 5MB each)
                                                    </button>
                                                    <div className="ckin-file-list">
                                                        {uploadedFiles.map((file, index) => (
                                                            <div key={index} className="ckin-file-item ckin-file-item-labeled">
                                                                <div className="ckin-file-info">
                                                                    <span>{file.fileName}</span>
                                                                    <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                                                                </div>
                                                                <div className="ckin-file-label">
                                                                    <select
                                                                        value={uploadedFileLabels[index] || 'Other'}
                                                                        onChange={(e) => handleLabelChange(index, e.target.value)}
                                                                    >
                                                                        {idProofLabels.map(label => (
                                                                            <option key={label} value={label}>{label}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <button type="button" onClick={() => removeFile(index)}>
                                                                    <FaTimes />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ckin-form-row">
                                            <div className="ckin-form-field">
                                                <label>Notes (Optional)</label>
                                                <Field name="notes" as="textarea" rows="3" />
                                                <ErrorMessage name="notes" component="div" className="ckin-error" />
                                            </div>
                                        </div>

                                        {calculatedPrice && selectedRooms.length > 0 && (() => {
                                            const roomSubtotal = calculatedPrice.total || 0;
                                            const subtotal = roomSubtotal + extrasTotal;
                                            const taxSlabValue = parseInt(values.taxSlab) || 18;
                                            const taxAmount = (subtotal * taxSlabValue) / 100;
                                            const grandTotalCalc = subtotal + taxAmount;
                                            const amountPaidValue = parseFloat(values.amountPaid) || 0;
                                            const balanceDue = Math.max(0, grandTotalCalc - amountPaidValue);

                                            const paymentDetailsTotal = (values.paymentDetails || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                                            const paymentType = values.paymentDetails && values.paymentDetails.length > 0
                                                ? (new Set(values.paymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : values.paymentDetails[0].method)
                                                : 'Cash';

                                            const paymentExceeds = paymentDetailsTotal > grandTotalCalc;

                                            return (
                                                <div className="ckin-form-row">
                                                    <div className="ckin-form-field">
                                                        <div className="ckin-price-breakdown-box">
                                                            <h4><FaCalculator /> Full Price Breakdown</h4>
                                                            <div className="ckin-price-breakdown-grid">
                                                                <span>Booking Type:</span>
                                                                <span className="ckin-price-val"><strong>{bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}</strong></span>

                                                                {calculatedPrice.breakdown.map((item, idx) => (
                                                                    <React.Fragment key={idx}>
                                                                        <span>Room {item.roomNumber} ({item.label}):</span>
                                                                        <span className="ckin-price-val">₹{item.price.toFixed(2)}</span>
                                                                    </React.Fragment>
                                                                ))}

                                                                <span><strong>Room Subtotal:</strong></span>
                                                                <span className="ckin-price-val"><strong>₹{roomSubtotal.toFixed(2)}</strong></span>

                                                                {values.extraRequirements && values.extraRequirements.length > 0 && values.extraRequirements.map((req, idx) => (
                                                                    <React.Fragment key={`extra-${idx}`}>
                                                                        <span>{req.description || 'Extra Requirement'}:</span>
                                                                        <span className="ckin-price-val">₹{(parseFloat(req.price) || 0).toFixed(2)}</span>
                                                                    </React.Fragment>
                                                                ))}

                                                                {extrasTotal > 0 && (
                                                                    <>
                                                                        <span>Extra Requirements Total:</span>
                                                                        <span className="ckin-price-val">₹{extrasTotal.toFixed(2)}</span>
                                                                    </>
                                                                )}

                                                                <hr className="ckin-price-divider" />

                                                                <span><strong>Subtotal:</strong></span>
                                                                <span className="ckin-price-val"><strong>₹{subtotal.toFixed(2)}</strong></span>

                                                                <span>Tax ({taxSlabValue}%):</span>
                                                                <span className="ckin-price-val">₹{taxAmount.toFixed(2)}</span>

                                                                <hr className="ckin-price-divider ckin-price-divider-thick" />

                                                                <span className="ckin-price-grand-label"><strong>Grand Total:</strong></span>
                                                                <span className="ckin-price-val ckin-price-grand-value">
                                                                    ₹{grandTotalCalc.toFixed(2)}
                                                                </span>

                                                                <hr className="ckin-price-divider" />

                                                                <span>Amount Paid:</span>
                                                                <span className="ckin-price-val">₹{amountPaidValue.toFixed(2)}</span>

                                                                <span className="ckin-price-grand-label"><strong>Remaining Amount:</strong></span>
                                                                <span className={`ckin-price-val ckin-price-grand-value ${balanceDue > 0 ? 'ckin-balance-due' : 'ckin-balance-clear'}`}>
                                                                    ₹{balanceDue.toFixed(2)}
                                                                </span>

                                                                {values.paymentStatus !== 'Not Paid' && values.paymentDetails && values.paymentDetails.length > 0 && (
                                                                    <>
                                                                        <hr className="ckin-price-divider" />
                                                                        <span className="ckin-price-grand-label">
                                                                            <strong>Payment Type:</strong>
                                                                        </span>
                                                                        <span className="ckin-price-val">
                                                                            <strong>{paymentType}</strong>
                                                                        </span>
                                                                        <span className="ckin-price-grand-label">
                                                                            <strong>Payment Details Total:</strong>
                                                                        </span>
                                                                        <span className={`ckin-price-val ${paymentExceeds ? 'ckin-balance-due' : ''}`}>
                                                                            <strong>₹{paymentDetailsTotal.toFixed(2)}</strong>
                                                                            {paymentExceeds && (
                                                                                <span style={{ color: '#dc3545', marginLeft: '8px', fontSize: '12px' }}>
                                                                                    ⚠️ Exceeds Grand Total!
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <button type="submit" disabled={isFormSubmitting || !selectedCustomer || selectedRooms.length === 0}>
                                            {isFormSubmitting ? (
                                                <>
                                                    <div className="ckin-loading-spinner small"></div>
                                                    Creating...
                                                </>
                                            ) : (
                                                `Complete Check-in (${selectedRooms.length} room${selectedRooms.length > 1 ? 's' : ''})`
                                            )}
                                        </button>
                                    </Form>
                                );
                            }}
                        </Formik>
                    </div>
                )}

                <div className="ckin-data-table">
                    {isLoading ? (
                        <div className="ckin-loading-container">
                            <div className="ckin-loading-spinner large"></div>
                            <p>Loading check-ins...</p>
                        </div>
                    ) : checkIns.length === 0 ? (
                        <div className="ckin-empty-state">
                            <p>No check-ins found</p>
                        </div>
                    ) : (
                        <>
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Type</th>
                                        <th>Guest</th>
                                        <th>Rooms</th>
                                        <th>Check-in</th>
                                        <th>Check-out</th>
                                        <th>Duration</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th>Payment</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checkIns.map((checkIn, index) => (
                                        <tr
                                            key={checkIn.checkInId || index}
                                            className={selectedCheckIn === checkIn.checkInId ? "ckin-selected" : ""}
                                        >
                                            <td>{checkIn.checkInNumber}</td>
                                            <td>
                                                <span className={`ckin-booking-type-badge ${checkIn.bookingType === 'perNight' ? 'ckin-pernight-badge' : 'ckin-simple-badge'}`}>
                                                    {checkIn.bookingType === 'perNight' ? '🌙 Night' : 'Simple'}
                                                </span>
                                            </td>
                                            <td>{checkIn.customerName}</td>
                                            <td>
                                                {checkIn.roomDetails?.map(r => r.roomNumber).join(', ') || checkIn.roomNumber}
                                            </td>
                                            <td>{new Date(checkIn.checkInDate).toLocaleDateString()}</td>
                                            <td>{new Date(checkIn.checkOutDate).toLocaleDateString()}</td>
                                            <td>{checkIn.durationLabel}</td>
                                            <td>₹{(checkIn.grandTotal || 0).toFixed(2)}</td>
                                            <td>
                                                <span className={`ckin-status-badge ckin-status-${checkIn.status?.toLowerCase()}`}>
                                                    {checkIn.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`ckin-status-badge ckin-status-${checkIn.paymentStatus?.toLowerCase().replace(' ', '')}`}>
                                                    {checkIn.paymentStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="ckin-action-buttons">
                                                    <button
                                                        className="ckin-action-btn ckin-whatsapp-btn-sm"
                                                        onClick={() => sendWhatsAppMessage(checkIn)}
                                                        disabled={isWhatsAppSending}
                                                        title="Send WhatsApp"
                                                    >
                                                        <FaWhatsapp />
                                                    </button>
                                                    <button
                                                        className="ckin-action-btn ckin-pdf-btn-sm"
                                                        onClick={() => generatePDF(checkIn)}
                                                        disabled={isPDFGenerating}
                                                        title="Download PDF"
                                                    >
                                                        <FaFilePdf />
                                                    </button>
                                                    <button
                                                        className="ckin-action-btn ckin-view-btn-sm"
                                                        onClick={() => setSelectedCheckIn(checkIn.checkInId)}
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {pagination.totalPages > 1 && (
                                <div className="ckin-pagination-container">
                                    <div className="ckin-pagination-info">
                                        Showing {pagination.startIndex} to {pagination.endIndex} of {pagination.totalCheckIns} check-ins
                                    </div>
                                    <div className="ckin-pagination-controls">
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                                            disabled={!pagination.hasPrevPage || isLoading}
                                            className="ckin-pagination-btn"
                                        >
                                            <FaChevronLeft /> Previous
                                        </button>

                                        {(() => {
                                            const { currentPage, totalPages } = pagination;
                                            const maxVisible = 5;
                                            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                                            if (endPage - startPage + 1 < maxVisible) {
                                                startPage = Math.max(1, endPage - maxVisible + 1);
                                            }
                                            const pages = [];
                                            for (let i = startPage; i <= endPage; i++) pages.push(i);

                                            return (
                                                <>
                                                    {startPage > 1 && (
                                                        <>
                                                            <button onClick={() => setPagination(prev => ({ ...prev, currentPage: 1 }))} className="ckin-pagination-btn">1</button>
                                                            {startPage > 2 && <span className="ckin-pagination-dots">...</span>}
                                                        </>
                                                    )}
                                                    {pages.map(page => (
                                                        <button
                                                            key={page}
                                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: page }))}
                                                            className={`ckin-pagination-btn ${currentPage === page ? 'ckin-active' : ''}`}
                                                        >
                                                            {page}
                                                        </button>
                                                    ))}
                                                    {endPage < totalPages && (
                                                        <>
                                                            {endPage < totalPages - 1 && <span className="ckin-pagination-dots">...</span>}
                                                            <button onClick={() => setPagination(prev => ({ ...prev, currentPage: totalPages }))} className="ckin-pagination-btn">{totalPages}</button>
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()}

                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                                            disabled={!pagination.hasNextPage || isLoading}
                                            className="ckin-pagination-btn"
                                        >
                                            Next <FaChevronRight />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {selectedCheckIn && (
                    <CheckInModal
                        checkIn={checkIns.find(c => c.checkInId === selectedCheckIn)}
                        onClose={() => setSelectedCheckIn(null)}
                        onUpdate={handleUpdateCheckIn}
                        onDelete={handleDeleteCheckIn}
                        onExtend={(checkIn) => { setExtendCheckIn(checkIn); setShowExtensionModal(true); }}
                        onSendWhatsApp={sendWhatsAppMessage}
                        onGeneratePDF={generatePDF}
                        onPrintAndWhatsApp={handlePrintAndWhatsApp}
                        onOpenChangeRoom={handleOpenChangeRoom}
                        onOpenAddRoom={handleOpenAddRoom}
                        onOpenRemoveRoom={handleOpenRemoveRoom}
                        isPDFGenerating={isPDFGenerating}
                        isWhatsAppSending={isWhatsAppSending}
                        isPrintAndWhatsAppProcessing={isPrintAndWhatsAppProcessing}
                    />
                )}

                {showCheckoutModal && checkoutData && (
                    <CheckoutModal
                        checkIn={checkoutData}
                        onClose={() => { setShowCheckoutModal(false); setCheckoutData(null); }}
                        onCheckout={handleCheckout}
                        isSubmitting={isCheckoutProcessing}
                    />
                )}

                {showExtensionModal && extendCheckIn && (
                    <ExtensionModal
                        checkIn={extendCheckIn}
                        onClose={() => { setShowExtensionModal(false); setExtendCheckIn(null); }}
                        onExtend={handleExtendStay}
                        isSubmitting={isExtending}
                        fetchAvailableRoomsForExt={fetchAvailableRoomsForExt}
                    />
                )}

                <div className="ckin-hidden-pdf-print">
                    {checkinForPrint && <CheckInPrint checkin={checkinForPrint} />}
                </div>
            </div>
        </Navbar>
    );
};

export default CheckIn;