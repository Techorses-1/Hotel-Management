import React, { useState, useEffect, useRef } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import {
    FaPlus, FaSearch, FaEdit, FaSave, FaTrash, FaTimes,
    FaUser, FaPhone, FaEnvelope, FaCalendarAlt, FaClock,
    FaDoorOpen, FaMoneyBillWave, FaCreditCard, FaFileInvoice,
    FaDownload, FaEye, FaCheck, FaSync, FaBan,
    FaBed, FaTag, FaList, FaCalculator, FaRupeeSign, FaPlusCircle,
    FaMinusCircle, FaArrowRight, FaArrowLeft, FaUserPlus,
    FaWhatsapp, FaFilePdf, FaPrint, FaPlusSquare, FaTrashAlt, FaExchangeAlt,
    FaUniversity, FaBuilding, FaMoon
} from "react-icons/fa";
import html2pdf from "html2pdf.js";
import Navbar from "../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./Booking.scss";
import BookingPrint from "./BookingPrint";

// ============================================
// HELPER: Convert UTC to IST for display
// ============================================
const convertUTCToIST = (utcDate) => {
    if (!utcDate) return '';
    const date = new Date(utcDate);
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);
    return istDate.toISOString().slice(0, 16);
};

// ============================================
// PAYMENT METHODS CONSTANT
// ============================================
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
        <div className="bk-modal-overlay" onClick={onClose}>
            <div className="bk-modal-content" onClick={e => e.stopPropagation()}>
                <div className="bk-modal-header">
                    <div className="bk-modal-title">
                        <FaUserPlus /> Add New Customer
                    </div>
                    <button className="bk-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="bk-modal-body">
                    <div className="bk-details-grid">
                        <div className="bk-detail-row">
                            <span className="bk-detail-label">Customer Name *</span>
                            <input
                                type="text"
                                className="bk-edit-input"
                                value={localData.customerName}
                                onChange={(e) => setLocalData({ ...localData, customerName: e.target.value })}
                                placeholder="Enter full name"
                                autoFocus
                            />
                        </div>
                        <div className="bk-detail-row">
                            <span className="bk-detail-label">Phone Number *</span>
                            <input
                                type="text"
                                className="bk-edit-input"
                                value={localData.contactNumber}
                                onChange={(e) => setLocalData({ ...localData, contactNumber: e.target.value })}
                                placeholder="Enter 10 digit number"
                            />
                        </div>
                        <div className="bk-detail-row">
                            <span className="bk-detail-label">Email (Optional)</span>
                            <input
                                type="email"
                                className="bk-edit-input"
                                value={localData.email}
                                onChange={(e) => setLocalData({ ...localData, email: e.target.value })}
                                placeholder="Enter email address"
                            />
                        </div>
                    </div>
                </div>
                <div className="bk-modal-footer">
                    <button className="bk-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="bk-update-btn"
                        onClick={() => onSave(localData)}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="bk-loading-spinner small"></div>
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
// ADD ROOM MODAL
// ============================================
const AddRoomModal = ({ booking, onClose, onConfirm, isSubmitting, fetchAvailableRoomsForBookingId }) => {
    const [selectedRoom, setSelectedRoom] = useState('');
    const [availableRooms, setAvailableRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const hasLoaded = useRef(false);

    useEffect(() => {
        if (booking && !hasLoaded.current) {
            hasLoaded.current = true;
            loadAvailableRooms();
        }
        return () => {
            hasLoaded.current = false;
        };
    }, [booking]);

    const loadAvailableRooms = async () => {
        try {
            setIsLoading(true);
            const rooms = await fetchAvailableRoomsForBookingId(
                booking.bookingId,
                booking.checkInDate,
                booking.userSelectedCheckOut || booking.checkOutDate
            );
            setAvailableRooms(rooms);
        } catch (error) {
            console.error("Error loading rooms:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!booking) return null;

    const currentRoomNumbers = booking.roomDetails?.map(r => r.roomNumber) || [];

    return (
        <div className="bk-modal-overlay bk-child-modal" onClick={onClose}>
            <div className="bk-modal-content" onClick={e => e.stopPropagation()}>
                <div className="bk-modal-header">
                    <div className="bk-modal-title">
                        <FaPlusSquare /> Add Room to Booking
                    </div>
                    <button className="bk-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="bk-modal-body">
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Booking #</span>
                        <span className="bk-detail-value">{booking.bookingNumber}</span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Guest</span>
                        <span className="bk-detail-value">{booking.customerName}</span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Current Room(s)</span>
                        <span className="bk-detail-value">
                            {currentRoomNumbers.join(', ') || 'N/A'}
                        </span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Select Room to Add</span>
                        {isLoading ? (
                            <div className="bk-loading-text">Loading available rooms...</div>
                        ) : (
                            <select
                                className="bk-edit-input"
                                value={selectedRoom}
                                onChange={(e) => setSelectedRoom(e.target.value)}
                            >
                                <option value="">Select a room</option>
                                {availableRooms
                                    .filter(r => !booking.roomIds?.includes(r.roomId))
                                    .map(room => (
                                        <option key={room.roomId} value={room.roomId}>
                                            {room.roomNumber} ({room.categoryDetails?.categoryName})
                                            - ₹{room.categoryDetails?.pricing?.perDay}/day
                                        </option>
                                    ))}
                            </select>
                        )}
                        {availableRooms.length === 0 && !isLoading && (
                            <div className="bk-no-rooms-warning">
                                No available rooms for the selected dates
                            </div>
                        )}
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Note</span>
                        <small className="bk-field-hint">
                            Room will be added with the same check-in and check-out dates
                        </small>
                    </div>
                </div>
                <div className="bk-modal-footer">
                    <button className="bk-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="bk-update-btn"
                        onClick={() => {
                            if (!selectedRoom) {
                                toast.error("Please select a room");
                                return;
                            }
                            onConfirm(booking.bookingId, selectedRoom);
                        }}
                        disabled={!selectedRoom || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="bk-loading-spinner small"></div>
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
// REMOVE ROOM MODAL
// ============================================
const RemoveRoomModal = ({ booking, onClose, onConfirm, isSubmitting }) => {
    const [selectedRoom, setSelectedRoom] = useState('');
    const [reason, setReason] = useState('');
    const [roomOptions, setRoomOptions] = useState([]);
    const hasLoaded = useRef(false);

    useEffect(() => {
        if (booking && booking.roomDetails) {
            setRoomOptions(booking.roomDetails);
            if (!hasLoaded.current) {
                hasLoaded.current = true;
                if (booking.roomDetails.length > 0) {
                    setSelectedRoom(booking.roomDetails[0].roomId);
                }
            }
        }
        return () => {
            hasLoaded.current = false;
        };
    }, [booking]);

    if (!booking) return null;

    const isLastRoom = roomOptions.length <= 1;

    return (
        <div className="bk-modal-overlay bk-child-modal" onClick={onClose}>
            <div className="bk-modal-content" onClick={e => e.stopPropagation()}>
                <div className="bk-modal-header">
                    <div className="bk-modal-title">
                        <FaTrashAlt /> Remove Room from Booking
                    </div>
                    <button className="bk-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="bk-modal-body">
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Booking #</span>
                        <span className="bk-detail-value">{booking.bookingNumber}</span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Guest</span>
                        <span className="bk-detail-value">{booking.customerName}</span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Select Room to Remove</span>
                        <select
                            className="bk-edit-input"
                            value={selectedRoom}
                            onChange={(e) => setSelectedRoom(e.target.value)}
                            disabled={isLastRoom}
                        >
                            {roomOptions.map(room => (
                                <option key={room.roomId} value={room.roomId}>
                                    {room.roomNumber} ({room.categoryName})
                                </option>
                            ))}
                        </select>
                        {isLastRoom && (
                            <small className="bk-text-danger">
                                ⚠️ Cannot remove the last room. At least one room must remain.
                            </small>
                        )}
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Reason (Optional)</span>
                        <input
                            type="text"
                            className="bk-edit-input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for removal..."
                        />
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Note</span>
                        <small className="bk-field-hint bk-text-danger">
                            Room will become available for other customers after removal
                        </small>
                    </div>
                </div>
                <div className="bk-modal-footer">
                    <button className="bk-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="bk-delete-btn"
                        onClick={() => {
                            if (!selectedRoom) {
                                toast.error("Please select a room");
                                return;
                            }
                            if (isLastRoom) {
                                toast.error("Cannot remove the last room");
                                return;
                            }
                            onConfirm(booking.bookingId, selectedRoom, reason);
                        }}
                        disabled={!selectedRoom || isLastRoom || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="bk-loading-spinner small"></div>
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
// CHANGE ROOM MODAL
// ============================================
const ChangeRoomModal = ({ booking, onClose, onConfirm, isSubmitting, fetchAvailableRoomsForBookingId }) => {
    const [selectedOldRoom, setSelectedOldRoom] = useState('');
    const [selectedNewRoom, setSelectedNewRoom] = useState('');
    const [availableRooms, setAvailableRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [roomOptions, setRoomOptions] = useState([]);
    const hasLoaded = useRef(false);

    useEffect(() => {
        if (booking && booking.roomDetails) {
            setRoomOptions(booking.roomDetails);
            if (booking.roomDetails.length > 0) {
                setSelectedOldRoom(booking.roomDetails[0].roomId);
            }
            if (!hasLoaded.current) {
                hasLoaded.current = true;
                loadAvailableRooms();
            }
        }
        return () => {
            hasLoaded.current = false;
        };
    }, [booking]);

    const loadAvailableRooms = async () => {
        try {
            setIsLoading(true);
            const rooms = await fetchAvailableRoomsForBookingId(
                booking.bookingId,
                booking.checkInDate,
                booking.userSelectedCheckOut || booking.checkOutDate
            );
            setAvailableRooms(rooms);
        } catch (error) {
            console.error("Error loading rooms:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!booking) return null;

    return (
        <div className="bk-modal-overlay bk-child-modal" onClick={onClose}>
            <div className="bk-modal-content" onClick={e => e.stopPropagation()}>
                <div className="bk-modal-header">
                    <div className="bk-modal-title">
                        <FaExchangeAlt /> Change Room in Booking
                    </div>
                    <button className="bk-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="bk-modal-body">
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Booking #</span>
                        <span className="bk-detail-value">{booking.bookingNumber}</span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Guest</span>
                        <span className="bk-detail-value">{booking.customerName}</span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Select Room to Change</span>
                        <select
                            className="bk-edit-input"
                            value={selectedOldRoom}
                            onChange={(e) => {
                                setSelectedOldRoom(e.target.value);
                                setSelectedNewRoom('');
                            }}
                        >
                            {roomOptions.map(room => (
                                <option key={room.roomId} value={room.roomId}>
                                    {room.roomNumber} ({room.categoryName})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Select New Room</span>
                        {isLoading ? (
                            <div className="bk-loading-text">Loading available rooms...</div>
                        ) : (
                            <select
                                className="bk-edit-input"
                                value={selectedNewRoom}
                                onChange={(e) => setSelectedNewRoom(e.target.value)}
                                disabled={!selectedOldRoom}
                            >
                                <option value="">Select a room</option>
                                {availableRooms
                                    .filter(r => r.roomId !== selectedOldRoom && !booking.roomIds?.includes(r.roomId))
                                    .map(room => (
                                        <option key={room.roomId} value={room.roomId}>
                                            {room.roomNumber} ({room.categoryDetails?.categoryName})
                                            - ₹{room.categoryDetails?.pricing?.perDay}/day
                                        </option>
                                    ))}
                            </select>
                        )}
                        {availableRooms.length === 0 && !isLoading && (
                            <div className="bk-no-rooms-warning">
                                No available rooms for the selected dates
                            </div>
                        )}
                        {selectedOldRoom && !selectedNewRoom && !isLoading && (
                            <small className="bk-field-hint bk-text-warning">
                                Please select a new room to continue
                            </small>
                        )}
                    </div>
                    {selectedOldRoom && selectedNewRoom && (
                        <div className="bk-detail-row">
                            <span className="bk-detail-label">Change Summary</span>
                            <div className="bk-change-summary">
                                <span className="bk-old-room">
                                    <strong>{roomOptions.find(r => r.roomId === selectedOldRoom)?.roomNumber}</strong>
                                </span>
                                <span className="bk-change-arrow">→</span>
                                <span className="bk-new-room">
                                    <strong>{availableRooms.find(r => r.roomId === selectedNewRoom)?.roomNumber}</strong>
                                </span>
                            </div>
                            <small className="bk-field-hint">
                                Old room will be removed and new room will be added with same dates
                            </small>
                        </div>
                    )}
                </div>
                <div className="bk-modal-footer">
                    <button className="bk-cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="bk-update-btn"
                        onClick={() => {
                            if (!selectedOldRoom || !selectedNewRoom) {
                                toast.error("Please select both rooms");
                                return;
                            }
                            onConfirm(booking.bookingId, selectedOldRoom, selectedNewRoom);
                        }}
                        disabled={!selectedOldRoom || !selectedNewRoom || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="bk-loading-spinner small"></div>
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
// CANCEL MODAL - UPDATED WITH REFUND
// ============================================
const CancelModal = ({ booking, onClose, onConfirm, isLoading }) => {
    const [reason, setReason] = useState('');
    const [refundAmount, setRefundAmount] = useState(0);

    useEffect(() => {
        if (booking) {
            const totalPaid = (booking.amountPaid || 0) + (booking.advancePaid || 0);
            setRefundAmount(0);
        }
    }, [booking]);

    if (!booking) return null;

    const totalPaid = (booking.amountPaid || 0) + (booking.advancePaid || 0);

    return (
        <div className="bk-modal-overlay" onClick={onClose}>
            <div className="bk-modal-content" onClick={e => e.stopPropagation()}>
                <div className="bk-modal-header">
                    <div className="bk-modal-title">Cancel Booking</div>
                    <button className="bk-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="bk-modal-body">
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Booking #</span>
                        <span className="bk-detail-value">{booking.bookingNumber}</span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Guest</span>
                        <span className="bk-detail-value">{booking.customerName}</span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Check-in</span>
                        <span className="bk-detail-value">{new Date(booking.checkInDate).toLocaleString()}</span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Total Paid</span>
                        <span className="bk-detail-value bk-grand-total-value">
                            ₹{(booking.amountPaid || 0) + (booking.advancePaid || 0)}
                        </span>
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Reason (Optional)</span>
                        <input
                            type="text"
                            className="bk-edit-input"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for cancellation..."
                        />
                    </div>
                    <div className="bk-detail-row">
                        <span className="bk-detail-label">Refund Amount</span>
                        <input
                            type="number"
                            className="bk-edit-input"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                            min="0"
                            max={totalPaid}
                            placeholder="Enter refund amount"
                        />
                        <small className="bk-field-hint">
                            Max refund: ₹{totalPaid.toFixed(2)}
                        </small>
                    </div>
                </div>
                <div className="bk-modal-footer">
                    <button className="bk-cancel-btn" onClick={onClose}>Close</button>
                    <button
                        className="bk-delete-btn"
                        onClick={() => onConfirm(reason, refundAmount)}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// BOOKING MODAL - UPDATED WITH BOOKING TYPE DISPLAY
// ============================================
const BookingModal = ({
    booking,
    onClose,
    onUpdate,
    onDelete,
    onCancel,
    onConvert,
    onDownload,
    onAddRoom,
    onRemoveRoom,
    onChangeRoom,
    sendWhatsAppMessage,
    generatePDF,
    handlePrintAndWhatsApp,
    isPDFGenerating,
    isWhatsAppSending,
    isPrintAndWhatsAppProcessing,
    isUpdating
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedBooking, setEditedBooking] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [editExtraRequirements, setEditExtraRequirements] = useState([]);
    const [editPaymentDetails, setEditPaymentDetails] = useState([]);
    const [editRoomDetails, setEditRoomDetails] = useState([]);
    const [liveCalculatedPrice, setLiveCalculatedPrice] = useState(null);
    const [paymentValidationError, setPaymentValidationError] = useState('');
    const [bookingType, setBookingType] = useState('simple');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => document.body.style.overflow = 'auto';
    }, []);

    useEffect(() => {
        if (booking) {
            const checkInIST = convertUTCToIST(booking.checkInDate);
            const checkOutIST = convertUTCToIST(booking.checkOutDate);

            setEditedBooking({
                ...booking,
                checkInDate: checkInIST,
                checkOutDate: checkOutIST,
                taxSlab: booking.taxSlab || 18,
                amountPaid: booking.amountPaid || 0,
                paymentStatus: booking.paymentStatus || 'Not Paid'
            });
            setEditExtraRequirements(booking.extraRequirements || []);
            setEditPaymentDetails(booking.paymentDetails || []);
            setEditRoomDetails(booking.roomDetails || []);
            setBookingType(booking.bookingType || 'simple');
            setLiveCalculatedPrice(null);
            setPaymentValidationError('');
        }
    }, [booking]);

    useEffect(() => {
        if (isEditing && booking) {
            calculateLivePrice();
        }
    }, [editedBooking.taxSlab, editExtraRequirements, editPaymentDetails, isEditing, editedBooking.amountPaid, editRoomDetails]);

    const calculateLivePrice = () => {
        if (!booking) return;

        const basePrice = editRoomDetails.reduce((sum, room) => sum + (room.price || 0), 0);
        const extrasTotal = editExtraRequirements.reduce((sum, req) => sum + (parseFloat(req.price) || 0), 0);
        const subtotal = basePrice + extrasTotal;
        const taxSlab = parseInt(editedBooking.taxSlab) || 18;
        const taxAmount = (subtotal * taxSlab) / 100;
        const grandTotal = subtotal + taxAmount;

        const amountPaid = parseFloat(editedBooking.amountPaid) || 0;
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

    const handleRoomPriceChange = (index, newPrice) => {
        const updated = [...editRoomDetails];
        updated[index].price = parseFloat(newPrice) || 0;
        setEditRoomDetails(updated);
        calculateLivePrice();
    };

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

    const handleSaveEdit = async () => {
        const grandTotal = liveCalculatedPrice?.grandTotal || booking.grandTotal || 0;
        const paymentTotal = editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);

        if (editPaymentDetails.length > 0 && paymentTotal > grandTotal) {
            toast.error(`Total payment (₹${paymentTotal.toFixed(2)}) cannot exceed Grand Total (₹${grandTotal.toFixed(2)})`);
            return;
        }

        if (editedBooking.paymentStatus === 'Partial Paid') {
            const amountPaid = parseFloat(editedBooking.amountPaid) || 0;
            if (amountPaid > grandTotal) {
                toast.error(`Amount paid (₹${amountPaid.toFixed(2)}) cannot exceed Grand Total (₹${grandTotal.toFixed(2)})`);
                return;
            }
        }

        const updateData = {
            ...editedBooking,
            extraRequirements: editExtraRequirements,
            paymentDetails: editPaymentDetails,
            roomDetails: editRoomDetails,
            bookingType: bookingType
        };

        await onUpdate(booking.bookingId, updateData);
        setIsEditing(false);
    };

    const renderPriceBreakdown = () => {
        const amountPaidVal = booking.amountPaid || 0;
        const remainingVal = Math.max(0, (booking.grandTotal || 0) - amountPaidVal);

        return (
            <div className="bk-price-breakdown-box">
                <h4><FaCalculator /> Price Breakdown</h4>
                <div className="bk-price-breakdown-grid">
                    <span><strong>Booking Type:</strong></span>
                    <span className="bk-price-val">{booking.bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}</span>

                    <span>Base Price:</span>
                    <span className="bk-price-val">₹{(booking.basePrice || 0).toFixed(2)}</span>

                    <span>Extra Requirements:</span>
                    <span className="bk-price-val">₹{(booking.extraRequirementsTotal || 0).toFixed(2)}</span>

                    <hr className="bk-price-divider" />

                    <span><strong>Subtotal:</strong></span>
                    <span className="bk-price-val"><strong>₹{(booking.subtotal || 0).toFixed(2)}</strong></span>

                    <span>Tax ({booking.taxSlab}%):</span>
                    <span className="bk-price-val">₹{(booking.taxAmount || 0).toFixed(2)}</span>

                    <hr className="bk-price-divider bk-price-divider-thick" />

                    <span className="bk-price-grand-label"><strong>Grand Total:</strong></span>
                    <span className="bk-price-val bk-price-grand-value">
                        ₹{(booking.grandTotal || 0).toFixed(2)}
                    </span>

                    <hr className="bk-price-divider" />

                    <span>Amount Paid:</span>
                    <span className="bk-price-val">₹{amountPaidVal.toFixed(2)}</span>

                    <span className="bk-price-grand-label"><strong>Remaining Amount:</strong></span>
                    <span className={`bk-price-val bk-price-grand-value ${remainingVal > 0 ? 'bk-balance-due' : 'bk-balance-clear'}`}>
                        ₹{remainingVal.toFixed(2)}
                    </span>
                </div>
            </div>
        );
    };

    const renderLivePriceBreakdown = () => {
        if (!liveCalculatedPrice) return null;

        const { basePrice, extrasTotal, subtotal, taxSlab, taxAmount, grandTotal, amountPaid, remainingAmount, paymentTotal } = liveCalculatedPrice;

        const paymentType = editPaymentDetails.length > 0
            ? (new Set(editPaymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : editPaymentDetails[0].method)
            : 'Cash';

        return (
            <div className="bk-price-breakdown-box bk-live-price">
                <h4><FaCalculator /> Live Price Calculation</h4>
                <div className="bk-price-breakdown-grid">
                    <span><strong>Booking Type:</strong></span>
                    <span className="bk-price-val">{bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}</span>

                    <span>Base Price:</span>
                    <span className="bk-price-val">₹{basePrice.toFixed(2)}</span>

                    <span>Extra Requirements:</span>
                    <span className="bk-price-val">₹{extrasTotal.toFixed(2)}</span>

                    <hr className="bk-price-divider" />

                    <span><strong>Subtotal:</strong></span>
                    <span className="bk-price-val"><strong>₹{subtotal.toFixed(2)}</strong></span>

                    <span>Tax ({taxSlab}%):</span>
                    <span className="bk-price-val">₹{taxAmount.toFixed(2)}</span>

                    <hr className="bk-price-divider bk-price-divider-thick" />

                    <span className="bk-price-grand-label"><strong>Grand Total:</strong></span>
                    <span className="bk-price-val bk-price-grand-value">
                        ₹{grandTotal.toFixed(2)}
                    </span>

                    <hr className="bk-price-divider" />

                    <span>Amount Paid:</span>
                    <span className="bk-price-val">₹{amountPaid.toFixed(2)}</span>

                    <span className="bk-price-grand-label"><strong>Remaining Amount:</strong></span>
                    <span className={`bk-price-val bk-price-grand-value ${remainingAmount > 0 ? 'bk-balance-due' : 'bk-balance-clear'}`}>
                        ₹{remainingAmount.toFixed(2)}
                    </span>

                    {editPaymentDetails.length > 0 && (
                        <>
                            <hr className="bk-price-divider" />
                            <span className="bk-price-grand-label"><strong>Payment Type:</strong></span>
                            <span className="bk-price-val bk-price-grand-value">
                                {paymentType}
                            </span>
                            <span className="bk-price-grand-label"><strong>Payment Total:</strong></span>
                            <span className={`bk-price-val bk-price-grand-value ${paymentTotal > grandTotal ? 'bk-balance-due' : ''}`}>
                                ₹{paymentTotal.toFixed(2)}
                            </span>
                            {paymentTotal > grandTotal && (
                                <span className="bk-price-error" style={{ gridColumn: '1 / -1', color: '#dc3545', fontSize: '13px' }}>
                                    ⚠️ Payment total exceeds Grand Total!
                                </span>
                            )}
                        </>
                    )}
                </div>
                {paymentValidationError && (
                    <div className="bk-error-message" style={{ color: '#dc3545', marginTop: '8px', padding: '8px', background: '#f8d7da', borderRadius: '4px' }}>
                        <FaExclamationTriangle /> {paymentValidationError}
                    </div>
                )}
                <small className="bk-live-price-hint">* Prices update automatically when you change Tax Slab, Requirements or Room Prices</small>
            </div>
        );
    };

    const renderPaymentDetails = () => {
        if (!booking.paymentDetails || booking.paymentDetails.length === 0) {
            return <span className="bk-detail-value">No payment details</span>;
        }

        return (
            <div className="bk-payment-details-list">
                {booking.paymentDetails.map((payment, idx) => (
                    <div key={idx} className="bk-payment-detail-item">
                        <span className="bk-payment-method">{payment.method}:</span>
                        <span className="bk-payment-amount">₹{payment.amount.toFixed(2)}</span>
                        {payment.reference && <span className="bk-payment-ref">({payment.reference})</span>}
                    </div>
                ))}
                <div className="bk-payment-total">
                    <strong>Payment Type:</strong> {booking.paymentType || 'Cash'}
                </div>
            </div>
        );
    };

    if (!booking) return null;

    return (
        <div className="bk-modal-overlay" onClick={onClose}>
            <div className="bk-modal-content bk-modal-lg" onClick={e => e.stopPropagation()}>
                <div className="bk-modal-header">
                    <div className="bk-modal-title">
                        {isEditing ? "Edit Booking" : `Booking: ${booking.bookingNumber}`}
                        {!isEditing && booking.bookingType === 'perNight' && (
                            <span className="bk-booking-type-badge bk-pernight-badge">🌙 Night Stay</span>
                        )}
                    </div>
                    <button className="bk-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="bk-modal-body">
                    {isEditing ? (
                        <div className="bk-details-grid">
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Booking Type</span>
                                <span className="bk-detail-value">
                                    <span className="bk-booking-type-badge bk-pernight-badge">
                                        {bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}
                                    </span>
                                    <small className="bk-field-hint" style={{ display: 'block', marginTop: '4px' }}>
                                        Booking type cannot be changed
                                    </small>
                                </span>
                            </div>

                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Guest Name</span>
                                <input
                                    type="text"
                                    className="bk-edit-input"
                                    value={editedBooking.customerName || ''}
                                    onChange={(e) => setEditedBooking(prev => ({ ...prev, customerName: e.target.value }))}
                                />
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Phone</span>
                                <input
                                    type="text"
                                    className="bk-edit-input"
                                    value={editedBooking.customerPhone || ''}
                                    onChange={(e) => setEditedBooking(prev => ({ ...prev, customerPhone: e.target.value }))}
                                />
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Email</span>
                                <input
                                    type="email"
                                    className="bk-edit-input"
                                    value={editedBooking.customerEmail || ''}
                                    onChange={(e) => setEditedBooking(prev => ({ ...prev, customerEmail: e.target.value }))}
                                />
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Check-in Date & Time (IST)</span>
                                <input
                                    type="datetime-local"
                                    className="bk-edit-input"
                                    value={editedBooking.checkInDate || ''}
                                    onChange={(e) => setEditedBooking(prev => ({ ...prev, checkInDate: e.target.value }))}
                                />
                                <small className="bk-field-hint">Time will be saved in IST</small>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Check-out Date & Time (IST)</span>
                                <input
                                    type="datetime-local"
                                    className="bk-edit-input"
                                    value={editedBooking.checkOutDate || ''}
                                    onChange={(e) => setEditedBooking(prev => ({ ...prev, checkOutDate: e.target.value }))}
                                />
                                <small className="bk-field-hint">Time will be saved in IST</small>
                            </div>

                            {/* ===== EDITABLE ROOM PRICES ===== */}
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Room Prices</span>
                                <div className="bk-edit-room-prices">
                                    {editRoomDetails.map((room, index) => (
                                        <div key={index} className="bk-room-price-edit-row">
                                            <div className="bk-room-info-edit">
                                                <strong>{room.roomNumber}</strong>
                                                <span className="bk-room-category">{room.categoryName}</span>
                                                <span className="bk-room-duration">{room.durationLabel}</span>
                                            </div>
                                            <div className="bk-room-price-input-group">
                                                <span className="bk-currency-symbol">₹</span>
                                                <input
                                                    type="number"
                                                    className="bk-edit-input bk-room-price-input"
                                                    value={room.price || 0}
                                                    onChange={(e) => handleRoomPriceChange(index, e.target.value)}
                                                    min="0"
                                                    step="1"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <small className="bk-field-hint">Edit room prices as needed</small>
                                </div>
                            </div>

                            {renderLivePriceBreakdown()}

                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Tax Slab</span>
                                <select
                                    className="bk-edit-input"
                                    value={editedBooking.taxSlab || 18}
                                    onChange={(e) => {
                                        const newTaxSlab = parseInt(e.target.value);
                                        setEditedBooking(prev => ({ ...prev, taxSlab: newTaxSlab }));
                                    }}
                                >
                                    <option value="5">5%</option>
                                    <option value="10">10%</option>
                                    <option value="18">18%</option>
                                </select>
                                <small className="bk-field-hint">* Price updates live when you change Tax Slab</small>
                            </div>

                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Payment Status</span>
                                <select
                                    className="bk-edit-input"
                                    value={editedBooking.paymentStatus || 'Not Paid'}
                                    onChange={(e) => {
                                        const newStatus = e.target.value;
                                        setEditedBooking(prev => ({ ...prev, paymentStatus: newStatus }));
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

                            {editedBooking.paymentStatus === 'Partial Paid' && (
                                <div className="bk-detail-row">
                                    <span className="bk-detail-label">Amount Paid</span>
                                    <input
                                        type="number"
                                        className="bk-edit-input"
                                        min="0"
                                        max={liveCalculatedPrice?.grandTotal || booking.grandTotal || 0}
                                        value={editedBooking.amountPaid || 0}
                                        onChange={(e) => {
                                            const newAmount = parseFloat(e.target.value) || 0;
                                            const maxAmount = liveCalculatedPrice?.grandTotal || booking.grandTotal || 0;
                                            if (newAmount > maxAmount) {
                                                toast.warning(`Amount cannot exceed Grand Total (₹${maxAmount.toFixed(2)})`);
                                                return;
                                            }
                                            setEditedBooking(prev => ({ ...prev, amountPaid: newAmount }));
                                        }}
                                    />
                                    <small className="bk-field-hint">
                                        Max: ₹{(liveCalculatedPrice?.grandTotal || booking.grandTotal || 0).toFixed(2)}
                                    </small>
                                </div>
                            )}

                            {editedBooking.paymentStatus !== 'Not Paid' && (
                                <div className="bk-detail-row">
                                    <span className="bk-detail-label">Payment Details</span>
                                    <div className="bk-payment-details-edit">
                                        {editPaymentDetails.map((payment, index) => {
                                            const availableMethods = getAvailablePaymentMethods(index);
                                            const grandTotal = liveCalculatedPrice?.grandTotal || booking.grandTotal || 0;
                                            const currentPaymentTotal = editPaymentDetails.reduce((sum, p, idx) =>
                                                idx === index ? sum : sum + (p.amount || 0), 0
                                            );
                                            const maxAmountForThis = Math.max(0, grandTotal - currentPaymentTotal);

                                            return (
                                                <div key={index} className="bk-payment-row">
                                                    <select
                                                        className="bk-edit-input bk-payment-method-select"
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
                                                        className="bk-edit-input bk-payment-amount-input"
                                                        placeholder="Amount"
                                                        value={payment.amount || 0}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            if (val > grandTotal) {
                                                                toast.warning(`Amount cannot exceed Grand Total (₹${grandTotal.toFixed(2)})`);
                                                                return;
                                                            }
                                                            handlePaymentDetailChange(index, 'amount', val);
                                                        }}
                                                        min="0"
                                                        max={grandTotal}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="bk-remove-payment-btn"
                                                        onClick={() => handleRemovePaymentDetail(index)}
                                                        disabled={editPaymentDetails.length <= 1}
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        <div className="bk-payment-actions">
                                            <button
                                                type="button"
                                                className="bk-add-payment-btn"
                                                onClick={handleAddPaymentDetail}
                                                disabled={editPaymentDetails.length >= PAYMENT_METHODS.length}
                                            >
                                                <FaPlus /> Add Payment Method
                                            </button>
                                            {editPaymentDetails.length >= PAYMENT_METHODS.length && (
                                                <small className="bk-field-hint">All payment methods are already added</small>
                                            )}
                                        </div>
                                        {editPaymentDetails.length > 0 && (
                                            <small className="bk-field-hint">
                                                Total: ₹{editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                                                {' | '}Type: {new Set(editPaymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : (editPaymentDetails[0]?.method || 'Cash')}
                                                {editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0) > (liveCalculatedPrice?.grandTotal || booking.grandTotal || 0) && (
                                                    <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                                                        ⚠️ Exceeds Grand Total!
                                                    </span>
                                                )}
                                            </small>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Extra Requirements</span>
                                <div className="bk-edit-extra-reqs">
                                    {editExtraRequirements.map((req, index) => (
                                        <div key={index} className="bk-extra-req-row-edit">
                                            <input
                                                type="text"
                                                className="bk-edit-input"
                                                placeholder="Description"
                                                value={req.description || ''}
                                                onChange={(e) => {
                                                    const newReqs = [...editExtraRequirements];
                                                    newReqs[index].description = e.target.value;
                                                    setEditExtraRequirements(newReqs);
                                                }}
                                            />
                                            <input
                                                type="number"
                                                className="bk-edit-input"
                                                placeholder="Price"
                                                value={req.price || 0}
                                                onChange={(e) => {
                                                    const newReqs = [...editExtraRequirements];
                                                    newReqs[index].price = parseFloat(e.target.value) || 0;
                                                    setEditExtraRequirements(newReqs);
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="bk-remove-req-btn"
                                                onClick={() => {
                                                    const newReqs = editExtraRequirements.filter((_, i) => i !== index);
                                                    setEditExtraRequirements(newReqs);
                                                }}
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="bk-add-req-btn"
                                        onClick={() => setEditExtraRequirements([...editExtraRequirements, { description: '', price: 0 }])}
                                    >
                                        <FaPlus /> Add Requirement
                                    </button>
                                </div>
                            </div>

                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Notes</span>
                                <textarea
                                    className="bk-edit-textarea"
                                    value={editedBooking.notes || ''}
                                    onChange={(e) => setEditedBooking(prev => ({ ...prev, notes: e.target.value }))}
                                    rows="2"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bk-details-grid">
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Booking #</span>
                                <span className="bk-detail-value">{booking.bookingNumber}</span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Booking Type</span>
                                <span className="bk-detail-value">
                                    <span className={`bk-booking-type-badge ${booking.bookingType === 'perNight' ? 'bk-pernight-badge' : 'bk-simple-badge'}`}>
                                        {booking.bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}
                                    </span>
                                </span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Guest Name</span>
                                <span className="bk-detail-value">{booking.customerName}</span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Phone</span>
                                <span className="bk-detail-value">{booking.customerPhone}</span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Email</span>
                                <span className="bk-detail-value">{booking.customerEmail || 'N/A'}</span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Rooms</span>
                                <div className="bk-detail-value bk-rooms-list">
                                    {booking.roomDetails?.map((room, idx) => (
                                        <div key={idx} className="bk-room-detail-item">
                                            <strong>{room.roomNumber}</strong> ({room.categoryName}) - ₹{room.price.toFixed(2)}
                                            <br />
                                            <small>{room.durationLabel}</small>
                                        </div>
                                    )) || booking.roomNumber}
                                </div>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Check-in</span>
                                <span className="bk-detail-value">{new Date(booking.checkInDate).toLocaleString()}</span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Check-out</span>
                                <span className="bk-detail-value">{new Date(booking.checkOutDate).toLocaleString()}</span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Duration</span>
                                <span className="bk-detail-value">{booking.durationLabel}</span>
                            </div>

                            <div className="bk-detail-row bk-price-breakdown-row">
                                <span className="bk-detail-label">Price Breakdown</span>
                                {renderPriceBreakdown()}
                            </div>

                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Payment Type</span>
                                <span className="bk-detail-value">
                                    <span className={`bk-payment-type-badge bk-payment-type-${(booking.paymentType || 'Cash').toLowerCase()}`}>
                                        {booking.paymentType || 'Cash'}
                                    </span>
                                </span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Payment Details</span>
                                <div className="bk-detail-value">
                                    {renderPaymentDetails()}
                                </div>
                            </div>

                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Status</span>
                                <span className={`bk-status-badge bk-status-${booking.status?.toLowerCase()}`}>
                                    {booking.status}
                                </span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Payment</span>
                                <span className={`bk-status-badge bk-status-${booking.paymentStatus?.toLowerCase().replace(' ', '')}`}>
                                    {booking.paymentStatus}
                                </span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Grand Total</span>
                                <span className="bk-detail-value bk-grand-total-value">
                                    ₹{(booking.grandTotal || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Amount Paid</span>
                                <span className="bk-detail-value">
                                    ₹{(booking.amountPaid || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="bk-detail-row">
                                <span className="bk-detail-label">Remaining Amount</span>
                                <span className={`bk-detail-value bk-balance-value ${booking.balanceAmount > 0 ? 'bk-balance-due' : 'bk-balance-clear'}`}>
                                    ₹{(booking.balanceAmount || 0).toFixed(2)}
                                </span>
                            </div>

                            {booking.refundAmount > 0 && (
                                <div className="bk-detail-row">
                                    <span className="bk-detail-label">Refund Amount</span>
                                    <span className="bk-detail-value bk-refund-amount">
                                        ₹{(booking.refundAmount || 0).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {booking.extraRequirements && booking.extraRequirements.length > 0 && (
                                <div className="bk-detail-row">
                                    <span className="bk-detail-label">Extra Requirements</span>
                                    <div className="bk-detail-value bk-extra-req-list">
                                        {booking.extraRequirements.map((req, idx) => (
                                            <div key={idx} className="bk-extra-req-list-item">
                                                {req.description}: ₹{req.price.toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {booking.notes && (
                                <div className="bk-detail-row">
                                    <span className="bk-detail-label">Notes</span>
                                    <span className="bk-detail-value">{booking.notes}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="bk-modal-footer">
                    {!isEditing && booking.status === 'Confirmed' && (
                        <>
                            <button className="bk-delete-btn" onClick={() => setShowCancelConfirm(true)}>
                                <FaBan /> Cancel Booking
                            </button>
                            <button
                                className="bk-add-room-btn"
                                onClick={() => onAddRoom(booking)}
                            >
                                <FaPlusSquare /> Add Room
                            </button>
                            <button
                                className="bk-remove-room-btn"
                                onClick={() => onRemoveRoom(booking)}
                            >
                                <FaTrashAlt /> Remove Room
                            </button>
                            <button
                                className="bk-change-room-btn"
                                onClick={() => onChangeRoom(booking)}
                            >
                                <FaExchangeAlt /> Change Room
                            </button>
                        </>
                    )}
                    {!isEditing && (
                        <>
                            <button
                                className="bk-whatsapp-btn"
                                onClick={() => sendWhatsAppMessage(booking)}
                                disabled={isWhatsAppSending}
                            >
                                {isWhatsAppSending ? (
                                    <>
                                        <div className="bk-loading-spinner small"></div>
                                        Sending...
                                    </>
                                ) : (
                                    <><FaWhatsapp /> WhatsApp</>
                                )}
                            </button>
                            <button
                                className="bk-export-btn"
                                onClick={() => generatePDF(booking)}
                                disabled={isPDFGenerating}
                            >
                                {isPDFGenerating ? (
                                    <>
                                        <div className="bk-loading-spinner small"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <><FaFilePdf /> PDF</>
                                )}
                            </button>
                            <button
                                className="bk-export-btn"
                                onClick={() => handlePrintAndWhatsApp(booking)}
                                disabled={isPrintAndWhatsAppProcessing}
                            >
                                {isPrintAndWhatsAppProcessing ? (
                                    <>
                                        <div className="bk-loading-spinner small"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <><FaPrint /> PDF + WhatsApp</>
                                )}
                            </button>
                        </>
                    )}
                    <button
                        className={`bk-update-btn ${isEditing ? 'bk-save-btn' : ''}`}
                        onClick={isEditing ? handleSaveEdit : () => setIsEditing(true)}
                        disabled={booking.status === 'Cancelled' || booking.status === 'Checked-in' || isUpdating}
                    >
                        {isEditing ? (
                            isUpdating ? (
                                <>
                                    <div className="bk-loading-spinner small"></div>
                                    Saving...
                                </>
                            ) : (
                                <><FaSave /> Save</>
                            )
                        ) : (
                            <><FaEdit /> Update</>
                        )}
                    </button>
                    {!isEditing && booking.status !== 'Cancelled' && booking.status !== 'Checked-in' && (
                        <button className="bk-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                            <FaTrash /> Delete
                        </button>
                    )}
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="bk-confirm-dialog-overlay">
                    <div className="bk-confirm-dialog">
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete booking {booking.bookingNumber}? This action cannot be undone.</p>
                        <div className="bk-confirm-buttons">
                            <button className="bk-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className="bk-confirm-delete" onClick={() => { onDelete(booking.bookingId); setShowDeleteConfirm(false); }}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCancelConfirm && (
                <div className="bk-confirm-dialog-overlay">
                    <div className="bk-confirm-dialog">
                        <h3>Confirm Cancellation</h3>
                        <p>Are you sure you want to cancel booking {booking.bookingNumber}?</p>
                        <div className="bk-confirm-buttons">
                            <button className="bk-confirm-cancel" onClick={() => setShowCancelConfirm(false)}>Cancel</button>
                            <button className="bk-confirm-delete" onClick={() => { onCancel(booking); setShowCancelConfirm(false); }}>
                                Confirm Cancellation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// MAIN BOOKING COMPONENT
// ============================================
const Booking = () => {
    const [showForm, setShowForm] = useState(false);
    const [bookings, setBookings] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState("Confirmed");
    const [filterDate, setFilterDate] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    // ===== INDIVIDUAL LOADING STATES =====
    const [pdfLoadingStates, setPdfLoadingStates] = useState({});
    const [whatsappLoadingStates, setWhatsappLoadingStates] = useState({});
    const [printWhatsappLoadingStates, setPrintWhatsappLoadingStates] = useState({});
    const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);

    // Customer search
    const [customers, setCustomers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Add Customer Modal
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);

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

    // Price calculation state
    const [calculatedPrice, setCalculatedPrice] = useState(null);
    const [bookingType, setBookingType] = useState('simple');
    const [editableRoomPrices, setEditableRoomPrices] = useState([]);

    // Convert to Check-in modal
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [convertBooking, setConvertBooking] = useState(null);
    const [isConverting, setIsConverting] = useState(false);

    // Cancel modal
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelBookingData, setCancelBookingData] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelRefundAmount, setCancelRefundAmount] = useState(0);

    // ===== MODAL STATES =====
    const [showAddRoomModal, setShowAddRoomModal] = useState(false);
    const [addRoomData, setAddRoomData] = useState(null);
    const [showRemoveRoomModal, setShowRemoveRoomModal] = useState(false);
    const [removeRoomData, setRemoveRoomData] = useState(null);
    const [showChangeRoomModal, setShowChangeRoomModal] = useState(false);
    const [changeRoomData, setChangeRoomData] = useState(null);
    const [isLoadingModalRooms, setIsLoadingModalRooms] = useState(false);

    // Booking for print
    const [bookingForPrint, setBookingForPrint] = useState(null);

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
        fetchBookings(debouncedSearch, filterStatus, filterDate);
    }, [debouncedSearch, filterStatus, filterDate]);

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

    const fetchBookings = async (search = '', status = '', date = '') => {
        try {
            setIsLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/booking/get-bookings`);
            url.searchParams.append('page', 1);
            url.searchParams.append('limit', 50);
            if (search) url.searchParams.append('search', search);
            if (status) url.searchParams.append('status', status);
            if (date) url.searchParams.append('startDate', date);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setBookings(data.data || []);
            } else {
                throw new Error(data.message || 'Failed to fetch bookings');
            }
        } catch (err) {
            console.error("Error fetching bookings:", err);
            toast.error("Failed to fetch bookings");
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

    const fetchAvailableRooms = async (checkInDate, checkOutDate, categoryId = '') => {
        try {
            setIsLoadingRooms(true);
            setSelectedRooms([]);
            setCalculatedPrice(null);
            setEditableRoomPrices([]);
            const url = new URL(`${import.meta.env.VITE_API_URL}/booking/available-rooms`);
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

    const fetchAvailableRoomsForBookingId = async (bookingId, checkInDate, checkOutDate) => {
        try {
            setIsLoadingModalRooms(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/booking/available-rooms`);
            url.searchParams.append('checkInDate', checkInDate);
            url.searchParams.append('checkOutDate', checkOutDate);
            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error("Error fetching available rooms:", error);
            toast.error("Failed to fetch available rooms");
            return [];
        } finally {
            setIsLoadingModalRooms(false);
        }
    };

    // ============================================
    // ROOM HANDLERS
    // ============================================
    const handleAddRoom = async (bookingId, newRoomId) => {
        try {
            setIsFormSubmitting(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/booking/add-room/${bookingId}`,
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
            fetchBookings(debouncedSearch, filterStatus, filterDate);
            setSelectedBooking(null);
        } catch (error) {
            console.error("Error adding room:", error);
            toast.error(error.message || "Error adding room");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    const handleRemoveRoom = async (bookingId, roomId, reason) => {
        try {
            setIsFormSubmitting(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/booking/remove-room/${bookingId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roomId, reason }),
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
            fetchBookings(debouncedSearch, filterStatus, filterDate);
            setSelectedBooking(null);
        } catch (error) {
            console.error("Error removing room:", error);
            toast.error(error.message || "Error removing room");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    const handleChangeRoom = async (bookingId, oldRoomId, newRoomId) => {
        try {
            setIsFormSubmitting(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/booking/change-room/${bookingId}`,
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
            fetchBookings(debouncedSearch, filterStatus, filterDate);
            setSelectedBooking(null);
        } catch (error) {
            console.error("Error changing room:", error);
            toast.error(error.message || "Error changing room");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    // ============================================
    // MODAL OPEN HANDLERS
    // ============================================
    const handleOpenAddRoom = (booking) => {
        setAddRoomData(booking);
        setShowAddRoomModal(true);
    };

    const handleOpenRemoveRoom = (booking) => {
        setRemoveRoomData(booking);
        setShowRemoveRoomModal(true);
    };

    const handleOpenChangeRoom = (booking) => {
        setChangeRoomData(booking);
        setShowChangeRoomModal(true);
    };

    // ============================================
    // ADD CUSTOMER HANDLERS
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

    const createCustomerInline = async () => {
        try {
            setIsCreatingCustomer(true);

            if (!newCustomerData.customerName || !newCustomerData.contactNumber) {
                toast.error("Name and Phone are required");
                setIsCreatingCustomer(false);
                return;
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/customer/create-customer`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newCustomerData),
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
            setShowCreateCustomer(false);
            setNewCustomerData({ customerName: '', contactNumber: '', email: '' });
        } catch (error) {
            console.error("Error creating customer:", error);
            toast.error(error.message || "Error creating customer");
        } finally {
            setIsCreatingCustomer(false);
        }
    };

    // ============================================
    // WHATSAPP INTEGRATION - INDIVIDUAL LOADING
    // ============================================
    const sendWhatsAppMessage = async (booking) => {
        if (!booking) return;

        const key = booking.bookingId || booking.bookingNumber;
        if (whatsappLoadingStates[key]) return;

        try {
            setWhatsappLoadingStates(prev => ({ ...prev, [key]: true }));

            const customerPhone = booking.customerPhone?.replace(/\D/g, '') || '';
            if (!customerPhone) {
                toast.error("Customer phone number not available");
                return;
            }

            const roomNumbers = booking.roomDetails?.map(r => r.roomNumber).join(', ') || booking.roomNumber;
            const durationDisplay = booking.bookingType === 'perNight' ? '🌙 Night Stay' : booking.durationLabel;

            const message = `🏨 *BOOKING CONFIRMATION* 🏨

Hello ${booking.customerName},

Your booking has been confirmed successfully!

📋 *Booking Details:*
🆔 Booking #: ${booking.bookingNumber}
🛏️ Room(s): ${roomNumbers}
📅 Check-in: ${new Date(booking.checkInDate).toLocaleString()}
📅 Check-out: ${new Date(booking.checkOutDate).toLocaleString()}
⏱️ Duration: ${durationDisplay}

💰 *Payment Summary:*
📊 Subtotal: ₹${(booking.subtotal || 0).toFixed(2)}
🧾 Tax (${booking.taxSlab || 18}%): ₹${(booking.taxAmount || 0).toFixed(2)}
💰 Grand Total: ₹${(booking.grandTotal || 0).toFixed(2)}`;

            let paymentMessage = '';
            if (booking.amountPaid > 0) {
                paymentMessage += `💳 Amount Paid: ₹${(booking.amountPaid || 0).toFixed(2)}\n`;
            }
            if (booking.balanceAmount > 0) {
                paymentMessage += `⚖️ Balance: ₹${(booking.balanceAmount || 0).toFixed(2)}\n`;
            }
            if (booking.paymentType) {
                paymentMessage += `💳 Payment Type: ${booking.paymentType}\n`;
            }

            const finalMessage = message +
                (paymentMessage ? `\n${paymentMessage}` : '') +
                `

Thank you for choosing us! 🙏
We look forward to welcoming you!`;

            const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(finalMessage)}`;
            window.open(whatsappUrl, '_blank');

            toast.success("WhatsApp message opened!");
        } catch (error) {
            console.error("Error sending WhatsApp:", error);
            toast.error("Failed to send WhatsApp message");
        } finally {
            setWhatsappLoadingStates(prev => ({ ...prev, [key]: false }));
        }
    };

    // ============================================
    // PDF GENERATION - INDIVIDUAL LOADING
    // ============================================
    const generatePDF = async (booking) => {
        if (!booking) return;

        const key = booking.bookingId || booking.bookingNumber;
        if (pdfLoadingStates[key]) return;

        try {
            setPdfLoadingStates(prev => ({ ...prev, [key]: true }));

            setBookingForPrint(booking);
            await new Promise(resolve => setTimeout(resolve, 500));

            const element = document.getElementById("booking-pdf");
            if (!element) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const retryElement = document.getElementById("booking-pdf");
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
                filename: `Booking_${booking.bookingNumber}.pdf`,
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
            setPdfLoadingStates(prev => ({ ...prev, [key]: false }));
            setBookingForPrint(null);
        }
    };

    // ============================================
    // PRINT + WHATSAPP - INDIVIDUAL LOADING
    // ============================================
    const handlePrintAndWhatsApp = async (booking) => {
        if (!booking) return;

        const key = booking.bookingId || booking.bookingNumber;
        if (printWhatsappLoadingStates[key]) return;

        try {
            setPrintWhatsappLoadingStates(prev => ({ ...prev, [key]: true }));

            await generatePDF(booking);
            await new Promise(resolve => setTimeout(resolve, 1500));
            await sendWhatsAppMessage(booking);

        } catch (error) {
            console.error("Error in Print and WhatsApp:", error);
            toast.error("Failed to complete Print and WhatsApp action");
        } finally {
            setPrintWhatsappLoadingStates(prev => ({ ...prev, [key]: false }));
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
                        // ✅ PER NIGHT MODE - Directly use perNight price
                        price = pricing.perNight || 0;
                        label = 'Night Stay';
                    } else {
                        // ✅ SIMPLE MODE - Duration based calculation
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

        // Update calculated price total
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

    const handleDateChange = (setFieldValue, checkInDate, checkOutDate) => {
        if (checkInDate && checkOutDate) {
            const start = new Date(checkInDate);
            const end = new Date(checkOutDate);
            if (end > start) {
                fetchAvailableRooms(checkInDate, checkOutDate);
                // Calculate preview after rooms are fetched
                setTimeout(() => {
                    if (selectedRooms.length > 0) {
                        calculatePricePreview(checkInDate, checkOutDate, selectedRooms, availableRooms, bookingType === 'perNight');
                    }
                }, 500);
            } else {
                toast.warning("Check-out date must be after check-in date");
                setCalculatedPrice(null);
                setEditableRoomPrices([]);
            }
        }
    };

    const handleBookingTypeChange = (isPerNight, setFieldValue) => {
        const newType = isPerNight ? 'perNight' : 'simple';
        setBookingType(newType);

        // ✅ AUTO-FILL CHECKOUT FOR PER NIGHT
        if (isPerNight && formikRef.current) {
            const { checkInDate } = formikRef.current.values;
            if (checkInDate) {
                const checkIn = new Date(checkInDate);
                const checkOut = new Date(checkIn);
                checkOut.setDate(checkOut.getDate() + 1); // Next day
                checkOut.setHours(10, 0, 0, 0); // LOCAL 10:00 AM

                const pad = (n) => String(n).padStart(2, '0');
                const checkOutString = `${checkOut.getFullYear()}-${pad(checkOut.getMonth() + 1)}-${pad(checkOut.getDate())}T10:00`;

                setFieldValue('checkOutDate', checkOutString);
                toast.info(`Check-out auto-set to ${checkOut.toLocaleString()}`);

                // ✅ fetch rooms directly with new checkout
                fetchAvailableRooms(checkInDate, checkOutString);
            }
        } else {
            // ✅ Clear check-out when unchecking Per Night
            if (setFieldValue) {
                setFieldValue('checkOutDate', '');
            }
            setAvailableRooms([]);
            setSelectedRooms([]);
            setCalculatedPrice(null);
            setEditableRoomPrices([]);
        }

        // Recalculate prices with new type
        if (formikRef.current) {
            const { checkInDate, checkOutDate } = formikRef.current.values;
            if (checkInDate && checkOutDate && selectedRooms.length > 0) {
                calculatePricePreview(checkInDate, checkOutDate, selectedRooms, availableRooms, isPerNight);
            }
        }
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
    // CREATE BOOKING - UPDATED WITH PER NIGHT
    // ============================================
    const handleCreateBooking = async (values, { resetForm, setFieldError }) => {
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

            const paymentDetails = values.paymentDetails || [];

            const payload = {
                customerId: selectedCustomer.customerId,
                customerName: selectedCustomer.customerName,
                customerPhone: selectedCustomer.contactNumber,
                customerEmail: selectedCustomer.email || '',
                roomIds: selectedRooms,
                roomDetails: roomDetails,
                checkInDate: values.checkInDate,
                checkOutDate: values.checkOutDate,
                bookingType: bookingType,
                durationLabel: bookingType === 'perNight' ? 'Night Stay' : (calculatedPrice?.breakdown[0]?.label || ''),
                taxSlab: values.taxSlab,
                amountPaid: values.amountPaid || 0,
                advancePaid: values.advancePaid || 0,
                notes: values.notes || '',
                extraRequirements: values.extraRequirements || [],
                paymentDetails: paymentDetails
            };

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/booking/create-booking`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create booking");
            }

            toast.success(`Booking created successfully with ${selectedRooms.length} room(s)!`);

            if (data.data) {
                setTimeout(() => {
                    generatePDF(data.data);
                }, 1000);
            }

            resetForm();
            setSelectedCustomer(null);
            setCustomerSearch("");
            setAvailableRooms([]);
            setSelectedRooms([]);
            setCalculatedPrice(null);
            setEditableRoomPrices([]);
            setBookingType('simple');
            setShowForm(false);
            fetchBookings(debouncedSearch, filterStatus, filterDate);
        } catch (error) {
            console.error("Error creating booking:", error);
            toast.error(error.message || "Error creating booking");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    // ============================================
    // UPDATE BOOKING - UPDATED WITH PER NIGHT
    // ============================================
    const handleUpdateBooking = async (bookingId, values) => {
        try {
            setIsUpdatingBooking(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/booking/update-booking/${bookingId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update booking");
            }

            toast.success("Booking updated successfully!");
            fetchBookings(debouncedSearch, filterStatus, filterDate);
        } catch (error) {
            console.error("Error updating booking:", error);
            toast.error(error.message || "Error updating booking");
        } finally {
            setIsUpdatingBooking(false);
        }
    };

    // ============================================
    // CANCEL BOOKING
    // ============================================
    const handleCancelBooking = async () => {
        try {
            if (!cancelBookingData) return;

            setIsFormSubmitting(true);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/booking/cancel-booking/${cancelBookingData.bookingId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        reason: cancelReason,
                        refundAmount: cancelRefundAmount
                    }),
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to cancel booking");
            }

            toast.success("Booking cancelled successfully!");
            setShowCancelModal(false);
            setCancelBookingData(null);
            setCancelReason('');
            setCancelRefundAmount(0);
            fetchBookings(debouncedSearch, filterStatus, filterDate);
        } catch (error) {
            console.error("Error cancelling booking:", error);
            toast.error(error.message || "Error cancelling booking");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        try {
            setIsFormSubmitting(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/booking/delete-booking/${bookingId}`,
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
            fetchBookings(debouncedSearch, filterStatus, filterDate);
        } catch (error) {
            console.error("Error deleting booking:", error);
            toast.error(error.message || "Error deleting booking");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    const handleConvertToCheckin = async (booking) => {
        try {
            setIsConverting(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/booking/convert-to-checkin/${booking.bookingId}`,
                {
                    method: "POST",
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to convert booking");
            }

            sessionStorage.setItem('bookingData', JSON.stringify(data.data));
            toast.success("Booking data loaded for check-in!");
            setShowConvertModal(false);
            window.location.href = '/checkin?fromBooking=true';
        } catch (error) {
            console.error("Error converting booking:", error);
            toast.error(error.message || "Error converting booking");
        } finally {
            setIsConverting(false);
        }
    };

    // ============================================
    // DOWNLOAD RECEIPT
    // ============================================
    const downloadReceipt = (booking) => {
        const roomDetailsHtml = booking.roomDetails && booking.roomDetails.length > 0
            ? booking.roomDetails.map(room => `
          <div style="border-bottom: 1px solid #eee; padding: 5px 0;">
            <strong>${room.roomNumber}</strong> (${room.categoryName}) - ₹${room.price.toFixed(2)}
            <br/><small>${room.durationLabel}</small>
          </div>
        `).join('')
            : `<div><strong>${booking.roomNumber}</strong> (${booking.categoryName})</div>`;

        let paymentDetailsHtml = '';
        if (booking.paymentDetails && booking.paymentDetails.length > 0) {
            paymentDetailsHtml = booking.paymentDetails.map(p => `
                <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee;">
                    <span>${p.method}</span>
                    <span>₹${p.amount.toFixed(2)}${p.reference ? ` (${p.reference})` : ''}</span>
                </div>
            `).join('');
            paymentDetailsHtml = `
                <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                    <strong>Payment Type:</strong> ${booking.paymentType || 'Cash'}
                    <div style="margin-top: 5px;">${paymentDetailsHtml}</div>
                </div>
            `;
        }

        const content = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #3f3f91; padding-bottom: 20px;">
          <h1 style="color: #3f3f91; margin: 0;">HOTEL MANAGEMENT</h1>
          <p style="color: #666;">Booking Receipt</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <div>
            <h3 style="color: #3f3f91; margin: 0 0 10px 0;">Guest Details</h3>
            <p><strong>Name:</strong> ${booking.customerName}</p>
            <p><strong>Phone:</strong> ${booking.customerPhone}</p>
            <p><strong>Email:</strong> ${booking.customerEmail || 'N/A'}</p>
          </div>
          <div>
            <h3 style="color: #3f3f91; margin: 0 0 10px 0;">Booking Details</h3>
            <p><strong>Booking #:</strong> ${booking.bookingNumber}</p>
            <p><strong>Type:</strong> ${booking.bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}</p>
            <p><strong>Rooms:</strong> ${booking.roomDetails?.length || 1}</p>
            <p><strong>Duration:</strong> ${booking.durationLabel}</p>
          </div>
        </div>
        
        <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3 style="color: #3f3f91; margin: 0 0 10px 0;">Room Details</h3>
          ${roomDetailsHtml}
        </div>
        
        <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3 style="color: #3f3f91; margin: 0 0 10px 0;">Stay Details</h3>
          <p><strong>Check-in:</strong> ${new Date(booking.checkInDate).toLocaleString()}</p>
          <p><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toLocaleString()}</p>
        </div>
        
        <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3 style="color: #3f3f91; margin: 0 0 10px 0;">Price Breakdown</h3>
          <p><strong>Base Price:</strong> ₹${(booking.basePrice || 0).toFixed(2)}</p>
          ${booking.extraRequirementsTotal > 0 ? `<p><strong>Extra Requirements:</strong> ₹${(booking.extraRequirementsTotal || 0).toFixed(2)}</p>` : ''}
          <p><strong>Subtotal:</strong> ₹${(booking.subtotal || 0).toFixed(2)}</p>
          <p><strong>Tax (${booking.taxSlab}%):</strong> ₹${(booking.taxAmount || 0).toFixed(2)}</p>
          <hr style="border: 1px solid #ddd;" />
          <h3 style="color: #3f3f91;">Grand Total: ₹${(booking.grandTotal || 0).toFixed(2)}</h3>
        </div>
        
        <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h3 style="color: #3f3f91; margin: 0 0 10px 0;">Payment Details</h3>
          <p><strong>Status:</strong> ${booking.paymentStatus}</p>
          ${booking.amountPaid > 0 ? `<p><strong>Amount Paid:</strong> ₹${(booking.amountPaid || 0).toFixed(2)}</p>` : ''}
          ${booking.balanceAmount > 0 ? `<p><strong>Remaining Amount:</strong> ₹${(booking.balanceAmount || 0).toFixed(2)}</p>` : ''}
          ${paymentDetailsHtml}
        </div>
        
        ${booking.notes ? `
          <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
            <h3 style="color: #3f3f91; margin: 0 0 10px 0;">Notes</h3>
            <p>${booking.notes}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #3f3f91; color: #666;">
          <p>Booking Status: <strong>${booking.status}</strong></p>
          <p style="font-size: 12px;">Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

        const opt = {
            margin: 10,
            filename: `Booking_${booking.bookingNumber}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        };

        html2pdf().from(content).set(opt).save();
    };

    // ============================================
    // INITIAL VALUES FOR FORM
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
        notes: ""
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
    // MAIN RENDER
    // ============================================
    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="bk-main">
                <AddCustomerModal
                    show={showAddCustomerModal}
                    onClose={handleCloseAddCustomerModal}
                    onSave={handleAddCustomer}
                    isSubmitting={isAddingCustomer}
                />

                <div className="bk-page-header">
                    <div className="bk-right-section">
                        <div className="bk-search-container">
                            <FaSearch className="bk-search-icon" />
                            <input
                                type="text"
                                placeholder="Search by Guest, Phone, Booking #..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="bk-filters-group">
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="Confirmed">Confirmed</option>
                                <option value="">All Status</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Checked-in">Checked-in</option>
                            </select>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                        <div className="bk-action-buttons-group">
                            <button className="bk-add-btn" onClick={() => setShowForm(!showForm)}>
                                <FaPlus /> {showForm ? "Close" : "New Booking"}
                            </button>
                        </div>
                    </div>
                </div>

                {showForm && (
                    <div className="bk-form-container bk-premium">
                        <h2>New Advance Booking</h2>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleCreateBooking}
                        >
                            {({ values, setFieldValue, handleChange }) => {
                                formikRef.current = { values, setFieldValue, handleChange };

                                const extrasTotal = (values.extraRequirements || []).reduce(
                                    (sum, req) => sum + (parseFloat(req.price) || 0), 0
                                );
                                const roomSubtotal = calculatedPrice?.total || 0;
                                const subtotal = roomSubtotal + extrasTotal;
                                const taxSlabValue = parseInt(values.taxSlab) || 18;
                                const taxAmount = (subtotal * taxSlabValue) / 100;
                                const grandTotal = subtotal + taxAmount;

                                const usedMethods = values.paymentDetails.map(p => p.method);
                                const availableMethods = PAYMENT_METHODS.filter(m => !usedMethods.includes(m));

                                return (
                                    <Form>
                                        {/* ===== CUSTOMER SELECTION ===== */}
                                        <div className="bk-form-row">
                                            <div className="bk-form-field">
                                                <label><FaUser /> Select Customer *</label>
                                                <div className="bk-customer-search-wrap">
                                                    <div className="bk-customer-search-row">
                                                        <input
                                                            type="text"
                                                            value={customerSearch}
                                                            onChange={(e) => handleCustomerSearch(e.target.value)}
                                                            placeholder="Search customer by name or phone..."
                                                            className="bk-customer-search-input"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="bk-add-customer-btn"
                                                            onClick={handleOpenAddCustomerModal}
                                                            title="Add New Customer"
                                                        >
                                                            <FaUserPlus /> Add Customer
                                                        </button>
                                                    </div>
                                                    {showCustomerDropdown && !showCreateCustomer && (
                                                        <div className="bk-dropdown-list">
                                                            {customers.length > 0 ? (
                                                                <>
                                                                    {customers.map(customer => (
                                                                        <div
                                                                            key={customer.customerId}
                                                                            className="bk-dropdown-item"
                                                                            onClick={() => handleSelectCustomer(customer)}
                                                                        >
                                                                            <strong>{customer.customerName}</strong>
                                                                            <span className="bk-dropdown-item-sub">
                                                                                {customer.contactNumber} {customer.email ? `- ${customer.email}` : ''}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                    <div
                                                                        className="bk-dropdown-item bk-create-new-option"
                                                                        onClick={handleShowCreateCustomer}
                                                                    >
                                                                        <FaPlus /> Create New Customer
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div
                                                                    className="bk-dropdown-item bk-create-new-option bk-dropdown-item-center"
                                                                    onClick={handleShowCreateCustomer}
                                                                >
                                                                    <FaPlus /> No customer found. Create New?
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {selectedCustomer && (
                                                    <div className="bk-selected-customer">
                                                        <FaCheck className="bk-selected-customer-icon" />
                                                        {selectedCustomer.customerName} ({selectedCustomer.contactNumber})
                                                        <button
                                                            type="button"
                                                            className="bk-remove-btn"
                                                            onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                )}

                                                {showCreateCustomer && (
                                                    <div className="bk-inline-customer-create">
                                                        <h4><FaPlusCircle /> Create New Customer</h4>
                                                        <div className="bk-inline-customer-grid">
                                                            <div className="bk-inline-customer-field">
                                                                <label>Customer Name *</label>
                                                                <input
                                                                    type="text"
                                                                    value={newCustomerData.customerName}
                                                                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, customerName: e.target.value }))}
                                                                    placeholder="Enter full name"
                                                                />
                                                            </div>
                                                            <div className="bk-inline-customer-field">
                                                                <label>Phone Number *</label>
                                                                <input
                                                                    type="text"
                                                                    value={newCustomerData.contactNumber}
                                                                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, contactNumber: e.target.value }))}
                                                                    placeholder="Enter 10 digit number"
                                                                />
                                                            </div>
                                                            <div className="bk-inline-customer-field bk-inline-customer-field-full">
                                                                <label>Email (Optional)</label>
                                                                <input
                                                                    type="email"
                                                                    value={newCustomerData.email}
                                                                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                                                                    placeholder="Enter email address"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="bk-inline-customer-actions">
                                                            <button
                                                                type="button"
                                                                className="bk-create-customer-submit"
                                                                onClick={createCustomerInline}
                                                                disabled={isCreatingCustomer}
                                                            >
                                                                {isCreatingCustomer ? 'Creating...' : <><FaCheck /> Create & Select</>}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="bk-cancel-create-customer"
                                                                onClick={handleCancelCreateCustomer}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <small className="bk-field-hint">
                                                    Type to search existing customer or click "Add Customer" to create new
                                                </small>
                                            </div>
                                        </div>

                                        {/* ===== PER NIGHT CHECKBOX ===== */}
                                        <div className="bk-form-row">
                                            <div className="bk-form-field">
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={bookingType === 'perNight'}
                                                        onChange={(e) => handleBookingTypeChange(e.target.checked, setFieldValue)}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                    />
                                                    <FaMoon style={{ color: '#6c5ce7' }} />
                                                    <span style={{ fontWeight: '500' }}>Per Night Booking</span>
                                                    <small style={{ color: '#666', marginLeft: '8px', fontWeight: 'normal' }}>
                                                        (No duration logic - uses perNight price from category)
                                                    </small>
                                                </label>
                                                {bookingType === 'perNight' && (
                                                    <small className="bk-field-hint" style={{ color: '#6c5ce7' }}>
                                                        🌙 Auto-set to next day 10:00 AM for Night Stay
                                                    </small>
                                                )}
                                            </div>
                                        </div>

                                        {/* ===== DATES ===== */}
                                        <div className="bk-form-row">
                                            <div className="bk-form-field">
                                                <label><FaCalendarAlt /> Check-in Date & Time *</label>
                                                <Field
                                                    name="checkInDate"
                                                    type="datetime-local"
                                                    onChange={(e) => {
                                                        handleChange(e);

                                                        // ✅ AUTO-FILL CHECKOUT FOR PER NIGHT WHEN CHECK-IN CHANGES
                                                        if (bookingType === 'perNight' && e.target.value) {
                                                            const checkIn = new Date(e.target.value);
                                                            const checkOut = new Date(checkIn);
                                                            checkOut.setDate(checkOut.getDate() + 1); // Next day
                                                            checkOut.setHours(10, 0, 0, 0); // LOCAL 10:00 AM

                                                            const pad = (n) => String(n).padStart(2, '0');
                                                            const checkOutString = `${checkOut.getFullYear()}-${pad(checkOut.getMonth() + 1)}-${pad(checkOut.getDate())}T10:00`;

                                                            setFieldValue('checkOutDate', checkOutString);

                                                            // ✅ fetch rooms directly with new checkout, don't wait for stale values.checkOutDate
                                                            fetchAvailableRooms(e.target.value, checkOutString);
                                                        } else if (values.checkOutDate) {
                                                            handleDateChange(setFieldValue, e.target.value, values.checkOutDate);
                                                        }
                                                    }}
                                                />
                                                <ErrorMessage name="checkInDate" component="div" className="bk-error" />
                                            </div>
                                            <div className="bk-form-field">
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
                                                <ErrorMessage name="checkOutDate" component="div" className="bk-error" />
                                            </div>
                                        </div>



                                        {/* ===== ROOM SELECTION ===== */}
                                        <div className="bk-form-row">
                                            <div className="bk-form-field">
                                                <label><FaDoorOpen /> Select Rooms *</label>
                                                {isLoadingRooms ? (
                                                    <div className="bk-rooms-loading-text">Loading available rooms...</div>
                                                ) : availableRooms.length === 0 ? (
                                                    <div className="bk-no-rooms-warning-box">
                                                        No rooms available for selected dates
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="bk-room-grid">
                                                            {availableRooms.map(room => (
                                                                <div
                                                                    key={room.roomId}
                                                                    className={`bk-room-checkbox ${selectedRooms.includes(room.roomId) ? 'bk-selected' : ''}`}
                                                                    onClick={() => handleRoomSelection(room.roomId)}
                                                                >
                                                                    <label>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedRooms.includes(room.roomId)}
                                                                            onChange={() => { }}
                                                                        />
                                                                        <div className="bk-room-info">
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
                                                            <div className="bk-price-preview">
                                                                <h4><FaCalculator /> Price Calculation</h4>
                                                                <div className="bk-price-preview-list">
                                                                    {editableRoomPrices.map((item, idx) => (
                                                                        <div key={idx} className="bk-price-preview-item bk-editable-price-item">
                                                                            <div className="bk-price-preview-room-info">
                                                                                <span>Room {item.roomNumber} ({item.label})</span>
                                                                                <span className="bk-room-category-tag">{item.categoryName}</span>
                                                                            </div>
                                                                            <div className="bk-price-preview-input-group">
                                                                                <span className="bk-currency-symbol">₹</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="bk-price-edit-input"
                                                                                    value={item.price || 0}
                                                                                    onChange={(e) => handleRoomPriceChange(idx, e.target.value)}
                                                                                    min="0"
                                                                                    step="1"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                    <hr className="bk-price-preview-divider" />
                                                                    <div className="bk-price-preview-total">
                                                                        <span>Total Base Price</span>
                                                                        <span className="bk-price-preview-total-value">₹{calculatedPrice.total.toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                                <small className="bk-field-hint">
                                                                    * You can edit each room's price above. Tax will be added based on selected slab.
                                                                </small>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {selectedRooms.length > 0 && (
                                                    <div className="bk-selected-rooms-summary">
                                                        <strong>Selected: {selectedRooms.length} room(s)</strong>
                                                        <div className="bk-selected-rooms-list">
                                                            {availableRooms
                                                                .filter(r => selectedRooms.includes(r.roomId))
                                                                .map(r => r.roomNumber)
                                                                .join(', ')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ===== EXTRA REQUIREMENTS + TAX SLAB ===== */}
                                        <div className="bk-form-row">
                                            <div className="bk-form-field">
                                                <label>Extra Requirements</label>
                                                <FieldArray name="extraRequirements">
                                                    {({ push, remove, form }) => (
                                                        <div>
                                                            {form.values.extraRequirements.map((req, index) => (
                                                                <div key={index} className="bk-extra-req-row">
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
                                                            <button type="button" className="bk-add-req-btn" onClick={() => push({ description: '', price: 0 })}>
                                                                <FaPlus /> Add Requirement
                                                            </button>
                                                        </div>
                                                    )}
                                                </FieldArray>
                                            </div>

                                            <div className="bk-form-field">
                                                <label><FaTag /> Tax Slab *</label>
                                                <Field as="select" name="taxSlab">
                                                    <option value="5">5%</option>
                                                    <option value="10">10%</option>
                                                    <option value="18">18%</option>
                                                </Field>
                                                <ErrorMessage name="taxSlab" component="div" className="bk-error" />
                                            </div>
                                        </div>

                                        {/* ===== PAYMENT STATUS + PAYMENT DETAILS ===== */}
                                        <div className="bk-form-row">
                                            <div className="bk-form-field">
                                                <label><FaMoneyBillWave /> Payment Status *</label>
                                                <Field as="select" name="paymentStatus">
                                                    <option value="Not Paid">Not Paid</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Partial Paid">Partial Paid</option>
                                                </Field>
                                                <ErrorMessage name="paymentStatus" component="div" className="bk-error" />

                                                {values.paymentStatus === 'Partial Paid' && (
                                                    <div className="bk-inline-amount-paid">
                                                        <label><FaMoneyBillWave /> Amount Paid</label>
                                                        <Field
                                                            name="amountPaid"
                                                            type="number"
                                                            min="0"
                                                            max={grandTotal}
                                                        />
                                                        <small className="bk-field-hint">
                                                            Max: ₹{grandTotal.toFixed(2)}
                                                        </small>
                                                        <ErrorMessage name="amountPaid" component="div" className="bk-error" />
                                                    </div>
                                                )}
                                            </div>

                                            {values.paymentStatus !== 'Not Paid' && (
                                                <div className="bk-form-field">
                                                    <label><FaCreditCard /> Payment Details</label>
                                                    <FieldArray name="paymentDetails">
                                                        {({ push, remove, form }) => (
                                                            <div className="bk-payment-details-edit">
                                                                {form.values.paymentDetails.map((payment, index) => {
                                                                    const usedMethods = form.values.paymentDetails
                                                                        .filter((_, idx) => idx !== index)
                                                                        .map(p => p.method);
                                                                    const availableForThis = PAYMENT_METHODS.filter(m => !usedMethods.includes(m));
                                                                    const options = [payment.method, ...availableForThis.filter(m => m !== payment.method)];

                                                                    return (
                                                                        <div key={index} className="bk-payment-row">
                                                                            <select
                                                                                className="bk-edit-input bk-payment-method-select"
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
                                                                                className="bk-edit-input bk-payment-amount-input"
                                                                                placeholder="Amount"
                                                                                value={payment.amount || 0}
                                                                                onChange={(e) => {
                                                                                    const val = parseFloat(e.target.value) || 0;
                                                                                    if (val > grandTotal) {
                                                                                        toast.warning(`Amount cannot exceed Grand Total (₹${grandTotal.toFixed(2)})`);
                                                                                        return;
                                                                                    }
                                                                                    const newPayments = [...form.values.paymentDetails];
                                                                                    newPayments[index].amount = val;
                                                                                    form.setFieldValue('paymentDetails', newPayments);
                                                                                }}
                                                                                min="0"
                                                                                max={grandTotal}
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                className="bk-remove-payment-btn"
                                                                                onClick={() => remove(index)}
                                                                                disabled={form.values.paymentDetails.length <= 1}
                                                                            >
                                                                                <FaTimes />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <div className="bk-payment-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="bk-add-payment-btn"
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
                                                                        <small className="bk-field-hint">All payment methods are already added</small>
                                                                    )}
                                                                </div>
                                                                {form.values.paymentDetails.length > 0 && (
                                                                    <small className="bk-field-hint">
                                                                        Total: ₹{form.values.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                                                                        {' | '}Type: {new Set(form.values.paymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : (form.values.paymentDetails[0]?.method || 'Cash')}
                                                                        {form.values.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0) > grandTotal && (
                                                                            <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                                                                                ⚠️ Exceeds Grand Total!
                                                                            </span>
                                                                        )}
                                                                    </small>
                                                                )}
                                                            </div>
                                                        )}
                                                    </FieldArray>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bk-form-row">
                                            <div className="bk-form-field">
                                                <label>Notes (Optional)</label>
                                                <Field name="notes" as="textarea" rows="3" />
                                                <ErrorMessage name="notes" component="div" className="bk-error" />
                                            </div>
                                        </div>

                                        {/* ===== FINAL PRICE CALCULATION ===== */}
                                        {selectedRooms.length > 0 && calculatedPrice && values.taxSlab && (() => {
                                            const roomSubtotal = calculatedPrice.total || 0;
                                            const subtotal = roomSubtotal + extrasTotal;
                                            const taxSlabValue = parseInt(values.taxSlab) || 18;
                                            const taxAmount = (subtotal * taxSlabValue) / 100;
                                            const grandTotalCalc = subtotal + taxAmount;
                                            const amountPaidValue = parseFloat(values.amountPaid) || 0;
                                            const remainingAmount = Math.max(0, grandTotalCalc - amountPaidValue);

                                            const paymentDetailsTotal = (values.paymentDetails || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                                            const paymentType = values.paymentDetails && values.paymentDetails.length > 0
                                                ? (new Set(values.paymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : values.paymentDetails[0].method)
                                                : 'Cash';

                                            const paymentExceeds = paymentDetailsTotal > grandTotalCalc;

                                            return (
                                                <div className="bk-form-row">
                                                    <div className="bk-form-field bk-form-field-full">
                                                        <div className="bk-final-price-calculation">
                                                            <h4><FaCalculator /> Final Price Breakdown</h4>
                                                            <div className="bk-final-price-grid">
                                                                <span>Booking Type:</span>
                                                                <span className="bk-final-price-val">
                                                                    <strong>{bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}</strong>
                                                                </span>

                                                                <span>Base Price:</span>
                                                                <span className="bk-final-price-val">₹{roomSubtotal.toFixed(2)}</span>

                                                                {extrasTotal > 0 && (
                                                                    <>
                                                                        <span>Extra Requirements:</span>
                                                                        <span className="bk-final-price-val">₹{extrasTotal.toFixed(2)}</span>
                                                                    </>
                                                                )}

                                                                <span>Subtotal:</span>
                                                                <span className="bk-final-price-val">₹{subtotal.toFixed(2)}</span>

                                                                <span>Tax ({taxSlabValue}%):</span>
                                                                <span className="bk-final-price-val">₹{taxAmount.toFixed(2)}</span>

                                                                <hr className="bk-final-price-divider" />

                                                                <span className="bk-final-price-grand-label">
                                                                    <strong>Grand Total:</strong>
                                                                </span>
                                                                <span className="bk-final-price-val bk-final-price-grand-value">
                                                                    ₹{grandTotalCalc.toFixed(2)}
                                                                </span>

                                                                <hr className="bk-final-price-divider" />

                                                                <span>Amount Paid:</span>
                                                                <span className="bk-final-price-val">₹{amountPaidValue.toFixed(2)}</span>

                                                                <span className="bk-final-price-grand-label">
                                                                    <strong>Remaining Amount:</strong>
                                                                </span>
                                                                <span className={`bk-final-price-val bk-final-price-grand-value ${remainingAmount > 0 ? 'bk-balance-due' : 'bk-balance-clear'}`}>
                                                                    ₹{remainingAmount.toFixed(2)}
                                                                </span>

                                                                {values.paymentStatus !== 'Not Paid' && values.paymentDetails && values.paymentDetails.length > 0 && (
                                                                    <>
                                                                        <hr className="bk-final-price-divider" />
                                                                        <span className="bk-final-price-grand-label">
                                                                            <strong>Payment Type:</strong>
                                                                        </span>
                                                                        <span className="bk-final-price-val">
                                                                            <strong>{paymentType}</strong>
                                                                        </span>
                                                                        <span className="bk-final-price-grand-label">
                                                                            <strong>Payment Details Total:</strong>
                                                                        </span>
                                                                        <span className={`bk-final-price-val ${paymentExceeds ? 'bk-balance-due' : ''}`}>
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
                                                    <div className="bk-loading-spinner small"></div>
                                                    Creating...
                                                </>
                                            ) : (
                                                `Confirm ${bookingType === 'perNight' ? 'Night Stay' : 'Booking'} (${selectedRooms.length} room${selectedRooms.length > 1 ? 's' : ''})`
                                            )}
                                        </button>
                                    </Form>
                                );
                            }}
                        </Formik>
                    </div>
                )}

                {/* ===== BOOKINGS TABLE ===== */}
                <div className="bk-data-table">
                    {isLoading ? (
                        <div className="bk-loading-container">
                            <div className="bk-loading-spinner large"></div>
                            <p>Loading bookings...</p>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="bk-empty-state">
                            <p>No bookings found</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Booking #</th>
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
                                {bookings.map((booking, index) => {
                                    const key = booking.bookingId || booking.bookingNumber || index;
                                    const isPDFLoading = pdfLoadingStates[key] || false;
                                    const isWhatsAppLoading = whatsappLoadingStates[key] || false;
                                    const isPrintWhatsAppLoading = printWhatsappLoadingStates[key] || false;

                                    return (
                                        <tr
                                            key={key}
                                            className={selectedBooking === booking.bookingId ? "bk-selected" : ""}
                                            onClick={() => setSelectedBooking(booking.bookingId)}
                                        >
                                            <td>{booking.bookingNumber}</td>
                                            <td>
                                                <span className={`bk-booking-type-badge ${booking.bookingType === 'perNight' ? 'bk-pernight-badge' : 'bk-simple-badge'}`}>
                                                    {booking.bookingType === 'perNight' ? '🌙 Night' : 'Simple'}
                                                </span>
                                            </td>
                                            <td>{booking.customerName}</td>
                                            <td>
                                                {booking.roomDetails?.map(r => r.roomNumber).join(', ') || booking.roomNumber}
                                            </td>
                                            <td>{new Date(booking.checkInDate).toLocaleDateString()}</td>
                                            <td>{new Date(booking.checkOutDate).toLocaleDateString()}</td>
                                            <td>{booking.durationLabel}</td>
                                            <td>₹{(booking.grandTotal || 0).toFixed(2)}</td>
                                            <td>
                                                <span className={`bk-status-badge bk-status-${booking.status?.toLowerCase()}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`bk-status-badge bk-status-${booking.paymentStatus?.toLowerCase().replace(' ', '')}`}>
                                                    {booking.paymentStatus}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="bk-action-buttons">
                                                    <button
                                                        className="bk-action-btn bk-whatsapp-btn-sm"
                                                        onClick={() => sendWhatsAppMessage(booking)}
                                                        disabled={isWhatsAppLoading || isPrintWhatsAppLoading}
                                                        title="Send WhatsApp"
                                                    >
                                                        {isWhatsAppLoading ? (
                                                            <div className="bk-loading-spinner small"></div>
                                                        ) : (
                                                            <FaWhatsapp />
                                                        )}
                                                    </button>
                                                    <button
                                                        className="bk-action-btn bk-pdf-btn-sm"
                                                        onClick={() => generatePDF(booking)}
                                                        disabled={isPDFLoading || isPrintWhatsAppLoading}
                                                        title="Download PDF"
                                                    >
                                                        {isPDFLoading ? (
                                                            <div className="bk-loading-spinner small"></div>
                                                        ) : (
                                                            <FaFilePdf />
                                                        )}
                                                    </button>
                                                    <button
                                                        className="bk-action-btn bk-view-btn-sm"
                                                        onClick={() => setSelectedBooking(booking.bookingId)}
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ===== PARENT MODAL ===== */}
                {selectedBooking && (
                    <BookingModal
                        booking={bookings.find(b => b.bookingId === selectedBooking)}
                        onClose={() => setSelectedBooking(null)}
                        onUpdate={handleUpdateBooking}
                        onDelete={handleDeleteBooking}
                        onCancel={(booking) => {
                            setCancelBookingData(booking);
                            setShowCancelModal(true);
                            setSelectedBooking(null);
                        }}
                        onConvert={(booking) => {
                            setConvertBooking(booking);
                            setShowConvertModal(true);
                            setSelectedBooking(null);
                        }}
                        onDownload={downloadReceipt}
                        onAddRoom={handleOpenAddRoom}
                        onRemoveRoom={handleOpenRemoveRoom}
                        onChangeRoom={handleOpenChangeRoom}
                        sendWhatsAppMessage={sendWhatsAppMessage}
                        generatePDF={generatePDF}
                        handlePrintAndWhatsApp={handlePrintAndWhatsApp}
                        isPDFGenerating={pdfLoadingStates[selectedBooking] || false}
                        isWhatsAppSending={whatsappLoadingStates[selectedBooking] || false}
                        isPrintAndWhatsAppProcessing={printWhatsappLoadingStates[selectedBooking] || false}
                        isUpdating={isUpdatingBooking}
                    />
                )}

                {/* ===== CHILD MODALS ===== */}
                {showAddRoomModal && addRoomData && (
                    <AddRoomModal
                        booking={addRoomData}
                        onClose={() => { setShowAddRoomModal(false); setAddRoomData(null); }}
                        onConfirm={handleAddRoom}
                        isSubmitting={isFormSubmitting}
                        fetchAvailableRoomsForBookingId={fetchAvailableRoomsForBookingId}
                    />
                )}

                {showRemoveRoomModal && removeRoomData && (
                    <RemoveRoomModal
                        booking={removeRoomData}
                        onClose={() => { setShowRemoveRoomModal(false); setRemoveRoomData(null); }}
                        onConfirm={handleRemoveRoom}
                        isSubmitting={isFormSubmitting}
                    />
                )}

                {showChangeRoomModal && changeRoomData && (
                    <ChangeRoomModal
                        booking={changeRoomData}
                        onClose={() => { setShowChangeRoomModal(false); setChangeRoomData(null); }}
                        onConfirm={handleChangeRoom}
                        isSubmitting={isFormSubmitting}
                        fetchAvailableRoomsForBookingId={fetchAvailableRoomsForBookingId}
                    />
                )}

                {/* ===== OTHER MODALS ===== */}
                {showCancelModal && cancelBookingData && (
                    <CancelModal
                        booking={cancelBookingData}
                        onClose={() => {
                            setShowCancelModal(false);
                            setCancelBookingData(null);
                            setCancelReason('');
                            setCancelRefundAmount(0);
                        }}
                        onConfirm={async (reason, refundAmount) => {
                            setCancelReason(reason);
                            setCancelRefundAmount(refundAmount);
                            await handleCancelBooking();
                        }}
                        isLoading={isFormSubmitting}
                    />
                )}

                {showConvertModal && convertBooking && (
                    <ConvertModal
                        booking={convertBooking}
                        onClose={() => { setShowConvertModal(false); setConvertBooking(null); }}
                        onConfirm={() => handleConvertToCheckin(convertBooking)}
                        isLoading={isConverting}
                    />
                )}

                {/* Hidden PDF component */}
                <div className="bk-hidden-pdf-print">
                    {bookingForPrint && <BookingPrint booking={bookingForPrint} />}
                </div>
            </div>
        </Navbar>
    );
};

export default Booking;