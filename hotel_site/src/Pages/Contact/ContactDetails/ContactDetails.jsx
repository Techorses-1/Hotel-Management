// ContactDetails.jsx - UPDATED with API
import { useState } from "react";
import { toast } from "react-toastify";
import {
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaFacebookF,
    FaInstagram,
    FaTwitter,
    FaLinkedinIn,
    FaArrowRight,
} from "react-icons/fa";
import "./ContactDetails.scss";

const ContactDetails = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch('https://hotelmanagement.techorses.com/api/contact/create-contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || "Message sent successfully! We'll get back to you within 2 hours.", {
                    position: "top-center",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
                setFormData({ name: "", email: "", subject: "", message: "" });
            } else {
                toast.error(data.message || "Something went wrong. Please try again.", {
                    position: "top-center",
                    autoClose: 3000,
                });
            }
        } catch (error) {
            console.error("Contact form error:", error);
            toast.error("Network error. Please check your connection and try again.", {
                position: "top-center",
                autoClose: 3000,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="contact-details">
            <div className="contact-details__container">
                {/* LEFT COLUMN - CONTACT INFO */}
                <div className="contact-details__left">
                    <span className="contact-details__eyebrow">Contact Us</span>
                    <h2 className="contact-details__title">Let's Connect</h2>
                    <p className="contact-details__intro">
                        Have a question? We'd love to hear from you. Reach out using any
                        of the methods below.
                    </p>

                    {/* Contact Info Cards */}
                    <div className="contact-details__cards">
                        {/* Phone */}
                        <a href="tel:+919876543210" className="contact-details__card">
                            <span className="contact-details__card-icon">
                                <FaPhone />
                            </span>
                            <div className="contact-details__card-text">
                                <h3 className="contact-details__card-title">Phone</h3>
                                <p className="contact-details__card-value">
                                    +91 98765 43210
                                </p>
                            </div>
                        </a>

                        {/* Email */}
                        <a href="mailto:stay@techorses.com" className="contact-details__card">
                            <span className="contact-details__card-icon">
                                <FaEnvelope />
                            </span>
                            <div className="contact-details__card-text">
                                <h3 className="contact-details__card-title">Email</h3>
                                <p className="contact-details__card-value">
                                    stay@techorses.com
                                </p>
                            </div>
                        </a>

                        {/* Address */}
                        <a
                            href="https://maps.google.com/?q=B-224+Samanvay+Silicon+Dairy+Den+Circle+Vadodara"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-details__card"
                        >
                            <span className="contact-details__card-icon">
                                <FaMapMarkerAlt />
                            </span>
                            <div className="contact-details__card-text">
                                <h3 className="contact-details__card-title">Address</h3>
                                <p className="contact-details__card-value">
                                    B-224, Samanvay Silicon, Opp Kalyan Hotel
                                    <br />
                                    Dairy Den Circle, Sayajigunj, Vadodara, 390020
                                </p>
                            </div>
                        </a>
                    </div>

                    {/* Social Icons */}
                    <div className="contact-details__socials">
                        <a href="#" className="contact-details__social-link" aria-label="Facebook">
                            <FaFacebookF />
                        </a>
                        <a href="#" className="contact-details__social-link" aria-label="Instagram">
                            <FaInstagram />
                        </a>
                        <a href="#" className="contact-details__social-link" aria-label="Twitter">
                            <FaTwitter />
                        </a>
                        <a href="#" className="contact-details__social-link" aria-label="LinkedIn">
                            <FaLinkedinIn />
                        </a>
                    </div>
                </div>

                {/* RIGHT COLUMN - CONTACT FORM */}
                <div className="contact-details__right">
                    <form className="contact-details__form" onSubmit={handleSubmit}>
                        <div className="contact-details__form-group">
                            <label htmlFor="name" className="contact-details__label">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                disabled={isSubmitting}
                                className="contact-details__input"
                                placeholder="Your name"
                            />
                        </div>

                        <div className="contact-details__form-group">
                            <label htmlFor="email" className="contact-details__label">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                disabled={isSubmitting}
                                className="contact-details__input"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div className="contact-details__form-group">
                            <label htmlFor="subject" className="contact-details__label">
                                Subject
                            </label>
                            <input
                                type="text"
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                disabled={isSubmitting}
                                className="contact-details__input"
                                placeholder="How can we help?"
                            />
                        </div>

                        <div className="contact-details__form-group">
                            <label htmlFor="message" className="contact-details__label">
                                Message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                disabled={isSubmitting}
                                className="contact-details__textarea"
                                placeholder="Tell us more..."
                                rows="6"
                            />
                        </div>

                        <button
                            type="submit"
                            className="contact-details__submit-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="contact-details__spinner" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    Send Message <FaArrowRight />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default ContactDetails;