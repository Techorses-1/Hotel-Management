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
    FaPercent, FaGift, FaReceipt, FaWhatsapp, FaFilePdf, FaChevronLeft, FaChevronRight, FaFileExcel,
    FaHistory, FaExchangeAlt, FaUniversity, FaBuilding, FaMoon
} from "react-icons/fa";
import html2pdf from "html2pdf.js";
import * as XLSX from 'xlsx';
import Navbar from "../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./CheckOut.scss";
import CheckOutPrint from "./CheckOutPrint";
import { createPortal } from "react-dom";

// ============================================
// MODULE-LEVEL CONSTANTS
// ============================================
const idProofLabels = ['Aadhar Card', 'Passport', 'Driving License', 'Voter ID', 'PAN Card', 'Other'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank', 'Cheque'];

// ============================================
// CHECK-OUT MODAL COMPONENT - UPDATED WITH BOOKING TYPE
// ============================================
const CheckOutModal = ({
    checkOut,
    onClose,
    onUpdate,
    onDelete,
    onSendWhatsApp,
    onGeneratePDF,
    onPrintAndWhatsApp,
    onPrint,
    isPDFGenerating,
    isWhatsAppSending,
    isPrintAndWhatsAppProcessing,
    isPrinting
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedCheckOut, setEditedCheckOut] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editExtraCharges, setEditExtraCharges] = useState([]);
    const [editExtraRequirements, setEditExtraRequirements] = useState([]);
    const [editIdProofs, setEditIdProofs] = useState([]);
    const [editPaymentDetails, setEditPaymentDetails] = useState([]);
    const [newProofLabel, setNewProofLabel] = useState('Other');
    const [newProofFile, setNewProofFile] = useState(null);
    const [editRoomDetails, setEditRoomDetails] = useState([]);
    const [paymentValidationError, setPaymentValidationError] = useState('');
    const [bookingType, setBookingType] = useState('simple');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => document.body.style.overflow = 'auto';
    }, []);

    useEffect(() => {
        if (checkOut) {
            setEditedCheckOut({ ...checkOut });
            setEditExtraCharges(checkOut.extraCharges || []);
            setEditExtraRequirements(checkOut.extraRequirements || []);
            setEditIdProofs(checkOut.idProofs || []);
            setEditPaymentDetails(checkOut.paymentDetails || []);
            setEditRoomDetails(checkOut.roomDetails || []);
            setBookingType(checkOut.bookingType || 'simple');
            setPaymentValidationError('');
        }
    }, [checkOut]);

    if (!checkOut) return null;

    const handleSaveEdit = async () => {
        // Validate payment details don't exceed final total
        const finalTotal = editedCheckOut.finalTotal || 0;
        const paymentTotal = editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
        if (editPaymentDetails.length > 0 && paymentTotal > finalTotal) {
            toast.error(`Total payment (₹${paymentTotal.toFixed(2)}) cannot exceed Final Total (₹${finalTotal.toFixed(2)})`);
            return;
        }

        if (editedCheckOut.paymentStatus === 'Partial Paid') {
            const amountPaid = parseFloat(editedCheckOut.amountPaid) || 0;
            if (amountPaid > finalTotal) {
                toast.error(`Amount paid (₹${amountPaid.toFixed(2)}) cannot exceed Final Total (₹${finalTotal.toFixed(2)})`);
                return;
            }
        }

        const updateData = {
            ...editedCheckOut,
            extraCharges: editExtraCharges,
            extraRequirements: editExtraRequirements,
            idProofs: editIdProofs,
            roomDetails: editRoomDetails,
            paymentDetails: editPaymentDetails,
            bookingType: bookingType
        };
        await onUpdate(checkOut.checkOutId, updateData);
        setIsEditing(false);
        onClose();
    };

    const handleRoomPriceChange = (index, newPrice) => {
        const updated = [...editRoomDetails];
        updated[index].price = parseFloat(newPrice) || 0;
        setEditRoomDetails(updated);
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
        if (!checkOut.paymentDetails || checkOut.paymentDetails.length === 0) {
            return <span className="ckout-detail-value">No payment details</span>;
        }

        return (
            <div className="ckout-payment-details-list">
                {checkOut.paymentDetails.map((payment, idx) => (
                    <div key={idx} className="ckout-payment-detail-item">
                        <span className="ckout-payment-method">{payment.method}:</span>
                        <span className="ckout-payment-amount">₹{payment.amount.toFixed(2)}</span>
                        {payment.reference && <span className="ckout-payment-ref">({payment.reference})</span>}
                    </div>
                ))}
                <div className="ckout-payment-total">
                    <strong>Payment Type:</strong> {checkOut.paymentType || 'Cash'}
                </div>
            </div>
        );
    };

    const renderPriceBreakdown = (data) => {
        if (!data) return null;

        const activeRooms = data.roomDetails?.filter(r => !r.isRemoved) || [];
        const removedRooms = data.roomDetails?.filter(r => r.isRemoved) || [];

        return (
            <div className="ckout-price-breakdown-box">
                <h4><FaCalculator /> Price Breakdown</h4>
                <div className="ckout-price-breakdown-grid">
                    <div className="ckout-price-section-label"><strong>Booking Type:</strong></div>
                    <div className="ckout-price-line">
                        <span className="ckout-price-val">{data.bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}</span>
                    </div>

                    <div className="ckout-price-section-label"><strong>Active Rooms:</strong></div>
                    {activeRooms.map((room, idx) => (
                        <div className="ckout-price-line" key={`active-${idx}`}>
                            <span className="ckout-room-price-label">Room {room.roomNumber} ({room.categoryName})</span>
                            <span className="ckout-price-val">₹{(room.price || 0).toFixed(2)}</span>
                        </div>
                    ))}

                    {activeRooms.length > 0 && (
                        <div className="ckout-price-line ckout-price-total-line">
                            <span className="ckout-price-total-label">Active Rooms Total:</span>
                            <span className="ckout-price-val ckout-price-total">
                                ₹{activeRooms.reduce((sum, r) => sum + (r.price || 0), 0).toFixed(2)}
                            </span>
                        </div>
                    )}

                    {removedRooms.length > 0 && (
                        <>
                            <div className="ckout-price-section-label ckout-removed-label"><strong>Removed Rooms:</strong></div>
                            {removedRooms.map((room, idx) => (
                                <div className="ckout-price-line" key={`removed-${idx}`}>
                                    <span className="ckout-room-price-label ckout-removed-text">
                                        Room {room.roomNumber} ({room.categoryName}) - <span className="ckout-removed-badge">Removed</span>
                                    </span>
                                    <span className="ckout-price-val">₹{(room.price || 0).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="ckout-price-line ckout-price-total-line">
                                <span className="ckout-price-total-label ckout-removed-text">Removed Rooms Total:</span>
                                <span className="ckout-price-val ckout-removed-text">
                                    ₹{removedRooms.reduce((sum, r) => sum + (r.price || 0), 0).toFixed(2)}
                                </span>
                            </div>
                        </>
                    )}

                    {data.extraHoursPrice > 0 && (
                        <div className="ckout-price-line">
                            <span>Extra Hours:</span>
                            <span className="ckout-price-val">₹{(data.extraHoursPrice || 0).toFixed(2)}</span>
                        </div>
                    )}

                    {data.extraRequirementsTotal > 0 && (
                        <div className="ckout-price-line">
                            <span>Extra Requirements:</span>
                            <span className="ckout-price-val">₹{(data.extraRequirementsTotal || 0).toFixed(2)}</span>
                        </div>
                    )}

                    {data.extraChargesTotal > 0 && (
                        <div className="ckout-price-line">
                            <span>Extra Charges:</span>
                            <span className="ckout-price-val">₹{(data.extraChargesTotal || 0).toFixed(2)}</span>
                        </div>
                    )}

                    <hr className="ckout-price-divider" />

                    <div className="ckout-price-line">
                        <span><strong>Subtotal:</strong></span>
                        <span className="ckout-price-val"><strong>₹{(data.subtotal || 0).toFixed(2)}</strong></span>
                    </div>

                    {data.discountAmount > 0 && (
                        <div className="ckout-price-line">
                            <span>Discount:</span>
                            <span className="ckout-price-val ckout-price-discount">-₹{(data.discountAmount || 0).toFixed(2)}</span>
                        </div>
                    )}

                    {data.discountAmount > 0 && (
                        <div className="ckout-price-line">
                            <span><strong>After Discount:</strong></span>
                            <span className="ckout-price-val"><strong>₹{((data.subtotal || 0) - (data.discountAmount || 0)).toFixed(2)}</strong></span>
                        </div>
                    )}

                    <div className="ckout-price-line">
                        <span>Tax ({data.taxSlab || 18}%):</span>
                        <span className="ckout-price-val">₹{(data.taxAmount || 0).toFixed(2)}</span>
                    </div>

                    <hr className="ckout-price-divider ckout-price-divider-thick" />

                    <div className="ckout-price-line">
                        <span className="ckout-price-grand-label"><strong>Final Total:</strong></span>
                        <span className="ckout-price-val ckout-price-grand-value">
                            ₹{(data.finalTotal || 0).toFixed(2)}
                        </span>
                    </div>

                    <hr className="ckout-price-divider" />

                    <div className="ckout-price-line">
                        <span>Amount Paid:</span>
                        <span className="ckout-price-val">₹{(data.amountPaid || 0).toFixed(2)}</span>
                    </div>

                    <div className="ckout-price-line">
                        <span className="ckout-price-grand-label"><strong>Balance:</strong></span>
                        <span className={`ckout-price-val ckout-price-grand-value ${data.balanceAmount > 0 ? 'ckout-balance-due' : 'ckout-balance-clear'}`}>
                            ₹{(data.balanceAmount || 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="ckout-modal-overlay" onClick={onClose}>
            <div className="ckout-modal-content ckout-modal-lg" onClick={e => e.stopPropagation()}>
                <div className="ckout-modal-header">
                    <div className="ckout-modal-title">
                        {isEditing ? "Edit Check-out" : `Check-out: ${checkOut.checkOutNumber}`}
                        {!isEditing && checkOut.bookingType === 'perNight' && (
                            <span className="ckout-booking-type-badge ckout-pernight-badge">🌙 Night Stay</span>
                        )}
                    </div>
                    <button className="ckout-modal-close" onClick={onClose}><FaTimes /></button>
                </div>
                <div className="ckout-modal-body">
                    {isEditing ? (
                        <div className="ckout-details-grid">
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Booking Type</span>
                                <span className="ckout-detail-value">
                                    <span className="ckout-booking-type-badge ckout-pernight-badge">
                                        {bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}
                                    </span>
                                    <small className="ckout-field-hint" style={{ display: 'block', marginTop: '4px' }}>
                                        Booking type cannot be changed
                                    </small>
                                </span>
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Guest Name</span>
                                <input
                                    type="text"
                                    className="ckout-edit-input"
                                    value={editedCheckOut.customerName || ''}
                                    onChange={(e) => setEditedCheckOut(prev => ({ ...prev, customerName: e.target.value }))}
                                />
                            </div>
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Phone</span>
                                <input
                                    type="text"
                                    className="ckout-edit-input"
                                    value={editedCheckOut.customerPhone || ''}
                                    onChange={(e) => setEditedCheckOut(prev => ({ ...prev, customerPhone: e.target.value }))}
                                />
                            </div>
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Email</span>
                                <input
                                    type="email"
                                    className="ckout-edit-input"
                                    value={editedCheckOut.customerEmail || ''}
                                    onChange={(e) => setEditedCheckOut(prev => ({ ...prev, customerEmail: e.target.value }))}
                                />
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Rooms & Pricing</span>
                                <div className="ckout-room-pricing-edit">
                                    {editRoomDetails.map((room, index) => (
                                        <div key={index} className="ckout-room-price-row">
                                            <div className="ckout-room-info">
                                                <strong>{room.roomNumber}</strong> ({room.categoryName})
                                                {room.isRemoved && <span className="ckout-removed-badge">Removed</span>}
                                            </div>
                                            <div className="ckout-room-price-input">
                                                <input
                                                    type="number"
                                                    className="ckout-edit-input ckout-price-input"
                                                    value={room.price || 0}
                                                    onChange={(e) => handleRoomPriceChange(index, e.target.value)}
                                                    min="0"
                                                    step="1"
                                                />
                                                <span className="ckout-price-currency">₹</span>
                                            </div>
                                            {room.isRemoved && (
                                                <div className="ckout-removed-info">
                                                    <small>Hours used: {room.hoursUsed || 0}h ({room.durationLabel})</small>
                                                    <br />
                                                    <small>Reason: {room.reason || 'N/A'}</small>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Extra Requirements</span>
                                <div className="ckout-edit-requirements">
                                    {editExtraRequirements.map((req, index) => (
                                        <div key={index} className="ckout-edit-req-row">
                                            <input
                                                type="text"
                                                placeholder="Description"
                                                value={req.description || ''}
                                                onChange={(e) => {
                                                    const updated = [...editExtraRequirements];
                                                    updated[index].description = e.target.value;
                                                    setEditExtraRequirements(updated);
                                                }}
                                                className="ckout-edit-req-desc"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={req.price || 0}
                                                onChange={(e) => {
                                                    const updated = [...editExtraRequirements];
                                                    updated[index].price = parseFloat(e.target.value) || 0;
                                                    setEditExtraRequirements(updated);
                                                }}
                                                className="ckout-edit-req-price"
                                            />
                                            <button type="button" className="ckout-edit-req-remove" onClick={() => {
                                                const updated = [...editExtraRequirements];
                                                updated.splice(index, 1);
                                                setEditExtraRequirements(updated);
                                            }}>
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="ckout-add-req-btn" onClick={() => setEditExtraRequirements([...editExtraRequirements, { description: '', price: 0 }])}>
                                        <FaPlus /> Add Requirement
                                    </button>
                                </div>
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Extra Charges</span>
                                <div className="ckout-edit-requirements">
                                    {editExtraCharges.map((charge, index) => (
                                        <div key={index} className="ckout-edit-req-row">
                                            <input
                                                type="text"
                                                placeholder="Description"
                                                value={charge.description || ''}
                                                onChange={(e) => {
                                                    const updated = [...editExtraCharges];
                                                    updated[index].description = e.target.value;
                                                    setEditExtraCharges(updated);
                                                }}
                                                className="ckout-edit-req-desc"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={charge.price || 0}
                                                onChange={(e) => {
                                                    const updated = [...editExtraCharges];
                                                    updated[index].price = parseFloat(e.target.value) || 0;
                                                    setEditExtraCharges(updated);
                                                }}
                                                className="ckout-edit-req-price"
                                            />
                                            <button type="button" className="ckout-edit-req-remove" onClick={() => {
                                                const updated = [...editExtraCharges];
                                                updated.splice(index, 1);
                                                setEditExtraCharges(updated);
                                            }}>
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="ckout-add-req-btn" onClick={() => setEditExtraCharges([...editExtraCharges, { description: '', price: 0 }])}>
                                        <FaPlus /> Add Charge
                                    </button>
                                </div>
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">ID Proofs</span>
                                <div className="ckout-edit-id-proofs">
                                    {editIdProofs.map((proof, index) => (
                                        <div key={index} className="ckout-edit-proof-row">
                                            <span className="ckout-edit-proof-name">{proof.fileName}</span>
                                            <select
                                                value={proof.label || 'Other'}
                                                onChange={(e) => {
                                                    const updated = [...editIdProofs];
                                                    updated[index].label = e.target.value;
                                                    setEditIdProofs(updated);
                                                }}
                                                className="ckout-edit-proof-select"
                                            >
                                                {idProofLabels.map(label => (
                                                    <option key={label} value={label}>{label}</option>
                                                ))}
                                            </select>
                                            <button type="button" className="ckout-edit-req-remove" onClick={() => {
                                                const updated = [...editIdProofs];
                                                updated.splice(index, 1);
                                                setEditIdProofs(updated);
                                            }}>
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="ckout-edit-proof-add-row">
                                        <input
                                            type="file"
                                            id="edit-proof-input"
                                            accept="image/*"
                                            onChange={(e) => setNewProofFile(e.target.files[0])}
                                            className="ckout-edit-proof-file-input"
                                        />
                                        <select
                                            value={newProofLabel}
                                            onChange={(e) => setNewProofLabel(e.target.value)}
                                            className="ckout-edit-proof-select"
                                        >
                                            {idProofLabels.map(label => (
                                                <option key={label} value={label}>{label}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="ckout-add-proof-btn" onClick={() => {
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
                                        }}>
                                            <FaPlus /> Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Payment Status</span>
                                <select
                                    className="ckout-edit-input"
                                    value={editedCheckOut.paymentStatus || 'Not Paid'}
                                    onChange={(e) => {
                                        const newStatus = e.target.value;
                                        setEditedCheckOut(prev => ({ ...prev, paymentStatus: newStatus }));
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

                            {editedCheckOut.paymentStatus === 'Partial Paid' && (
                                <div className="ckout-detail-row">
                                    <span className="ckout-detail-label">Amount Paid</span>
                                    <input
                                        type="number"
                                        className="ckout-edit-input"
                                        min="0"
                                        max={editedCheckOut.finalTotal || 0}
                                        value={editedCheckOut.amountPaid || 0}
                                        onChange={(e) => {
                                            const newAmount = parseFloat(e.target.value) || 0;
                                            const maxAmount = editedCheckOut.finalTotal || 0;
                                            if (newAmount > maxAmount) {
                                                toast.warning(`Amount cannot exceed Final Total (₹${maxAmount.toFixed(2)})`);
                                                return;
                                            }
                                            setEditedCheckOut(prev => ({ ...prev, amountPaid: newAmount }));
                                        }}
                                    />
                                    <small className="ckout-field-hint">
                                        Max: ₹{(editedCheckOut.finalTotal || 0).toFixed(2)}
                                    </small>
                                </div>
                            )}

                            {/* ===== PAYMENT DETAILS - Only show if NOT "Not Paid" ===== */}
                            {editedCheckOut.paymentStatus !== 'Not Paid' && (
                                <div className="ckout-detail-row">
                                    <span className="ckout-detail-label">Payment Details</span>
                                    <div className="ckout-payment-details-edit">
                                        {editPaymentDetails.map((payment, index) => {
                                            const availableMethods = getAvailablePaymentMethods(index);
                                            const finalTotal = editedCheckOut.finalTotal || 0;
                                            const currentPaymentTotal = editPaymentDetails.reduce((sum, p, idx) =>
                                                idx === index ? sum : sum + (p.amount || 0), 0
                                            );
                                            const maxAmountForThis = Math.max(0, finalTotal - currentPaymentTotal);

                                            return (
                                                <div key={index} className="ckout-payment-row">
                                                    <select
                                                        className="ckout-edit-input ckout-payment-method-select"
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
                                                        className="ckout-edit-input ckout-payment-amount-input"
                                                        placeholder="Amount"
                                                        value={payment.amount || 0}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            if (val > finalTotal) {
                                                                toast.warning(`Amount cannot exceed Final Total (₹${finalTotal.toFixed(2)})`);
                                                                return;
                                                            }
                                                            handlePaymentDetailChange(index, 'amount', val);
                                                        }}
                                                        min="0"
                                                        max={finalTotal}
                                                    />
                                                   
                                                    <button
                                                        type="button"
                                                        className="ckout-remove-payment-btn"
                                                        onClick={() => handleRemovePaymentDetail(index)}
                                                        disabled={editPaymentDetails.length <= 1}
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        <div className="ckout-payment-actions">
                                            <button
                                                type="button"
                                                className="ckout-add-payment-btn"
                                                onClick={handleAddPaymentDetail}
                                                disabled={editPaymentDetails.length >= PAYMENT_METHODS.length}
                                            >
                                                <FaPlus /> Add Payment Method
                                            </button>
                                            {editPaymentDetails.length >= PAYMENT_METHODS.length && (
                                                <small className="ckout-field-hint">All payment methods are already added</small>
                                            )}
                                        </div>
                                        {editPaymentDetails.length > 0 && (
                                            <small className="ckout-field-hint">
                                                Total: ₹{editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                                                {' | '}Type: {new Set(editPaymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : (editPaymentDetails[0]?.method || 'Cash')}
                                                {editPaymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0) > (editedCheckOut.finalTotal || 0) && (
                                                    <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                                                        ⚠️ Exceeds Final Total!
                                                    </span>
                                                )}
                                            </small>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Notes</span>
                                <textarea
                                    className="ckout-edit-textarea"
                                    value={editedCheckOut.notes || ''}
                                    onChange={(e) => setEditedCheckOut(prev => ({ ...prev, notes: e.target.value }))}
                                    rows="2"
                                />
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Checkout Created At</span>
                                <span className="ckout-detail-value">{new Date(checkOut.guestCheckOutAt).toLocaleString()}</span>
                            </div>

                            {renderPriceBreakdown(editedCheckOut)}
                        </div>
                    ) : (
                        <div className="ckout-details-grid">
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Booking Type</span>
                                <span className="ckout-detail-value">
                                    <span className={`ckout-booking-type-badge ${checkOut.bookingType === 'perNight' ? 'ckout-pernight-badge' : 'ckout-simple-badge'}`}>
                                        {checkOut.bookingType === 'perNight' ? '🌙 Night Stay' : 'Simple'}
                                    </span>
                                </span>
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Guest Name</span>
                                <span className="ckout-detail-value">{checkOut.customerName}</span>
                            </div>
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Phone</span>
                                <span className="ckout-detail-value">{checkOut.customerPhone}</span>
                            </div>
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Email</span>
                                <span className="ckout-detail-value">{checkOut.customerEmail || 'N/A'}</span>
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Rooms</span>
                                <div className="ckout-detail-value ckout-rooms-list">
                                    {(checkOut.roomDetails || []).map((room, idx) => (
                                        <div key={idx} className={`ckout-room-detail-item ${room.isRemoved ? 'ckout-room-removed' : ''}`}>
                                            <strong>{room.roomNumber}</strong> ({room.categoryName})
                                            {room.isRemoved && <span className="ckout-removed-badge">Removed</span>}
                                            <br />
                                            <small>Check-in: {new Date(room.checkInDate).toLocaleString()}</small>
                                            <br />
                                            <small>Check-out: {new Date(room.checkOutDate).toLocaleString()}</small>
                                            <br />
                                            <small>Price: ₹{(room.price || 0).toFixed(2)}</small>
                                            {room.isRemoved && (
                                                <>
                                                    <br />
                                                    <small className="ckout-removed-info-text">
                                                        Hours used: {room.hoursUsed || 0}h ({room.durationLabel})
                                                        {room.reason && <span> | Reason: {room.reason}</span>}
                                                    </small>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Check-in</span>
                                <span className="ckout-detail-value">{new Date(checkOut.checkInDate).toLocaleString()}</span>
                            </div>
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Check-out</span>
                                <span className="ckout-detail-value">{new Date(checkOut.checkOutDate).toLocaleString()}</span>
                            </div>
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Duration</span>
                                <span className="ckout-detail-value">{checkOut.durationLabel}</span>
                            </div>

                            {/* ===== PAYMENT DETAILS - VIEW ===== */}
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Payment Type</span>
                                <span className="ckout-detail-value">
                                    <span className={`ckout-payment-type-badge ckout-payment-type-${(checkOut.paymentType || 'Cash').toLowerCase()}`}>
                                        {checkOut.paymentType || 'Cash'}
                                    </span>
                                </span>
                            </div>
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Payment Details</span>
                                <div className="ckout-detail-value">
                                    {renderPaymentDetails()}
                                </div>
                            </div>

                            {checkOut.extraRequirements && checkOut.extraRequirements.length > 0 && (
                                <div className="ckout-detail-row">
                                    <span className="ckout-detail-label">Extra Requirements</span>
                                    <div className="ckout-detail-value ckout-extra-req-list">
                                        {checkOut.extraRequirements.map((req, idx) => (
                                            <div key={idx} className="ckout-extra-req-list-item">
                                                {req.description}: ₹{req.price.toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {checkOut.extraCharges && checkOut.extraCharges.length > 0 && (
                                <div className="ckout-detail-row">
                                    <span className="ckout-detail-label">Extra Charges</span>
                                    <div className="ckout-detail-value ckout-extra-req-list">
                                        {checkOut.extraCharges.map((charge, idx) => (
                                            <div key={idx} className="ckout-extra-req-list-item">
                                                {charge.description}: ₹{charge.price.toFixed(2)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {checkOut.idProofs && checkOut.idProofs.length > 0 && (
                                <div className="ckout-detail-row">
                                    <span className="ckout-detail-label">ID Proofs</span>
                                    <div className="ckout-detail-value ckout-id-proofs-list">
                                        {checkOut.idProofs.map(proof => (
                                            <div key={proof.proofId}>
                                                <strong>{proof.label}:</strong> {proof.fileName}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {checkOut.discount && checkOut.discount.value > 0 && (
                                <div className="ckout-detail-row">
                                    <span className="ckout-detail-label">Discount</span>
                                    <span className="ckout-detail-value ckout-price-discount">
                                        {checkOut.discount.type === 'percentage' ? `${checkOut.discount.value}%` : `₹${checkOut.discount.value}`}
                                        {checkOut.discount.reason && ` (${checkOut.discount.reason})`}
                                    </span>
                                </div>
                            )}

                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Status</span>
                                <span className={`ckout-status-badge ckout-status-${checkOut.status?.toLowerCase()}`}>
                                    {checkOut.status}
                                </span>
                            </div>
                            <div className="ckout-detail-row">
                                <span className="ckout-detail-label">Payment</span>
                                <span className={`ckout-status-badge ckout-status-${checkOut.paymentStatus?.toLowerCase().replace(' ', '')}`}>
                                    {checkOut.paymentStatus}
                                </span>
                            </div>

                            {checkOut.notes && (
                                <div className="ckout-detail-row">
                                    <span className="ckout-detail-label">Notes</span>
                                    <span className="ckout-detail-value">{checkOut.notes}</span>
                                </div>
                            )}

                            {renderPriceBreakdown(checkOut)}
                        </div>
                    )}
                </div>
                <div className="ckout-modal-footer">
                    {!isEditing && (
                        <>
                            <button
                                className="ckout-print-btn"
                                onClick={() => onPrint(checkOut)}
                                disabled={isPrinting}
                            >
                                {isPrinting ? (
                                    <>
                                        <div className="ckout-loading-spinner small"></div>
                                        Printing...
                                    </>
                                ) : (
                                    <><FaPrint /> Print</>
                                )}
                            </button>
                            <button
                                className="ckout-whatsapp-btn"
                                onClick={() => onSendWhatsApp(checkOut)}
                                disabled={isWhatsAppSending}
                            >
                                {isWhatsAppSending ? (
                                    <>
                                        <div className="ckout-loading-spinner small"></div>
                                        Sending...
                                    </>
                                ) : (
                                    <><FaWhatsapp /> WhatsApp</>
                                )}
                            </button>
                            <button
                                className="ckout-export-btn"
                                onClick={() => onGeneratePDF(checkOut)}
                                disabled={isPDFGenerating}
                            >
                                {isPDFGenerating ? (
                                    <>
                                        <div className="ckout-loading-spinner small"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <><FaFilePdf /> PDF</>
                                )}
                            </button>
                            <button
                                className="ckout-export-btn"
                                onClick={() => onPrintAndWhatsApp(checkOut)}
                                disabled={isPrintAndWhatsAppProcessing}
                            >
                                {isPrintAndWhatsAppProcessing ? (
                                    <>
                                        <div className="ckout-loading-spinner small"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <><FaPrint /> PDF + WhatsApp</>
                                )}
                            </button>
                        </>
                    )}
                    <button
                        className={`ckout-update-btn ${isEditing ? 'ckout-save-btn' : ''}`}
                        onClick={isEditing ? handleSaveEdit : () => setIsEditing(true)}
                    >
                        {isEditing ? <FaSave /> : <FaEdit />}
                        {isEditing ? "Save" : "Update"}
                    </button>
                    {!isEditing && (
                        <button className="ckout-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                            <FaTrash /> Delete
                        </button>
                    )}
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="ckout-confirm-dialog-overlay">
                    <div className="ckout-confirm-dialog">
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete check-out {checkOut.checkOutNumber}? This action cannot be undone.</p>
                        <div className="ckout-confirm-buttons">
                            <button className="ckout-confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className="ckout-confirm-delete" onClick={() => { onDelete(checkOut.checkOutId); setShowDeleteConfirm(false); }}>
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
// MAIN CHECKOUT COMPONENT - UPDATED WITH BOOKING TYPE
// ============================================
const CheckOut = () => {
    const [showForm, setShowForm] = useState(false);
    const [checkOuts, setCheckOuts] = useState([]);
    const [selectedCheckOut, setSelectedCheckOut] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isFormSubmitting, setIsFormSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [timeFilter, setTimeFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [checkoutForPrint, setCheckoutForPrint] = useState(null);

    // ===== INDIVIDUAL LOADING STATES FOR EACH BUTTON =====
    const [pdfLoadingStates, setPdfLoadingStates] = useState({});
    const [whatsappLoadingStates, setWhatsappLoadingStates] = useState({});
    const [printWhatsappLoadingStates, setPrintWhatsappLoadingStates] = useState({});
    const [printLoadingStates, setPrintLoadingStates] = useState({});

    // Pagination
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCheckOuts: 0,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false,
        startIndex: 0,
        endIndex: 0
    });

    // Active Check-ins for checkout
    const [activeCheckIns, setActiveCheckIns] = useState([]);
    const [selectedCheckIn, setSelectedCheckIn] = useState(null);
    const [checkInSearch, setCheckInSearch] = useState("");
    const [showCheckInDropdown, setShowCheckInDropdown] = useState(false);
    const [isSearchingCheckIns, setIsSearchingCheckIns] = useState(false);

    // Check-in details for checkout form
    const [checkInDetails, setCheckInDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Extra charges
    const [extraCharges, setExtraCharges] = useState([]);

    // Discount
    const [discount, setDiscount] = useState({
        type: 'percentage',
        value: 0,
        reason: ''
    });

    // File upload
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadedFileLabels, setUploadedFileLabels] = useState([]);
    const fileInputRef = useRef(null);

    // Extra Requirements (from check-in + editable)
    const [extraRequirements, setExtraRequirements] = useState([]);

    // Payment Details state
    const [paymentDetails, setPaymentDetails] = useState([]);

    // Formik ref
    const formikRef = useRef(null);

    // Check-in data with removed rooms
    const [checkInWithRemoved, setCheckInWithRemoved] = useState(null);

    // ============================================
    // EFFECTS
    // ============================================
    useEffect(() => {
        window.scrollTo(0, 0);
        fetchCheckOuts();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        fetchCheckOuts(debouncedSearch, filterStatus, filterDate, timeFilter, yearFilter);
    }, [debouncedSearch, filterStatus, filterDate, timeFilter, yearFilter, pagination.currentPage]);

    // ============================================
    // API CALLS
    // ============================================
    const fetchCheckOuts = async (search = '', status = '', date = '', time = '', year = '') => {
        try {
            setIsLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/checkout/get-checkouts`);
            url.searchParams.append('page', pagination.currentPage);
            url.searchParams.append('limit', pagination.limit);
            if (search) url.searchParams.append('search', search);
            if (status) url.searchParams.append('status', status);
            if (date) url.searchParams.append('startDate', date);
            if (time) url.searchParams.append('timeFilter', time);
            if (year) url.searchParams.append('yearFilter', year);

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setCheckOuts(data.data || []);
                if (data.pagination) {
                    setPagination({
                        currentPage: data.pagination.currentPage,
                        totalPages: data.pagination.totalPages,
                        totalCheckOuts: data.pagination.totalCheckOuts,
                        limit: data.pagination.limit,
                        hasNextPage: data.pagination.hasNextPage,
                        hasPrevPage: data.pagination.hasPrevPage,
                        startIndex: data.pagination.startIndex,
                        endIndex: data.pagination.endIndex
                    });
                }
            } else {
                throw new Error(data.message || 'Failed to fetch check-outs');
            }
        } catch (err) {
            console.error("Error fetching check-outs:", err);
            toast.error("Failed to fetch check-outs");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchActiveCheckIns = async (search = '') => {
        try {
            setIsSearchingCheckIns(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/checkout/active-checkins`);
            if (search && search.trim() !== '') {
                url.searchParams.append('search', search.trim());
            }
            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setActiveCheckIns(data.data || []);
                setShowCheckInDropdown(data.data.length > 0);
            }
        } catch (error) {
            console.error("Error fetching active check-ins:", error);
            toast.error("Failed to fetch active check-ins");
        } finally {
            setIsSearchingCheckIns(false);
        }
    };

    const fetchCheckInDetails = async (checkInId) => {
        try {
            setIsLoadingDetails(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkout/checkin-details/${checkInId}`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) {
                const checkInData = data.data;
                setCheckInDetails(checkInData);
                setCheckInWithRemoved(checkInData);
                setSelectedCheckIn(checkInData);

                const activeRooms = checkInData.roomDetails || [];
                const removedRooms = checkInData.removedRooms || [];
                const allRooms = [
                    ...activeRooms.map(r => ({ ...r, isRemoved: false })),
                    ...removedRooms.map(r => ({ ...r, isRemoved: true, price: r.price || 0 }))
                ];

                // Set payment details from check-in
                if (checkInData.paymentDetails && checkInData.paymentDetails.length > 0) {
                    setPaymentDetails(checkInData.paymentDetails);
                }

                if (formikRef.current) {
                    formikRef.current.setFieldValue('checkInId', checkInData.checkInId);
                    formikRef.current.setFieldValue('checkInNumber', checkInData.checkInNumber);
                    formikRef.current.setFieldValue('customerId', checkInData.customerId);
                    formikRef.current.setFieldValue('customerName', checkInData.customerName);
                    formikRef.current.setFieldValue('customerPhone', checkInData.customerPhone);
                    formikRef.current.setFieldValue('customerEmail', checkInData.customerEmail || '');
                    formikRef.current.setFieldValue('roomDetails', allRooms);
                    formikRef.current.setFieldValue('roomNumber', checkInData.roomNumber);
                    formikRef.current.setFieldValue('categoryId', checkInData.categoryId);
                    formikRef.current.setFieldValue('categoryName', checkInData.categoryName);
                    formikRef.current.setFieldValue('checkInDate', checkInData.checkInDate);
                    formikRef.current.setFieldValue('checkOutDate', checkInData.checkOutDate);
                    formikRef.current.setFieldValue('durationLabel', checkInData.durationLabel);
                    formikRef.current.setFieldValue('totalHours', checkInData.totalHours);
                    formikRef.current.setFieldValue('basePrice', checkInData.basePrice);
                    formikRef.current.setFieldValue('extraHoursPrice', checkInData.extraHoursPrice);
                    formikRef.current.setFieldValue('taxSlab', checkInData.taxSlab || 18);
                    formikRef.current.setFieldValue('paymentStatus', checkInData.paymentStatus || 'Not Paid');
                    formikRef.current.setFieldValue('amountPaid', checkInData.amountPaid || 0);
                    formikRef.current.setFieldValue('advancePaid', checkInData.advancePaid || 0);

                    if (checkInData.extraRequirements && checkInData.extraRequirements.length > 0) {
                        formikRef.current.setFieldValue('extraRequirements', checkInData.extraRequirements);
                        formikRef.current.setFieldValue('extraRequirementsTotal', checkInData.extraRequirementsTotal || 0);
                    }

                    if (checkInData.idProofs && checkInData.idProofs.length > 0) {
                        const existingFiles = checkInData.idProofs.map(proof => ({
                            fileName: proof.fileName,
                            fileSize: proof.fileSize,
                            fileUrl: proof.fileUrl,
                            label: proof.label || 'Other',
                            isExisting: true,
                            proofId: proof.proofId
                        }));
                        setUploadedFiles(existingFiles);
                        setUploadedFileLabels(checkInData.idProofs.map(proof => proof.label || 'Other'));
                    }

                    if (checkInData.extraRequirements && checkInData.extraRequirements.length > 0) {
                        setExtraRequirements(checkInData.extraRequirements);
                    }

                    // Set payment details in form
                    if (checkInData.paymentDetails && checkInData.paymentDetails.length > 0) {
                        formikRef.current.setFieldValue('paymentDetails', checkInData.paymentDetails);
                    }

                    calculatePricePreview(checkInData, checkInData.extraRequirements || []);
                }

                toast.success("Check-in loaded for checkout!");
            } else {
                toast.error(data.message || "Failed to load check-in details");
            }
        } catch (error) {
            console.error("Error fetching check-in details:", error);
            toast.error("Failed to fetch check-in details");
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleCheckInSearch = (value) => {
        setCheckInSearch(value);
        if (value.length > 1) {
            fetchActiveCheckIns(value);
        } else {
            setActiveCheckIns([]);
            setShowCheckInDropdown(false);
        }
    };

    const handleSelectCheckIn = (checkIn) => {
        setSelectedCheckIn(checkIn);
        setCheckInSearch(checkIn.checkInNumber + ' - ' + checkIn.customerName + ' (' + checkIn.roomNumber + ')');
        setShowCheckInDropdown(false);
        fetchCheckInDetails(checkIn.checkInId);
    };

    // ============================================
    // PRICE CALCULATION
    // ============================================
    const [calculatedPrice, setCalculatedPrice] = useState(null);

    const calculatePricePreview = (checkIn, extraReqs = null, discountOverride = null) => {
        if (!checkIn) return;

        const reqs = extraReqs !== null ? extraReqs : extraRequirements;
        const activeDiscount = discountOverride !== null ? discountOverride : discount;

        const extraRequirementsTotal = reqs.reduce((sum, req) => sum + (req.price || 0), 0);

        const activeRooms = checkIn.roomDetails || [];
        const removedRooms = checkIn.removedRooms || [];
        const activeRoomsTotal = activeRooms.reduce((sum, room) => sum + (room.price || 0), 0);
        const removedRoomsTotal = removedRooms.reduce((sum, room) => sum + (room.price || 0), 0);

        const basePrice = activeRoomsTotal + removedRoomsTotal;
        const extraHoursPrice = checkIn.extraHoursPrice || 0;
        const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + (charge.price || 0), 0);

        const subtotal = basePrice + extraHoursPrice + extraRequirementsTotal + extraChargesTotal;

        let discountAmount = 0;
        if (activeDiscount.value > 0) {
            if (activeDiscount.type === 'percentage') {
                discountAmount = (subtotal * activeDiscount.value) / 100;
            } else {
                discountAmount = activeDiscount.value;
            }
            discountAmount = Math.min(discountAmount, subtotal);
        }

        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const taxSlab = checkIn.taxSlab || 18;
        const taxAmount = (afterDiscount * taxSlab) / 100;
        const finalTotal = afterDiscount + taxAmount;

        const amountPaid = formikRef.current?.values?.amountPaid || checkIn.amountPaid || 0;
        const advancePaid = formikRef.current?.values?.advancePaid || checkIn.advancePaid || 0;
        const balanceAmount = Math.max(0, finalTotal - (amountPaid + advancePaid));

        // Calculate payment details total
        const paymentDetailsTotal = (formikRef.current?.values?.paymentDetails || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const paymentType = formikRef.current?.values?.paymentDetails && formikRef.current.values.paymentDetails.length > 0
            ? (new Set(formikRef.current.values.paymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : formikRef.current.values.paymentDetails[0].method)
            : 'Cash';

        setCalculatedPrice({
            activeRoomsTotal,
            removedRoomsTotal,
            basePrice,
            extraHoursPrice,
            extraRequirementsTotal,
            extraChargesTotal,
            subtotal,
            discountAmount,
            afterDiscount,
            taxSlab,
            taxAmount,
            finalTotal,
            amountPaid,
            advancePaid,
            balanceAmount,
            paymentDetailsTotal,
            paymentType,
            activeRooms: activeRooms.map(room => ({
                roomNumber: room.roomNumber,
                price: room.price || 0,
                label: room.durationLabel || ''
            })),
            removedRooms: removedRooms.map(room => ({
                roomNumber: room.roomNumber,
                price: room.price || 0,
                label: room.durationLabel || '',
                hoursUsed: room.hoursUsed || 0,
                reason: room.reason || ''
            }))
        });
    };

    // ============================================
    // HANDLERS
    // ============================================
    const handleAddExtraCharge = () => {
        setExtraCharges([...extraCharges, { description: '', price: 0 }]);
        if (checkInDetails) {
            calculatePricePreview(checkInDetails);
        }
    };

    const handleRemoveExtraCharge = (index) => {
        const updated = [...extraCharges];
        updated.splice(index, 1);
        setExtraCharges(updated);
        if (checkInDetails) {
            calculatePricePreview(checkInDetails);
        }
    };

    const handleExtraChargeChange = (index, field, value) => {
        const updated = [...extraCharges];
        updated[index][field] = value;
        setExtraCharges(updated);
        if (checkInDetails) {
            calculatePricePreview(checkInDetails);
        }
    };

    const handleAddExtraRequirement = () => {
        setExtraRequirements([...extraRequirements, { description: '', price: 0 }]);
        if (checkInDetails) {
            calculatePricePreview(checkInDetails);
        }
    };

    const handleRemoveExtraRequirement = (index) => {
        const updated = [...extraRequirements];
        updated.splice(index, 1);
        setExtraRequirements(updated);
        if (checkInDetails) {
            calculatePricePreview(checkInDetails);
        }
    };

    const handleExtraRequirementChange = (index, field, value) => {
        const updated = [...extraRequirements];
        updated[index][field] = value;
        setExtraRequirements(updated);
        if (checkInDetails) {
            calculatePricePreview(checkInDetails);
        }
    };

    const handleRoomPriceChange = (index, newPrice) => {
        if (!checkInDetails) return;

        const updatedRooms = [...checkInDetails.roomDetails];
        updatedRooms[index] = {
            ...updatedRooms[index],
            price: parseFloat(newPrice) || 0
        };

        const updatedCheckIn = {
            ...checkInDetails,
            roomDetails: updatedRooms
        };
        setCheckInDetails(updatedCheckIn);
        calculatePricePreview(updatedCheckIn);
    };

    const handleRemovedRoomPriceChange = (index, newPrice) => {
        if (!checkInDetails || !checkInDetails.removedRooms) return;

        const updatedRemoved = [...checkInDetails.removedRooms];
        updatedRemoved[index] = {
            ...updatedRemoved[index],
            price: parseFloat(newPrice) || 0
        };

        const updatedCheckIn = {
            ...checkInDetails,
            removedRooms: updatedRemoved
        };
        setCheckInDetails(updatedCheckIn);
        calculatePricePreview(updatedCheckIn);
    };

    const handleDiscountChange = (field, value) => {
        const updatedDiscount = { ...discount, [field]: value };
        setDiscount(updatedDiscount);
        if (checkInDetails) {
            calculatePricePreview(checkInDetails, null, updatedDiscount);
        }
    };

    // Payment Details Handlers
    const handlePaymentDetailChange = (index, field, value) => {
        const updated = [...paymentDetails];
        updated[index][field] = value;
        setPaymentDetails(updated);
        if (formikRef.current) {
            formikRef.current.setFieldValue('paymentDetails', updated);
        }
        if (checkInDetails) {
            calculatePricePreview(checkInDetails);
        }
    };

    const handleAddPaymentDetail = () => {
        const usedMethods = paymentDetails.map(p => p.method);
        const availableMethod = PAYMENT_METHODS.find(m => !usedMethods.includes(m));

        if (availableMethod) {
            const updated = [...paymentDetails, { method: availableMethod, amount: 0, reference: '' }];
            setPaymentDetails(updated);
            if (formikRef.current) {
                formikRef.current.setFieldValue('paymentDetails', updated);
            }
        } else {
            toast.warning("All payment methods are already added");
        }
    };

    const handleRemovePaymentDetail = (index) => {
        const updated = [...paymentDetails];
        updated.splice(index, 1);
        setPaymentDetails(updated);
        if (formikRef.current) {
            formikRef.current.setFieldValue('paymentDetails', updated);
        }
        if (checkInDetails) {
            calculatePricePreview(checkInDetails);
        }
    };

    const handleFileUpload = (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            const newFiles = Array.from(files).map(file => ({
                fileName: file.name,
                fileSize: file.size,
                file: file,
                isExisting: false
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

    const sendWhatsAppMessage = async (checkOut) => {
        if (!checkOut) return;

        const key = checkOut.checkOutId || checkOut.checkOutNumber;
        if (whatsappLoadingStates[key]) return;

        try {
            setWhatsappLoadingStates(prev => ({ ...prev, [key]: true }));

            const customerPhone = checkOut.customerPhone?.replace(/\D/g, '') || '';
            if (!customerPhone) {
                toast.error("Customer phone number not available");
                setWhatsappLoadingStates(prev => ({ ...prev, [key]: false }));
                return;
            }

            const roomNumbers = checkOut.roomDetails?.map(r => r.roomNumber).join(', ') || checkOut.roomNumber;
            const durationDisplay = checkOut.bookingType === 'perNight' ? '🌙 Night Stay' : checkOut.durationLabel;

            let message = `🏨 *CHECKOUT COMPLETE* 🏨

Hello ${checkOut.customerName},

Your checkout has been completed successfully!

📋 *Checkout Details:*
🆔 Checkout #: ${checkOut.checkOutNumber}
🛏️ Room(s): ${roomNumbers}
📅 Check-in: ${new Date(checkOut.checkInDate).toLocaleString()}
📅 Check-out: ${new Date(checkOut.checkOutDate).toLocaleString()}
⏱️ Duration: ${durationDisplay}

💰 *Payment Summary:*
📊 Subtotal: ₹${(checkOut.subtotal || 0).toFixed(2)}
🧾 Tax (${checkOut.taxSlab || 18}%): ₹${(checkOut.taxAmount || 0).toFixed(2)}`;

            if (checkOut.discountAmount > 0) {
                message += `\n🎯 Discount: -₹${(checkOut.discountAmount || 0).toFixed(2)}`;
            }

            message += `\n💰 *Grand Total: ₹${(checkOut.finalTotal || 0).toFixed(2)}*`;

            const paymentStatus = checkOut.paymentStatus?.toLowerCase() || 'not paid';

            if (paymentStatus === 'paid') {
                message += `\n✅ *Payment Status: PAID IN FULL* ✅`;
            } else if (paymentStatus === 'partial paid' || paymentStatus === 'partial') {
                message += `\n\n💳 Amount Paid: ₹${(checkOut.amountPaid || 0).toFixed(2)}`;
                const balance = (checkOut.finalTotal || 0) - (checkOut.amountPaid || 0) - (checkOut.advancePaid || 0);
                if (balance > 0) {
                    message += `\n⚖️ *Balance Due: ₹${balance.toFixed(2)}*`;
                }
            } else {
                message += `\n❌ *Payment Status: NOT PAID* ❌`;
                message += `\n💳 Amount Due: ₹${(checkOut.finalTotal || 0).toFixed(2)}`;
            }

            if (checkOut.advancePaid > 0 && paymentStatus !== 'paid') {
                message += `\n💳 Advance Paid: ₹${(checkOut.advancePaid || 0).toFixed(2)}`;
            }

            // Add Payment Type if available
            if (checkOut.paymentType) {
                message += `\n💳 Payment Type: ${checkOut.paymentType}`;
            }

            message += `\n\nThank you for choosing us! 🙏\nWe hope to serve you again soon!`;

            const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;
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
    const generatePDF = async (checkOut) => {
        if (!checkOut) return;

        const key = checkOut.checkOutId || checkOut.checkOutNumber;
        if (pdfLoadingStates[key]) return;

        try {
            setPdfLoadingStates(prev => ({ ...prev, [key]: true }));

            setCheckoutForPrint(checkOut);
            await new Promise(resolve => setTimeout(resolve, 500));

            const element = document.getElementById("checkout-pdf");
            if (!element) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const retryElement = document.getElementById("checkout-pdf");
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
                filename: `CheckOut_${checkOut.checkOutNumber}.pdf`,
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
            setCheckoutForPrint(null);
        }
    };

    const handlePrint = async (checkOut) => {
        if (!checkOut) return;

        const key = checkOut.checkOutId || checkOut.checkOutNumber;
        if (printLoadingStates[key]) return;

        try {
            setPrintLoadingStates(prev => ({ ...prev, [key]: true }));
            setCheckoutForPrint(checkOut);
            await new Promise(resolve => setTimeout(resolve, 500));

            const element = document.getElementById("checkout-pdf");
            if (!element) throw new Error("Print element not found");

            document.body.classList.add('ckout-print-mode');

            const cleanup = () => {
                document.body.classList.remove('ckout-print-mode');
                setCheckoutForPrint(null);
                setPrintLoadingStates(prev => ({ ...prev, [key]: false }));
                window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);

            window.print();
            toast.success("Print dialog opened!");
        } catch (error) {
            console.error("Print error:", error);
            toast.error("Failed to print");
            document.body.classList.remove('ckout-print-mode');
            setCheckoutForPrint(null);
            setPrintLoadingStates(prev => ({ ...prev, [key]: false }));
        }
    };

    // ============================================
    // PRINT + WHATSAPP - INDIVIDUAL LOADING
    // ============================================
    const handlePrintAndWhatsApp = async (checkOut) => {
        if (!checkOut) return;

        const key = checkOut.checkOutId || checkOut.checkOutNumber;
        if (printWhatsappLoadingStates[key]) return;

        try {
            setPrintWhatsappLoadingStates(prev => ({ ...prev, [key]: true }));

            await generatePDF(checkOut);
            await new Promise(resolve => setTimeout(resolve, 1500));
            await sendWhatsAppMessage(checkOut);

        } catch (error) {
            console.error("Error in Print and WhatsApp:", error);
            toast.error("Failed to complete Print and WhatsApp action");
        } finally {
            setPrintWhatsappLoadingStates(prev => ({ ...prev, [key]: false }));
        }
    };

    // ============================================
    // EXPORT EXCEL
    // ============================================
    const handleExportExcel = async () => {
        if (isExporting) return;

        try {
            setIsExporting(true);
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (filterStatus) params.append('status', filterStatus);
            if (filterDate) params.append('startDate', filterDate);
            if (timeFilter) params.append('timeFilter', timeFilter);
            if (yearFilter) params.append('yearFilter', yearFilter);

            const loadingToast = toast.loading("Fetching all checkouts for export...");

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkout/export-checkouts?${params.toString()}`,
                { credentials: 'include' }
            );

            const data = await response.json();
            toast.dismiss(loadingToast);

            if (!data.success) {
                throw new Error(data.message || "Failed to fetch checkouts for export");
            }

            const allCheckOuts = data.data;

            if (allCheckOuts.length === 0) {
                toast.warn("No checkouts to export");
                setIsExporting(false);
                return;
            }

            const excelData = allCheckOuts.map(checkout => ({
                'Checkout #': checkout.checkOutNumber,
                'Check-in #': checkout.checkInNumber || 'N/A',
                'Guest Name': checkout.customerName,
                'Phone': checkout.customerPhone,
                'Email': checkout.customerEmail || 'N/A',
                'Room(s)': checkout.roomDetails?.map(r => r.roomNumber).join(', ') || checkout.roomNumber,
                'Category': checkout.categoryName || 'N/A',
                'Booking Type': checkout.bookingType || 'simple',
                'Check-in Date': new Date(checkout.checkInDate).toLocaleString(),
                'Check-out Date': new Date(checkout.checkOutDate).toLocaleString(),
                'Duration': checkout.durationLabel || 'N/A',
                'Active Rooms Total': `₹${(checkout.activeRoomsTotal || 0).toFixed(2)}`,
                'Removed Rooms Total': `₹${(checkout.removedRoomsTotal || 0).toFixed(2)}`,
                'Base Price': `₹${(checkout.basePrice || 0).toFixed(2)}`,
                'Extra Hours': `₹${(checkout.extraHoursPrice || 0).toFixed(2)}`,
                'Extra Requirements': `₹${(checkout.extraRequirementsTotal || 0).toFixed(2)}`,
                'Extra Charges': `₹${(checkout.extraChargesTotal || 0).toFixed(2)}`,
                'Subtotal': `₹${(checkout.subtotal || 0).toFixed(2)}`,
                'Tax Rate': `${checkout.taxSlab || 18}%`,
                'Tax Amount': `₹${(checkout.taxAmount || 0).toFixed(2)}`,
                'Grand Total': `₹${(checkout.grandTotal || 0).toFixed(2)}`,
                'Discount': `₹${(checkout.discountAmount || 0).toFixed(2)}`,
                'Final Total': `₹${(checkout.finalTotal || 0).toFixed(2)}`,
                'Amount Paid': `₹${(checkout.amountPaid || 0).toFixed(2)}`,
                'Advance Paid': `₹${(checkout.advancePaid || 0).toFixed(2)}`,
                'Balance': `₹${(checkout.balanceAmount || 0).toFixed(2)}`,
                'Payment Status': checkout.paymentStatus || 'Not Paid',
                'Payment Type': checkout.paymentType || 'Cash',
                'Status': checkout.status || 'Completed',
                'Notes': checkout.notes || '',
                'Created At': new Date(checkout.createdAt).toLocaleString(),
                'Updated At': new Date(checkout.updatedAt).toLocaleString()
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Checkouts");

            const colWidths = Object.keys(excelData[0]).map(key => ({
                wch: Math.max(key.length * 2, 15)
            }));
            worksheet['!cols'] = colWidths;

            let fileName = "checkouts";
            if (timeFilter) fileName += `_${timeFilter.replace(/\s+/g, '_')}`;
            if (yearFilter) fileName += `_${yearFilter}`;
            if (filterStatus) fileName += `_${filterStatus}`;
            fileName += ".xlsx";

            XLSX.writeFile(workbook, fileName);
            toast.success(`Exported ${allCheckOuts.length} checkouts successfully!`);

        } catch (error) {
            console.error("Export error:", error);
            toast.error(error.message || "Failed to export checkouts");
        } finally {
            setIsExporting(false);
        }
    };

    // ============================================
    // CREATE CHECKOUT - UPDATED WITH BOOKING TYPE
    // ============================================
    const handleCreateCheckOut = async (values, { resetForm, setFieldError }) => {
        try {
            setIsFormSubmitting(true);

            if (!selectedCheckIn) {
                toast.error("Please select a check-in");
                setIsFormSubmitting(false);
                return;
            }

            // Calculate final total for validation
            const activeRooms = checkInDetails?.roomDetails || [];
            const removedRooms = checkInDetails?.removedRooms || [];
            const activeRoomsTotal = activeRooms.reduce((sum, r) => sum + (r.price || 0), 0);
            const removedRoomsTotal = removedRooms.reduce((sum, r) => sum + (r.price || 0), 0);
            const basePrice = activeRoomsTotal + removedRoomsTotal;
            const extraRequirementsTotal = extraRequirements.reduce((sum, req) => sum + (req.price || 0), 0);
            const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + (charge.price || 0), 0);
            const subtotal = basePrice + extraRequirementsTotal + extraChargesTotal;
            let discountAmount = 0;
            if (discount.value > 0) {
                if (discount.type === 'percentage') {
                    discountAmount = (subtotal * discount.value) / 100;
                } else {
                    discountAmount = discount.value;
                }
                discountAmount = Math.min(discountAmount, subtotal);
            }
            const afterDiscount = Math.max(0, subtotal - discountAmount);
            const taxSlab = values.taxSlab || 18;
            const taxAmount = (afterDiscount * taxSlab) / 100;
            const finalTotal = afterDiscount + taxAmount;

            // Validate payment details
            const paymentDetailsTotal = (values.paymentDetails || []).reduce((sum, p) => sum + (p.amount || 0), 0);
            if (paymentDetailsTotal > finalTotal) {
                toast.error(`Total payment (₹${paymentDetailsTotal.toFixed(2)}) cannot exceed Final Total (₹${finalTotal.toFixed(2)})`);
                setIsFormSubmitting(false);
                return;
            }

            if (values.paymentStatus === 'Partial Paid') {
                const amountPaid = parseFloat(values.amountPaid) || 0;
                if (amountPaid > finalTotal) {
                    toast.error(`Amount paid (₹${amountPaid.toFixed(2)}) cannot exceed Final Total (₹${finalTotal.toFixed(2)})`);
                    setIsFormSubmitting(false);
                    return;
                }
            }

            const roomDetails = (checkInDetails?.roomDetails || []).map(room => ({
                roomId: room.roomId,
                roomNumber: room.roomNumber,
                categoryId: room.categoryId,
                categoryName: room.categoryName,
                checkInDate: room.checkInDate,
                checkOutDate: room.checkOutDate,
                price: room.price || 0,
                totalHours: room.totalHours || 0,
                totalDays: room.totalDays || 0,
                remainingHours: room.remainingHours || 0,
                durationLabel: room.durationLabel || '',
                isRemoved: false,
                removedAt: null,
                hoursUsed: 0,
                reason: ''
            }));

            const removedRoomsData = (checkInDetails?.removedRooms || []).map(room => ({
                roomId: room.roomId,
                roomNumber: room.roomNumber,
                categoryId: room.categoryId,
                categoryName: room.categoryName,
                checkInDate: room.checkInDate,
                checkOutDate: room.checkOutDate,
                price: room.price || 0,
                totalHours: room.totalHours || 0,
                totalDays: room.totalDays || 0,
                remainingHours: room.remainingHours || 0,
                durationLabel: room.durationLabel || '',
                isRemoved: true,
                removedAt: room.removedAt || new Date(),
                hoursUsed: room.hoursUsed || 0,
                reason: room.reason || ''
            }));

            const activeTotal = roomDetails.reduce((sum, r) => sum + r.price, 0);
            const removedTotal = removedRoomsData.reduce((sum, r) => sum + r.price, 0);

            // Get booking type from check-in details
            const bookingType = checkInDetails?.bookingType || 'simple';

            const payload = {
                checkInId: values.checkInId,
                checkInNumber: values.checkInNumber,
                customerId: values.customerId,
                customerName: values.customerName,
                customerPhone: values.customerPhone,
                customerEmail: values.customerEmail || '',
                roomDetails: roomDetails,
                removedRooms: removedRoomsData,
                activeRoomsTotal: activeTotal,
                removedRoomsTotal: removedTotal,
                roomNumber: values.roomNumber,
                categoryId: values.categoryId,
                categoryName: values.categoryName,
                checkInDate: values.checkInDate,
                checkOutDate: values.checkOutDate,
                durationLabel: bookingType === 'perNight' ? 'Night Stay' : values.durationLabel,
                totalHours: values.totalHours,
                basePrice: activeTotal + removedTotal,
                extraHoursPrice: values.extraHoursPrice || 0,
                extraRequirements: extraRequirements,
                extraRequirementsTotal: extraRequirements.reduce((sum, req) => sum + (req.price || 0), 0),
                extraCharges: extraCharges,
                discount: discount,
                taxSlab: values.taxSlab || 18,
                amountPaid: values.amountPaid || 0,
                advancePaid: values.advancePaid || 0,
                paymentStatus: values.paymentStatus || 'Not Paid',
                notes: values.notes || '',
                idProofLabels: JSON.stringify(uploadedFileLabels),
                paymentDetails: values.paymentDetails || [],
                bookingType: bookingType // ✅ Send booking type to backend
            };

            const formData = new FormData();
            Object.keys(payload).forEach(key => {
                if (key === 'extraCharges' || key === 'discount' || key === 'roomDetails' || key === 'removedRooms' || key === 'extraRequirements' || key === 'paymentDetails') {
                    formData.append(key, JSON.stringify(payload[key]));
                } else {
                    formData.append(key, payload[key]);
                }
            });

            const newFiles = uploadedFiles.filter(file => !file.isExisting);
            if (newFiles.length > 0) {
                newFiles.forEach((file, index) => {
                    formData.append('idProofs', file.file);
                });
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkout/create-checkout`,
                {
                    method: "POST",
                    body: formData,
                    credentials: 'include'
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to complete check-out");
            }

            toast.success("Check-out completed successfully!");

            if (data.data) {
                sendWhatsAppMessage(data.data);
                setTimeout(() => {
                    generatePDF(data.data);
                }, 1000);
            }

            resetForm();
            setUploadedFiles([]);
            setUploadedFileLabels([]);
            setSelectedCheckIn(null);
            setCheckInSearch("");
            setCheckInDetails(null);
            setCheckInWithRemoved(null);
            setExtraCharges([]);
            setExtraRequirements([]);
            setPaymentDetails([]);
            setDiscount({ type: 'percentage', value: 0, reason: '' });
            setCalculatedPrice(null);
            setShowForm(false);
            fetchCheckOuts(debouncedSearch, filterStatus, filterDate, timeFilter, yearFilter);
        } catch (error) {
            console.error("Error creating check-out:", error);
            toast.error(error.message || "Error completing check-out");
        } finally {
            setIsFormSubmitting(false);
        }
    };

    // ============================================
    // UPDATE CHECKOUT - UPDATED WITH BOOKING TYPE
    // ============================================
    const handleUpdateCheckOut = async (checkOutId, values) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkout/update-checkout/${checkOutId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update check-out");
            }

            toast.success("Check-out updated successfully!");
            fetchCheckOuts(debouncedSearch, filterStatus, filterDate, timeFilter, yearFilter);
            setSelectedCheckOut(null);
        } catch (error) {
            console.error("Error updating check-out:", error);
            toast.error(error.message || "Error updating check-out");
        }
    };

    const handleDeleteCheckOut = async (checkOutId) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/checkout/delete-checkout/${checkOutId}`,
                {
                    method: "DELETE",
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete check-out");
            }

            toast.success("Check-out deleted successfully!");
            setSelectedCheckOut(null);
            fetchCheckOuts(debouncedSearch, filterStatus, filterDate, timeFilter, yearFilter);
        } catch (error) {
            console.error("Error deleting check-out:", error);
            toast.error(error.message || "Error deleting check-out");
        }
    };

    // ============================================
    // GET AVAILABLE YEARS
    // ============================================
    const getAvailableYears = () => {
        const years = new Set();
        checkOuts.forEach(checkout => {
            if (checkout.checkOutDate) {
                const year = new Date(checkout.checkOutDate).getFullYear();
                years.add(year.toString());
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    };

    // ============================================
    // INITIAL VALUES FOR FORM - UPDATED WITH PAYMENT DETAILS
    // ============================================
    const initialValues = {
        checkInId: "",
        checkInNumber: "",
        customerId: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        roomDetails: [],
        roomNumber: "",
        categoryId: "",
        categoryName: "",
        checkInDate: "",
        checkOutDate: "",
        durationLabel: "",
        totalHours: 0,
        basePrice: 0,
        extraHoursPrice: 0,
        extraRequirements: [],
        extraRequirementsTotal: 0,
        taxSlab: 18,
        paymentStatus: "Not Paid",
        amountPaid: 0,
        advancePaid: 0,
        notes: "",
        idProofs: [],
        paymentDetails: []
    };

    // ============================================
    // VALIDATION SCHEMA
    // ============================================
    const validationSchema = Yup.object({
        checkInId: Yup.string().required("Check-in is required"),
        customerName: Yup.string().required("Customer name is required"),
        customerPhone: Yup.string().required("Phone is required"),
        roomNumber: Yup.string().required("Room number is required"),
        amountPaid: Yup.number().min(0, "Amount cannot be negative"),
        advancePaid: Yup.number().min(0, "Amount cannot be negative")
    });

    // ============================================
    // MAIN RENDER
    // ============================================
    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="ckout-main">
                <div className="ckout-page-header">
                    <div className="ckout-right-section">
                        <div className="ckout-search-container">
                            <FaSearch className="ckout-search-icon" />
                            <input
                                type="text"
                                placeholder="Search by Guest, Phone, Room..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="ckout-filters-group">
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

                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">All Status</option>
                                <option value="Completed">Completed</option>
                                <option value="Partial">Partial</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                        <div className="ckout-action-buttons-group">
                            <button
                                className="ckout-export-all-btn"
                                onClick={handleExportExcel}
                                disabled={isExporting}
                            >
                                {isExporting ? (
                                    <>
                                        <div className="ckout-loading-spinner small"></div>
                                        Exporting...
                                    </>
                                ) : (
                                    <><FaFileExcel /> Export</>
                                )}
                            </button>
                            <button className="ckout-add-btn" onClick={() => setShowForm(!showForm)}>
                                <FaPlus /> {showForm ? "Close" : "Check-out"}
                            </button>
                        </div>
                    </div>
                </div>

                {showForm && (
                    <div className="ckout-form-container ckout-premium">
                        <h2>New Check-out</h2>

                        <div className="ckout-booking-search-section">
                            <div className="ckout-form-row">
                                <div className="ckout-form-field">
                                    <label><FaBook /> Search Active Check-in *</label>
                                    <div className="ckout-booking-search-wrap">
                                        <input
                                            type="text"
                                            value={checkInSearch}
                                            onChange={(e) => handleCheckInSearch(e.target.value)}
                                            placeholder="Search by Room #, Guest Name, Check-in #..."
                                            className="ckout-booking-search-input"
                                        />
                                        <FaSearch className="ckout-booking-search-icon" />
                                        {isSearchingCheckIns && (
                                            <div className="ckout-searching-spinner"><FaSync className="ckout-spin" /></div>
                                        )}
                                        {showCheckInDropdown && (
                                            <div className="ckout-dropdown-list ckout-booking-dropdown">
                                                {activeCheckIns.length > 0 ? (
                                                    activeCheckIns.map(checkIn => (
                                                        <div
                                                            key={checkIn.checkInId}
                                                            className="ckout-dropdown-item"
                                                            onClick={() => handleSelectCheckIn(checkIn)}
                                                        >
                                                            <div className="ckout-booking-dropdown-item">
                                                                <strong className="ckout-booking-dropdown-number">{checkIn.checkInNumber}</strong>
                                                                <span className="ckout-booking-dropdown-guest">{checkIn.customerName}</span>
                                                                <span className="ckout-booking-dropdown-phone">{checkIn.customerPhone}</span>
                                                                <span className="ckout-booking-dropdown-date">
                                                                    Room: {checkIn.roomNumber} | {new Date(checkIn.checkInDate).toLocaleDateString()} - {new Date(checkIn.checkOutDate).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="ckout-dropdown-item ckout-dropdown-item-center">
                                                        No active check-ins found
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {selectedCheckIn && (
                                        <div className="ckout-selected-booking-info">
                                            <FaCheck className="ckout-selected-booking-icon" />
                                            <span className="ckout-selected-booking-text">
                                                Check-in <strong>{selectedCheckIn.checkInNumber}</strong> loaded - {selectedCheckIn.customerName} (Room {selectedCheckIn.roomNumber})
                                            </span>
                                            <button
                                                type="button"
                                                className="ckout-selected-booking-remove"
                                                onClick={() => {
                                                    setSelectedCheckIn(null);
                                                    setCheckInSearch("");
                                                    setCheckInDetails(null);
                                                    setCheckInWithRemoved(null);
                                                    setExtraCharges([]);
                                                    setExtraRequirements([]);
                                                    setPaymentDetails([]);
                                                    setDiscount({ type: 'percentage', value: 0, reason: '' });
                                                    setCalculatedPrice(null);
                                                    if (formikRef.current) {
                                                        formikRef.current.resetForm();
                                                    }
                                                }}
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    )}
                                    <small className="ckout-field-hint">
                                        Search for an active check-in to process check-out
                                    </small>
                                </div>
                            </div>
                            <hr className="ckout-booking-section-divider" />
                        </div>

                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleCreateCheckOut}
                        >
                            {({ values, setFieldValue, handleChange }) => {
                                formikRef.current = { values, setFieldValue, handleChange };

                                // Calculate final total for validation
                                const activeRooms = checkInDetails?.roomDetails || [];
                                const removedRooms = checkInDetails?.removedRooms || [];
                                const activeRoomsTotal = activeRooms.reduce((sum, r) => sum + (r.price || 0), 0);
                                const removedRoomsTotal = removedRooms.reduce((sum, r) => sum + (r.price || 0), 0);
                                const basePriceCalc = activeRoomsTotal + removedRoomsTotal;
                                const extraRequirementsTotal = extraRequirements.reduce((sum, req) => sum + (req.price || 0), 0);
                                const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + (charge.price || 0), 0);
                                const subtotalCalc = basePriceCalc + extraRequirementsTotal + extraChargesTotal;
                                let discountAmountCalc = 0;
                                if (discount.value > 0) {
                                    if (discount.type === 'percentage') {
                                        discountAmountCalc = (subtotalCalc * discount.value) / 100;
                                    } else {
                                        discountAmountCalc = discount.value;
                                    }
                                    discountAmountCalc = Math.min(discountAmountCalc, subtotalCalc);
                                }
                                const afterDiscountCalc = Math.max(0, subtotalCalc - discountAmountCalc);
                                const taxSlabCalc = values.taxSlab || 18;
                                const taxAmountCalc = (afterDiscountCalc * taxSlabCalc) / 100;
                                const finalTotalCalc = afterDiscountCalc + taxAmountCalc;

                                // Get available payment methods
                                const usedMethods = values.paymentDetails.map(p => p.method);
                                const availableMethods = PAYMENT_METHODS.filter(m => !usedMethods.includes(m));

                                return (
                                    <Form>
                                        <div className="ckout-form-row">
                                            <div className="ckout-form-field">
                                                <label><FaUser /> Guest Name</label>
                                                <input
                                                    type="text"
                                                    className="ckout-edit-input ckout-read-only-input"
                                                    value={values.customerName || ''}
                                                    disabled
                                                />
                                            </div>
                                            <div className="ckout-form-field">
                                                <label><FaPhone /> Phone</label>
                                                <input
                                                    type="text"
                                                    className="ckout-edit-input ckout-read-only-input"
                                                    value={values.customerPhone || ''}
                                                    disabled
                                                />
                                            </div>
                                        </div>

                                        <div className="ckout-form-row">
                                            <div className="ckout-form-field">
                                                <label><FaEnvelope /> Email</label>
                                                <input
                                                    type="text"
                                                    className="ckout-edit-input ckout-read-only-input"
                                                    value={values.customerEmail || ''}
                                                    disabled
                                                />
                                            </div>
                                            <div className="ckout-form-field">
                                                <label><FaDoorOpen /> Room</label>
                                                <input
                                                    type="text"
                                                    className="ckout-edit-input ckout-read-only-input"
                                                    value={values.roomNumber || ''}
                                                    disabled
                                                />
                                            </div>
                                        </div>

                                        <div className="ckout-form-row">
                                            <div className="ckout-form-field">
                                                <label><FaCalendarAlt /> Check-in</label>
                                                <input
                                                    type="text"
                                                    className="ckout-edit-input ckout-read-only-input"
                                                    value={values.checkInDate ? new Date(values.checkInDate).toLocaleString() : ''}
                                                    disabled
                                                />
                                            </div>
                                            <div className="ckout-form-field">
                                                <label><FaCalendarAlt /> Check-out</label>
                                                <input
                                                    type="text"
                                                    className="ckout-edit-input ckout-read-only-input"
                                                    value={values.checkOutDate ? new Date(values.checkOutDate).toLocaleString() : ''}
                                                    disabled
                                                />
                                            </div>
                                        </div>

                                        {checkInDetails && (
                                            <div className="ckout-form-row">
                                                <div className="ckout-form-field ckout-form-field-full">
                                                    <label><FaDoorOpen /> Rooms & Pricing</label>
                                                    <div className="ckout-rooms-pricing">
                                                        {(checkInDetails.roomDetails || []).map((room, index) => (
                                                            <div key={index} className="ckout-room-price-row">
                                                                <div className="ckout-room-info">
                                                                    <strong>{room.roomNumber}</strong> ({room.categoryName})
                                                                    <span className="ckout-room-status-active">Active</span>
                                                                </div>
                                                                <div className="ckout-room-price-input">
                                                                    <span className="ckout-price-symbol">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        className="ckout-edit-input ckout-price-input"
                                                                        value={room.price || 0}
                                                                        onChange={(e) => handleRoomPriceChange(index, e.target.value)}
                                                                        min="0"
                                                                        step="1"
                                                                    />
                                                                </div>
                                                                <div className="ckout-room-duration">
                                                                    <small>{room.durationLabel}</small>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {(checkInDetails.removedRooms || []).map((room, index) => (
                                                            <div key={`removed-${index}`} className="ckout-room-price-row ckout-room-removed-row">
                                                                <div className="ckout-room-info">
                                                                    <strong>{room.roomNumber}</strong> ({room.categoryName})
                                                                    <span className="ckout-room-status-removed">Removed</span>
                                                                </div>
                                                                <div className="ckout-room-price-input">
                                                                    <span className="ckout-price-symbol">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        className="ckout-edit-input ckout-price-input"
                                                                        value={room.price || 0}
                                                                        onChange={(e) => handleRemovedRoomPriceChange(index, e.target.value)}
                                                                        min="0"
                                                                        step="1"
                                                                    />
                                                                </div>
                                                                <div className="ckout-room-removed-info">
                                                                    <small>Hours used: {room.hoursUsed || 0}h ({room.durationLabel})</small>
                                                                    {room.reason && <small> | Reason: {room.reason}</small>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <small className="ckout-field-hint">All room prices are editable. Removed rooms are shown for reference.</small>
                                                </div>
                                            </div>
                                        )}

                                        <div className="ckout-form-row">
                                            <div className="ckout-form-field">
                                                <label><FaList /> Extra Requirements</label>
                                                <div className="ckout-edit-requirements">
                                                    {extraRequirements.map((req, index) => (
                                                        <div key={index} className="ckout-edit-req-row">
                                                            <input
                                                                type="text"
                                                                placeholder="Description"
                                                                value={req.description || ''}
                                                                onChange={(e) => handleExtraRequirementChange(index, 'description', e.target.value)}
                                                                className="ckout-edit-req-desc"
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="Price"
                                                                value={req.price || 0}
                                                                onChange={(e) => handleExtraRequirementChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                                className="ckout-edit-req-price"
                                                            />
                                                            <button type="button" className="ckout-edit-req-remove" onClick={() => handleRemoveExtraRequirement(index)}>
                                                                <FaTimes />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button type="button" className="ckout-add-req-btn" onClick={handleAddExtraRequirement}>
                                                        <FaPlus /> Add Requirement
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="ckout-form-field">
                                                <label><FaPlusCircle /> Extra Charges</label>
                                                <div className="ckout-edit-requirements">
                                                    {extraCharges.map((charge, index) => (
                                                        <div key={index} className="ckout-edit-req-row">
                                                            <input
                                                                type="text"
                                                                placeholder="Description"
                                                                value={charge.description || ''}
                                                                onChange={(e) => handleExtraChargeChange(index, 'description', e.target.value)}
                                                                className="ckout-edit-req-desc"
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="Price"
                                                                value={charge.price || 0}
                                                                onChange={(e) => handleExtraChargeChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                                className="ckout-edit-req-price"
                                                            />
                                                            <button type="button" className="ckout-edit-req-remove" onClick={() => handleRemoveExtraCharge(index)}>
                                                                <FaTimes />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button type="button" className="ckout-add-req-btn" onClick={handleAddExtraCharge}>
                                                        <FaPlus /> Add Charge
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ckout-form-row">
                                            <div className="ckout-form-field">
                                                <label><FaPercent /> Discount</label>
                                                <div className="ckout-discount-row">
                                                    <select
                                                        className="ckout-edit-input ckout-discount-type-select"
                                                        value={discount.type}
                                                        onChange={(e) => handleDiscountChange('type', e.target.value)}
                                                    >
                                                        <option value="percentage">Percentage (%)</option>
                                                        <option value="fixed">Fixed Amount (₹)</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        placeholder={discount.type === 'percentage' ? 'Discount %' : 'Discount Amount'}
                                                        value={discount.value || 0}
                                                        onChange={(e) => handleDiscountChange('value', parseFloat(e.target.value) || 0)}
                                                        className="ckout-edit-input ckout-discount-value-input"
                                                        min="0"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Reason for discount (optional)"
                                                    value={discount.reason || ''}
                                                    onChange={(e) => handleDiscountChange('reason', e.target.value)}
                                                    className="ckout-edit-input ckout-discount-reason-input"
                                                />
                                            </div>

                                            <div className="ckout-form-field">
                                                <label><FaIdCard /> ID Proof Upload</label>
                                                <div className="ckout-file-upload-area">
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
                                                        className="ckout-upload-btn"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <FaUpload /> Upload Files (Max 10MB)
                                                    </button>
                                                    <div className="ckout-file-list">
                                                        {uploadedFiles.map((file, index) => (
                                                            <div key={index} className="ckout-file-item ckout-file-item-labeled">
                                                                <div className="ckout-file-info">
                                                                    <span>{file.fileName}</span>
                                                                    {file.isExisting ? (
                                                                        <span style={{ color: '#4caf50', fontSize: '11px' }}> (from Check-in)</span>
                                                                    ) : (
                                                                        <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                                                                    )}
                                                                </div>
                                                                <div className="ckout-file-label">
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

                                        <div className="ckout-form-row">
                                            <div className="ckout-form-field">
                                                <label><FaMoneyBillWave /> Payment Status *</label>
                                                <Field as="select" name="paymentStatus" onChange={(e) => {
                                                    handleChange(e);
                                                    if (e.target.value === 'Not Paid') {
                                                        setFieldValue('paymentDetails', []);
                                                    }
                                                }}>
                                                    <option value="Not Paid">Not Paid</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Partial Paid">Partial Paid</option>
                                                </Field>
                                                <ErrorMessage name="paymentStatus" component="div" className="ckout-error" />
                                            </div>

                                            <div className="ckout-form-field">
                                                <label>Notes (Optional)</label>
                                                <Field name="notes" as="textarea" rows="3" />
                                                <ErrorMessage name="notes" component="div" className="ckout-error" />
                                            </div>
                                        </div>

                                        {values.paymentStatus === 'Partial Paid' && (
                                            <div className="ckout-form-row">
                                                <div className="ckout-form-field">
                                                    <label><FaMoneyBillWave /> Amount Paying</label>
                                                    <Field
                                                        name="amountPaid"
                                                        type="number"
                                                        min="0"
                                                        max={finalTotalCalc}
                                                    />
                                                    <small className="ckout-field-hint">
                                                        Max: ₹{finalTotalCalc.toFixed(2)}
                                                    </small>
                                                    <ErrorMessage name="amountPaid" component="div" className="ckout-error" />
                                                </div>
                                            </div>
                                        )}

                                        {/* ===== PAYMENT DETAILS - Only show if NOT "Not Paid" ===== */}
                                        {values.paymentStatus !== 'Not Paid' && (
                                            <div className="ckout-form-row">
                                                <div className="ckout-form-field ckout-form-field-full">
                                                    <label><FaCreditCard /> Payment Details</label>
                                                    <FieldArray name="paymentDetails">
                                                        {({ push, remove, form }) => (
                                                            <div className="ckout-payment-details-edit">
                                                                {form.values.paymentDetails.map((payment, index) => {
                                                                    const usedMethods = form.values.paymentDetails
                                                                        .filter((_, idx) => idx !== index)
                                                                        .map(p => p.method);
                                                                    const availableForThis = PAYMENT_METHODS.filter(m => !usedMethods.includes(m));
                                                                    const options = [payment.method, ...availableForThis.filter(m => m !== payment.method)];

                                                                    return (
                                                                        <div key={index} className="ckout-payment-row">
                                                                            <select
                                                                                className="ckout-edit-input ckout-payment-method-select"
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
                                                                                className="ckout-edit-input ckout-payment-amount-input"
                                                                                placeholder="Amount"
                                                                                value={payment.amount || 0}
                                                                                onChange={(e) => {
                                                                                    const val = parseFloat(e.target.value) || 0;
                                                                                    if (val > finalTotalCalc) {
                                                                                        toast.warning(`Amount cannot exceed Final Total (₹${finalTotalCalc.toFixed(2)})`);
                                                                                        return;
                                                                                    }
                                                                                    const newPayments = [...form.values.paymentDetails];
                                                                                    newPayments[index].amount = val;
                                                                                    form.setFieldValue('paymentDetails', newPayments);
                                                                                }}
                                                                                min="0"
                                                                                max={finalTotalCalc}
                                                                            />
                                                                           
                                                                            <button
                                                                                type="button"
                                                                                className="ckout-remove-payment-btn"
                                                                                onClick={() => remove(index)}
                                                                                disabled={form.values.paymentDetails.length <= 1}
                                                                            >
                                                                                <FaTimes />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                                <div className="ckout-payment-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="ckout-add-payment-btn"
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
                                                                        <small className="ckout-field-hint">All payment methods are already added</small>
                                                                    )}
                                                                </div>
                                                                {form.values.paymentDetails.length > 0 && (
                                                                    <small className="ckout-field-hint">
                                                                        Total: ₹{form.values.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                                                                        {' | '}Type: {new Set(form.values.paymentDetails.map(p => p.method)).size > 1 ? 'Multiple' : (form.values.paymentDetails[0]?.method || 'Cash')}
                                                                        {form.values.paymentDetails.reduce((sum, p) => sum + (p.amount || 0), 0) > finalTotalCalc && (
                                                                            <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                                                                                ⚠️ Exceeds Final Total!
                                                                            </span>
                                                                        )}
                                                                    </small>
                                                                )}
                                                            </div>
                                                        )}
                                                    </FieldArray>
                                                </div>
                                            </div>
                                        )}

                                        {calculatedPrice && (
                                            <div className="ckout-form-row">
                                                <div className="ckout-form-field ckout-form-field-full">
                                                    <div className="ckout-price-breakdown-box">
                                                        <h4><FaCalculator /> Price Breakdown</h4>
                                                        <div className="ckout-price-breakdown-grid">
                                                            <span className="ckout-price-section-label"><strong>Active Rooms:</strong></span>
                                                            <span></span>
                                                            {calculatedPrice.activeRooms?.map((room, idx) => (
                                                                <React.Fragment key={idx}>
                                                                    <span className="ckout-room-price-label">Room {room.roomNumber}</span>
                                                                    <span className="ckout-price-val">₹{room.price.toFixed(2)}</span>
                                                                </React.Fragment>
                                                            ))}
                                                            <span className="ckout-price-total-label">Active Rooms Total:</span>
                                                            <span className="ckout-price-val ckout-price-total">
                                                                ₹{calculatedPrice.activeRoomsTotal.toFixed(2)}
                                                            </span>

                                                            {calculatedPrice.removedRooms && calculatedPrice.removedRooms.length > 0 && (
                                                                <>
                                                                    <span className="ckout-price-section-label ckout-removed-label"><strong>Removed Rooms:</strong></span>
                                                                    <span></span>
                                                                    {calculatedPrice.removedRooms.map((room, idx) => (
                                                                        <React.Fragment key={idx}>
                                                                            <span className="ckout-room-price-label ckout-removed-text">
                                                                                Room {room.roomNumber} <span className="ckout-removed-badge-sm">Removed</span>
                                                                            </span>
                                                                            <span className="ckout-price-val">₹{room.price.toFixed(2)}</span>
                                                                        </React.Fragment>
                                                                    ))}
                                                                    <span className="ckout-price-total-label ckout-removed-text">Removed Rooms Total:</span>
                                                                    <span className="ckout-price-val ckout-removed-text">
                                                                        ₹{calculatedPrice.removedRoomsTotal.toFixed(2)}
                                                                    </span>
                                                                </>
                                                            )}

                                                            {calculatedPrice.extraHoursPrice > 0 && (
                                                                <>
                                                                    <span>Extra Hours:</span>
                                                                    <span className="ckout-price-val">₹{calculatedPrice.extraHoursPrice.toFixed(2)}</span>
                                                                </>
                                                            )}

                                                            <span>Extra Requirements:</span>
                                                            <span className="ckout-price-val">₹{calculatedPrice.extraRequirementsTotal.toFixed(2)}</span>

                                                            {calculatedPrice.extraChargesTotal > 0 && (
                                                                <>
                                                                    <span>Extra Charges:</span>
                                                                    <span className="ckout-price-val">₹{calculatedPrice.extraChargesTotal.toFixed(2)}</span>
                                                                </>
                                                            )}

                                                            <hr className="ckout-price-divider" />

                                                            <span><strong>Subtotal:</strong></span>
                                                            <span className="ckout-price-val"><strong>₹{calculatedPrice.subtotal.toFixed(2)}</strong></span>

                                                            <span>Tax ({calculatedPrice.taxSlab}%):</span>
                                                            <span className="ckout-price-val">₹{calculatedPrice.taxAmount.toFixed(2)}</span>

                                                            <span><strong>Grand Total:</strong></span>
                                                            <span className="ckout-price-val"><strong>₹{(calculatedPrice.finalTotal || 0).toFixed(2)}</strong></span>

                                                            {calculatedPrice.discountAmount > 0 && (
                                                                <>
                                                                    <span>Discount:</span>
                                                                    <span className="ckout-price-val ckout-price-discount">-₹{calculatedPrice.discountAmount.toFixed(2)}</span>
                                                                </>
                                                            )}

                                                            <hr className="ckout-price-divider ckout-price-divider-thick" />

                                                            <span className="ckout-price-grand-label"><strong>Final Total:</strong></span>
                                                            <span className="ckout-price-val ckout-price-grand-value">
                                                                ₹{calculatedPrice.finalTotal.toFixed(2)}
                                                            </span>

                                                            <hr className="ckout-price-divider" />

                                                            <span>Amount Paid:</span>
                                                            <span className="ckout-price-val">₹{calculatedPrice.amountPaid.toFixed(2)}</span>

                                                            <span className="ckout-price-grand-label"><strong>Balance:</strong></span>
                                                            <span className={`ckout-price-val ckout-price-grand-value ${calculatedPrice.balanceAmount > 0 ? 'ckout-balance-due' : 'ckout-balance-clear'}`}>
                                                                ₹{calculatedPrice.balanceAmount.toFixed(2)}
                                                            </span>

                                                            {values.paymentStatus !== 'Not Paid' && values.paymentDetails && values.paymentDetails.length > 0 && (
                                                                <>
                                                                    <hr className="ckout-price-divider" />
                                                                    <span className="ckout-price-grand-label">
                                                                        <strong>Payment Type:</strong>
                                                                    </span>
                                                                    <span className="ckout-price-val">
                                                                        <strong>{calculatedPrice.paymentType || 'Cash'}</strong>
                                                                    </span>
                                                                    <span className="ckout-price-grand-label">
                                                                        <strong>Payment Details Total:</strong>
                                                                    </span>
                                                                    <span className={`ckout-price-val ${calculatedPrice.paymentDetailsTotal > calculatedPrice.finalTotal ? 'ckout-balance-due' : ''}`}>
                                                                        <strong>₹{(calculatedPrice.paymentDetailsTotal || 0).toFixed(2)}</strong>
                                                                        {calculatedPrice.paymentDetailsTotal > calculatedPrice.finalTotal && (
                                                                            <span style={{ color: '#dc3545', marginLeft: '8px', fontSize: '12px' }}>
                                                                                ⚠️ Exceeds Final Total!
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" disabled={isFormSubmitting || !selectedCheckIn}>
                                            {isFormSubmitting ? (
                                                <>
                                                    <div className="ckout-loading-spinner small"></div>
                                                    Processing...
                                                </>
                                            ) : (
                                                <><FaCheck /> Complete Check-out</>
                                            )}
                                        </button>
                                    </Form>
                                );
                            }}
                        </Formik>
                    </div>
                )}

                <div className="ckout-data-table">
                    {isLoading ? (
                        <div className="ckout-loading-container">
                            <div className="ckout-loading-spinner large"></div>
                            <p>Loading check-outs...</p>
                        </div>
                    ) : checkOuts.length === 0 ? (
                        <div className="ckout-empty-state">
                            <p>No check-outs found</p>
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
                                        <th>Final Total</th>
                                        <th>Payment</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checkOuts.map((checkOut, index) => {
                                        const key = checkOut.checkOutId || checkOut.checkOutNumber || index;
                                        const isPDFLoading = pdfLoadingStates[key] || false;
                                        const isWhatsAppLoading = whatsappLoadingStates[key] || false;
                                        const isPrintWhatsAppLoading = printWhatsappLoadingStates[key] || false;
                                        const isPrintLoading = printLoadingStates[key] || false;

                                        return (
                                            <tr
                                                key={key}
                                                className={selectedCheckOut === checkOut.checkOutId ? "ckout-selected" : ""}
                                            >
                                                <td>{checkOut.checkOutNumber}</td>
                                                <td>
                                                    <span className={`ckout-booking-type-badge ${checkOut.bookingType === 'perNight' ? 'ckout-pernight-badge' : 'ckout-simple-badge'}`}>
                                                        {checkOut.bookingType === 'perNight' ? '🌙 Night' : 'Simple'}
                                                    </span>
                                                </td>
                                                <td>{checkOut.customerName}</td>
                                                <td>
                                                    {checkOut.roomDetails?.map(r => r.roomNumber).join(', ') || checkOut.roomNumber}
                                                </td>
                                                <td>{new Date(checkOut.checkInDate).toLocaleDateString()}</td>
                                                <td>{new Date(checkOut.checkOutDate).toLocaleDateString()}</td>
                                                <td>₹{(checkOut.finalTotal || 0).toFixed(2)}</td>
                                                <td>
                                                    <span className={`ckout-status-badge ckout-status-${checkOut.paymentStatus?.toLowerCase().replace(' ', '')}`}>
                                                        {checkOut.paymentStatus}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`ckout-status-badge ckout-status-${checkOut.status?.toLowerCase()}`}>
                                                        {checkOut.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="ckout-action-buttons">
                                                        <button
                                                            className="ckout-action-btn ckout-print-btn-sm"
                                                            onClick={() => handlePrint(checkOut)}
                                                            disabled={isPrintLoading || isPrintWhatsAppLoading}
                                                            title="Print Invoice"
                                                        >
                                                            {isPrintLoading ? (
                                                                <div className="ckout-loading-spinner small"></div>
                                                            ) : (
                                                                <FaPrint />
                                                            )}
                                                        </button>
                                                        <button
                                                            className="ckout-action-btn ckout-whatsapp-btn-sm"
                                                            onClick={() => sendWhatsAppMessage(checkOut)}
                                                            disabled={isWhatsAppLoading || isPrintWhatsAppLoading}
                                                            title="Send WhatsApp"
                                                        >
                                                            {isWhatsAppLoading ? (
                                                                <div className="ckout-loading-spinner small"></div>
                                                            ) : (
                                                                <FaWhatsapp />
                                                            )}
                                                        </button>
                                                        <button
                                                            className="ckout-action-btn ckout-pdf-btn-sm"
                                                            onClick={() => generatePDF(checkOut)}
                                                            disabled={isPDFLoading || isPrintWhatsAppLoading}
                                                            title="Download PDF"
                                                        >
                                                            {isPDFLoading ? (
                                                                <div className="ckout-loading-spinner small"></div>
                                                            ) : (
                                                                <FaFilePdf />
                                                            )}
                                                        </button>
                                                        <button
                                                            className="ckout-action-btn ckout-view-btn-sm"
                                                            onClick={() => setSelectedCheckOut(checkOut.checkOutId)}
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

                            {pagination.totalPages > 1 && (
                                <div className="ckout-pagination-container">
                                    <div className="ckout-pagination-info">
                                        Showing {pagination.startIndex} to {pagination.endIndex} of {pagination.totalCheckOuts} checkouts
                                    </div>
                                    <div className="ckout-pagination-controls">
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                                            disabled={!pagination.hasPrevPage || isLoading}
                                            className="ckout-pagination-btn"
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
                                                            <button onClick={() => setPagination(prev => ({ ...prev, currentPage: 1 }))} className="ckout-pagination-btn">1</button>
                                                            {startPage > 2 && <span className="ckout-pagination-dots">...</span>}
                                                        </>
                                                    )}
                                                    {pages.map(page => (
                                                        <button
                                                            key={page}
                                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: page }))}
                                                            className={`ckout-pagination-btn ${currentPage === page ? 'ckout-active' : ''}`}
                                                        >
                                                            {page}
                                                        </button>
                                                    ))}
                                                    {endPage < totalPages && (
                                                        <>
                                                            {endPage < totalPages - 1 && <span className="ckout-pagination-dots">...</span>}
                                                            <button onClick={() => setPagination(prev => ({ ...prev, currentPage: totalPages }))} className="ckout-pagination-btn">{totalPages}</button>
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()}

                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                                            disabled={!pagination.hasNextPage || isLoading}
                                            className="ckout-pagination-btn"
                                        >
                                            Next <FaChevronRight />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {selectedCheckOut && (
                    <CheckOutModal
                        checkOut={checkOuts.find(c => c.checkOutId === selectedCheckOut)}
                        onClose={() => setSelectedCheckOut(null)}
                        onUpdate={handleUpdateCheckOut}
                        onDelete={handleDeleteCheckOut}
                        onSendWhatsApp={sendWhatsAppMessage}
                        onGeneratePDF={generatePDF}
                        onPrintAndWhatsApp={handlePrintAndWhatsApp}
                        onPrint={handlePrint}
                        isPDFGenerating={pdfLoadingStates[selectedCheckOut] || false}
                        isWhatsAppSending={whatsappLoadingStates[selectedCheckOut] || false}
                        isPrintAndWhatsAppProcessing={printWhatsappLoadingStates[selectedCheckOut] || false}
                        isPrinting={printLoadingStates[selectedCheckOut] || false}
                    />
                )}

                {checkoutForPrint && createPortal(
                    <div className="ckout-print-target" style={{ position: "absolute", left: "-9999px", top: 0, visibility: "hidden" }}>
                        <CheckOutPrint checkout={checkoutForPrint} />
                    </div>,
                    document.body
                )}
            </div>
        </Navbar>
    );
};

export default CheckOut;