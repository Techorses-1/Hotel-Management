// Components/BookingModal/BookingModal.jsx - UPDATED with API
import { useEffect, useRef } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { FaTimes, FaArrowRight } from "react-icons/fa";
import "./BookingModal.scss";

const BookingModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    // Close on outside click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const formik = useFormik({
        initialValues: {
            name: "",
            phone: "",
            email: "",
        },
        validationSchema: Yup.object({
            name: Yup.string()
                .required("Name is required")
                .min(2, "Name must be at least 2 characters")
                .max(50, "Name must be less than 50 characters"),
            phone: Yup.string()
                .required("Phone number is required")
                .min(10, "Phone number must be exactly 10 digits")
                .max(10, "Phone number must be exactly 10 digits")
                .matches(/^[0-9]+$/, "Phone number must contain only digits"),
            email: Yup.string()
                .required("Email address is required") // ✅ Changed to required
                .email("Invalid email address"),
        }),
        onSubmit: async (values, { setSubmitting, resetForm }) => {
            try {
                // ✅ API Call to your backend
                const response = await fetch('https://hotelmanagement.techorses.com/api/website-booking/create-website-booking', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(values),
                });

                const data = await response.json();

                if (data.success) {
                    toast.success(data.message || "Booking request submitted! We'll contact you shortly.", {
                        position: "top-center",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                    });

                    resetForm();
                    setTimeout(onClose, 1500);
                } else {
                    // ✅ Handle duplicate booking error
                    if (data.existingBooking) {
                        toast.error(`You already have a booking (${data.existingBooking.bookingNumber}) from ${new Date(data.existingBooking.createdAt).toLocaleDateString()}. Please wait 24 hours.`, {
                            position: "top-center",
                            autoClose: 5000,
                        });
                    } else {
                        toast.error(data.message || "Something went wrong. Please try again.", {
                            position: "top-center",
                            autoClose: 3000,
                        });
                    }
                }
            } catch (error) {
                console.error("Booking error:", error);
                toast.error("Network error. Please check your connection and try again.", {
                    position: "top-center",
                    autoClose: 3000,
                });
            } finally {
                setSubmitting(false);
            }
        },
    });

    if (!isOpen) return null;

    return (
        <div className="booking-modal__overlay" onClick={handleOverlayClick}>
            <div className="booking-modal" ref={modalRef}>
                <button className="booking-modal__close" onClick={onClose}>
                    <FaTimes />
                </button>

                <div className="booking-modal__header">
                    <span className="booking-modal__eyebrow">Book Now</span>
                    <h2 className="booking-modal__title">Plan Your Stay</h2>
                    <p className="booking-modal__subtext">
                        Fill in your details and we'll get back to you within 2 hours.
                    </p>
                </div>

                <form className="booking-modal__form" onSubmit={formik.handleSubmit}>
                    {/* Name */}
                    <div className="booking-modal__form-group">
                        <label htmlFor="name" className="booking-modal__label">
                            Full Name <span className="booking-modal__required">*</span>
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            placeholder="John Doe"
                            className={`booking-modal__input ${
                                formik.touched.name && formik.errors.name
                                    ? "booking-modal__input--error"
                                    : ""
                            }`}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            value={formik.values.name}
                        />
                        {formik.touched.name && formik.errors.name && (
                            <span className="booking-modal__error">{formik.errors.name}</span>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="booking-modal__form-group">
                        <label htmlFor="phone" className="booking-modal__label">
                            Phone Number <span className="booking-modal__required">*</span>
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="9876543210"
                            className={`booking-modal__input ${
                                formik.touched.phone && formik.errors.phone
                                    ? "booking-modal__input--error"
                                    : ""
                            }`}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            value={formik.values.phone}
                        />
                        {formik.touched.phone && formik.errors.phone && (
                            <span className="booking-modal__error">{formik.errors.phone}</span>
                        )}
                    </div>

                    {/* Email - NOW REQUIRED */}
                    <div className="booking-modal__form-group">
                        <label htmlFor="email" className="booking-modal__label">
                            Email Address <span className="booking-modal__required">*</span>
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="john@example.com"
                            className={`booking-modal__input ${
                                formik.touched.email && formik.errors.email
                                    ? "booking-modal__input--error"
                                    : ""
                            }`}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            value={formik.values.email}
                        />
                        {formik.touched.email && formik.errors.email && (
                            <span className="booking-modal__error">{formik.errors.email}</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="booking-modal__submit"
                        disabled={formik.isSubmitting}
                    >
                        {formik.isSubmitting ? (
                            <>
                                <span className="booking-modal__spinner" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Booking <FaArrowRight />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BookingModal;