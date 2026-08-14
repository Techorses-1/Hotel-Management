import React from "react";
import "./CheckOutPrint.scss";
import logo from "../../assets/logo/logo.png";

const CheckOutPrint = ({ checkout }) => {
  if (!checkout) return null;

  const {
    checkOutNumber,
    checkInNumber,
    customerName,
    customerPhone,
    customerEmail,
    roomNumber,
    roomDetails,
    categoryName,
    checkInDate,
    checkOutDate,
    guestCheckOutAt,
    durationLabel,
    totalHours,
    basePrice,
    extraHoursPrice,
    extraRequirements,
    extraRequirementsTotal,
    extraCharges,
    extraChargesTotal,
    subtotal,
    taxSlab,
    taxAmount,
    grandTotal,
    discountAmount,
    discount,
    finalTotal,
    amountPaid,
    advancePaid,
    balanceAmount,
    paymentStatus,
    notes,
    idProofs,
    status,
    createdAt
  } = checkout;

  // ✅ Get active and removed rooms from roomDetails
  const activeRooms = (roomDetails || []).filter(room => room.isRemoved !== true);
  const removedRooms = (roomDetails || []).filter(room => room.isRemoved === true);

  // Terms and Conditions for Hotel
  const termsAndConditions = `
Damages to room property will be charged.<br />
Lost room keys will be charged ₹200.<br />
Smoking in rooms is strictly prohibited.<br />
Management reserves all rights for final decision.
    `;

  const declaration = `
We declare that this receipt shows the actual charges for the stay and all particulars are true and correct.
    `;

  // Format duration in "X Day & X Hours" format
  const formatDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'N/A';

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days === 0) {
      return `${hours} Hours`;
    } else if (hours === 0) {
      return `${days} Day${days > 1 ? 's' : ''}`;
    } else {
      return `${days} Day${days > 1 ? 's' : ''} & ${hours} Hours`;
    }
  };

  // Number to words conversion
  const numberToWords = (num) => {
    if (num === 0) return 'Zero Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
      'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    let integerPart = Math.floor(num);
    let words = '';

    if (integerPart >= 10000000) {
      words += numberToWords(Math.floor(integerPart / 10000000)) + ' Crore ';
      integerPart %= 10000000;
    }

    if (integerPart >= 100000) {
      words += numberToWords(Math.floor(integerPart / 100000)) + ' Lakh ';
      integerPart %= 100000;
    }

    if (integerPart >= 1000) {
      words += numberToWords(Math.floor(integerPart / 1000)) + ' Thousand ';
      integerPart %= 1000;
    }

    if (integerPart >= 100) {
      words += numberToWords(Math.floor(integerPart / 100)) + ' Hundred ';
      integerPart %= 100;
    }

    if (integerPart > 0) {
      if (words !== '') words += ' ';

      if (integerPart < 20) {
        words += ones[integerPart];
      } else {
        words += tens[Math.floor(integerPart / 10)];
        if (integerPart % 10 > 0) {
          words += ' ' + ones[integerPart % 10];
        }
      }
    }

    const decimalPart = Math.round((num - Math.floor(num)) * 100);
    if (decimalPart > 0) {
      if (words !== '') words += ' and ';
      if (decimalPart < 20) {
        words += ones[decimalPart] + ' Paise';
      } else {
        words += tens[Math.floor(decimalPart / 10)];
        if (decimalPart % 10 > 0) {
          words += ' ' + ones[decimalPart % 10] + ' Paise';
        }
      }
    }

    return words || 'Zero Only';
  };

  // Safe number formatting
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return "₹0.00";
    return `₹${Number(value).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateOnly = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Get all room numbers
  const getAllRoomNumbers = () => {
    if (roomDetails && roomDetails.length > 0) {
      return roomDetails.map(room => room.roomNumber).join(', ');
    }
    return roomNumber || 'N/A';
  };

  // Get payment status badge class
  const getPaymentStatusClass = () => {
    if (!paymentStatus) return 'payment-notpaid';
    const status = paymentStatus.toLowerCase().replace(' ', '');
    return `payment-${status}`;
  };

  // Get guest check-out time (IST)
  const getGuestCheckOutTime = () => {
    if (guestCheckOutAt) {
      return formatDate(guestCheckOutAt);
    }
    return formatDate(checkOutDate);
  };

  return (
    <div id="checkout-pdf">
      <div className="invoice-container">

        {/* Top Logo and Address */}
        <div className="invoice-header">
          <div className="logo-address-center">
            <div className="invoice-logo">
              <img src={logo} alt="Company Logo" />
            </div>
            <div className="company-address">
              <div className="address-details">
                <p>Shop no 4, Siddharth Complex, RC Dutt Rd, Aradhana Society,</p>
                <p>Vishwas Colony, Alkapuri, Vadodara, Gujarat 390023</p>
              </div>
            </div>
          </div>
        </div>

        {/* Check-out Receipt Heading */}
        <div className="tax-invoice-heading">
          <h1>CHECK-OUT RECEIPT</h1>
        </div>

        {/* Guest & Booking Details */}
        <div className="invoice-details-section">
          <div className="customer-info">
            <h3>Guest Details</h3>
            <table className="details-table">
              <tbody>
                <tr>
                  <td>Guest Name:</td>
                  <td>{customerName || "N/A"}</td>
                </tr>
                {customerPhone && (
                  <tr>
                    <td>Phone:</td>
                    <td>{customerPhone}</td>
                  </tr>
                )}
                {customerEmail && (
                  <tr>
                    <td>Email:</td>
                    <td>{customerEmail}</td>
                  </tr>
                )}
                {/* ✅ Guest Check-out Time */}
                <tr>
                  <td>Guest Check-out:</td>
                  <td>{getGuestCheckOutTime()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="invoice-info">
            <h3>Booking Details</h3>
            <table className="details-table">
              <tbody>
                <tr>
                  <td>Check-out #:</td>
                  <td>{checkOutNumber || "N/A"}</td>
                </tr>
                <tr>
                  <td>Check-in #:</td>
                  <td>{checkInNumber || "N/A"}</td>
                </tr>
                {/* ✅ All room numbers */}
                <tr>
                  <td>Room(s):</td>
                  <td>{getAllRoomNumbers()}</td>
                </tr>
                <tr>
                  <td>Payment:</td>
                  <td>
                    <span className={`status-badge ${getPaymentStatusClass()}`}>
                      {paymentStatus || 'Not Paid'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Stay Duration */}
        <div className="stay-duration-section">
          <h3>Stay Duration</h3>
          <div className="duration-grid">
            <div className="duration-item">
              <span className="duration-label">Check-in:</span>
              <span className="duration-value">{formatDate(checkInDate)}</span>
            </div>
            <div className="duration-item">
              <span className="duration-label">Check-out:</span>
              <span className="duration-value">{formatDate(checkOutDate)}</span>
            </div>
            <div className="duration-item">
              <span className="duration-label">Duration:</span>
              <span className="duration-value">{formatDuration(checkInDate, checkOutDate)}</span>
            </div>
          </div>
        </div>

        {/* Room Details Table - Active Rooms ONLY */}
        {activeRooms.length > 0 && (
          <div className="items-section">
            <h3>Room Details</h3>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Room</th>
                  <th>Category</th>
                  <th>Timing</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {activeRooms.map((room, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{room.roomNumber}</strong>
                    </td>
                    <td>{room.categoryName || categoryName || 'N/A'}</td>
                    <td>
                      <strong>{room.durationLabel || formatDuration(room.checkInDate, room.checkOutDate)}</strong>
                      <div className="item-detail">Check-in: {formatDateOnly(room.checkInDate || checkInDate)}</div>
                      <div className="item-detail">Check-out: {formatDateOnly(room.checkOutDate || checkOutDate)}</div>
                    </td>
                    <td>{formatCurrency(room.price || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ Used Rooms Section - Removed Rooms from roomDetails */}
        {removedRooms.length > 0 && (
          <div className="items-section">
            <h3>Used Rooms (Removed/Changed)</h3>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Room</th>
                  <th>Category</th>
                  <th>Used For</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {removedRooms.map((room, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{room.roomNumber}</strong>
                      {room.reason && (
                        <div className="item-detail" style={{ color: '#e65100', fontSize: '9px' }}>
                          {room.reason}
                        </div>
                      )}
                    </td>
                    <td>{room.categoryName || 'N/A'}</td>
                    <td>
                      <strong>{room.durationLabel || formatDuration(room.checkInDate, room.checkOutDate)}</strong>
                      {room.hoursUsed && (
                        <div className="item-detail">{room.hoursUsed} hours used</div>
                      )}
                    </td>
                    <td>{formatCurrency(room.price || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Extra Requirements */}
        {extraRequirements && extraRequirements.length > 0 && (
          <div className="items-section">
            <h3>Extra Requirements</h3>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {extraRequirements.map((req, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{req.description || 'Extra Requirement'}</strong>
                    </td>
                    <td>{formatCurrency(req.price || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Extra Charges */}
        {extraCharges && extraCharges.length > 0 && (
          <div className="items-section">
            <h3>Extra Charges</h3>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {extraCharges.map((charge, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{charge.description || 'Extra Charge'}</strong>
                    </td>
                    <td>{formatCurrency(charge.price || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Section */}
        <div className="totals-section">
          <div className="amount-details">
            <table>
              <tbody>
                <tr>
                  <td>Subtotal:</td>
                  <td>{formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td>Tax ({taxSlab}%):</td>
                  <td>{formatCurrency(taxAmount)}</td>
                </tr>
                <tr className="grand-total">
                  <td>Grand Total:</td>
                  <td>{formatCurrency(grandTotal)}</td>
                </tr>
                {discountAmount > 0 && (
                  <tr className="discount-row">
                    <td>Discount ({discount?.type === 'percentage' ? `${discount?.value}%` : 'Fixed'}):</td>
                    <td>{formatCurrency(discountAmount)}</td>
                  </tr>
                )}
                {discountAmount > 0 && discount?.reason && (
                  <tr className="discount-reason-row">
                    <td colSpan="2">
                      <span className="discount-reason">Reason: {discount.reason}</span>
                    </td>
                  </tr>
                )}

                <tr className="final-total">
                  <td><strong>Grand Total:</strong></td>
                  <td><strong>{formatCurrency(finalTotal)}</strong></td>
                </tr>

                {/* ✅ Only show Amount Paid & Remaining Amount if NOT "Paid" */}
                {paymentStatus !== 'Paid' && (
                  <>
                    <tr className="payment-row">
                      <td>Amount Paid:</td>
                      <td>{formatCurrency(amountPaid || 0)}</td>
                    </tr>
                    {advancePaid > 0 && (
                      <tr className="payment-row">
                        <td>Advance Paid:</td>
                        <td>{formatCurrency(advancePaid)}</td>
                      </tr>
                    )}
                    <tr className="balance-row">
                      <td><strong>Remaining Amount:</strong></td>
                      <td>
                        <strong className={balanceAmount > 0 ? 'balance-due' : 'balance-clear'}>
                          {formatCurrency(balanceAmount || 0)}
                        </strong>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="amount-in-words">
          <p><strong>Amount in Words:</strong> {numberToWords(finalTotal)} Only</p>
        </div>

        {/* ID Proofs */}
        {idProofs && idProofs.length > 0 && (
          <div className="id-proofs-section">
            <h3>ID Proofs Submitted</h3>
            <div className="id-proofs-list">
              {idProofs.map((proof, index) => (
                <span key={index} className="id-proof-tag">
                  {proof.label || 'Other'}: {proof.fileName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="notes-section">
            <h3>Notes</h3>
            <p>{notes}</p>
          </div>
        )}

        {/* Declaration and Terms Section */}
        <div className="declaration-terms-section">
          <div className="declaration-section">
            <h3>Declaration</h3>
            <p>{declaration}</p>
          </div>
          <div className="terms-section">
            <h3>Terms & Conditions</h3>
            <p dangerouslySetInnerHTML={{ __html: termsAndConditions }}></p>
          </div>
        </div>

        {/* Footer Section */}
        <div className="invoice-footer">
          <div className="thank-you">
            <p>Thank you for staying with us!</p>
            <p className="welcome-again">We hope to serve you again soon.</p>
          </div>
          <div className="signature">
            <p>Authorized Signature</p>
            <div className="signature-line"></div>
            <p className="signature-date">{formatDateOnly(new Date())}</p>
          </div>
          <div className="developer-note">
            <p>
              Developed by <a href="https://techorses.com" target="_blank" rel="noopener noreferrer">Techorses</a>
            </p>
            <p className="generated-time">Generated on: {formatDate(new Date())}</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CheckOutPrint;