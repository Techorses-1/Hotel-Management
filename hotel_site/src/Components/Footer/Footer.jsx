// Footer.jsx - UPDATED with Newsletter API
import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import {
    FaFacebookF,
    FaInstagram,
    FaTwitter,
    FaLinkedinIn,
    FaMapMarkerAlt,
    FaPhoneAlt,
    FaEnvelope,
    FaArrowRight,
} from "react-icons/fa";
import BookingModal from "../BookingModal/BookingModal";
import "./Footer.scss";

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
    const footerRef = useRef(null);
    const [email, setEmail] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                ".footer__fade-in",
                { y: 30, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: "power3.out",
                    stagger: 0.1,
                    scrollTrigger: {
                        trigger: footerRef.current,
                        start: "top 85%",
                    },
                }
            );
        }, footerRef);

        return () => ctx.revert();
    }, []);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        
        if (!email) {
            toast.error("Please enter your email address.", {
                position: "top-center",
                autoClose: 3000,
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('https://hotel-management-xkim.onrender.com/newsletter/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || "Successfully subscribed to our newsletter! 🎉", {
                    position: "top-center",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
                setEmail("");
            } else {
                toast.error(data.message || "Something went wrong. Please try again.", {
                    position: "top-center",
                    autoClose: 3000,
                });
            }
        } catch (error) {
            console.error("Newsletter subscription error:", error);
            toast.error("Network error. Please check your connection and try again.", {
                position: "top-center",
                autoClose: 3000,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <footer className="footer" ref={footerRef}>
                {/* Giant faded background text */}
                <span className="footer__bg-text" aria-hidden="true">
                    Techorses
                </span>

                <div className="footer__container">
                    {/* Top CTA strip */}
                    <div className="footer__cta-strip footer__fade-in">
                        <h2 className="footer__cta-title">
                            Let's Make Your Next Stay Unforgettable
                        </h2>
                        <button 
                            className="footer__cta-btn"
                            onClick={() => setIsModalOpen(true)}
                        >
                            Book Now <FaArrowRight />
                        </button>
                    </div>

                    {/* Main columns */}
                    <div className="footer__columns">
                        <div className="footer__col footer__fade-in">
                            <span className="footer__logo">
                                <span className="footer__logo-accent">Techorses</span>
                            </span>
                            <p className="footer__tagline">
                                A quiet retreat built around comfort, care, and the details
                                that make a stay feel personal.
                            </p>
                            <div className="footer__socials">
                                <a href="#" className="footer__social-icon" aria-label="Facebook">
                                    <FaFacebookF />
                                </a>
                                <a href="#" className="footer__social-icon" aria-label="Instagram">
                                    <FaInstagram />
                                </a>
                                <a href="#" className="footer__social-icon" aria-label="Twitter">
                                    <FaTwitter />
                                </a>
                                <a href="#" className="footer__social-icon" aria-label="LinkedIn">
                                    <FaLinkedinIn />
                                </a>
                            </div>
                        </div>

                        <div className="footer__col footer__fade-in">
                            <h3 className="footer__col-title">Quick Links</h3>
                            <ul className="footer__links">
                                <li>
                                    <NavLink to="/" className={({ isActive }) => isActive ? "footer__link-active" : ""}>
                                        Home
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/about" className={({ isActive }) => isActive ? "footer__link-active" : ""}>
                                        About
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/gallery" className={({ isActive }) => isActive ? "footer__link-active" : ""}>
                                        Gallery
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/room" className={({ isActive }) => isActive ? "footer__link-active" : ""}>
                                        Rooms
                                    </NavLink>
                                </li>
                                <li>
                                    <NavLink to="/contact" className={({ isActive }) => isActive ? "footer__link-active" : ""}>
                                        Contact
                                    </NavLink>
                                </li>
                            </ul>
                        </div>

                        <div className="footer__col footer__fade-in">
                            <h3 className="footer__col-title">Contact</h3>
                            <ul className="footer__contact-list">
                                <li className="footer__contact-item">
                                    <a 
                                        href="https://maps.google.com/?q=B-224+Samanvay+Silicon+Opp+Kalyan+Hotel+Dairy+Den+Circle+Sayajigunj+Vadodara+390020" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="footer__contact-link"
                                    >
                                        <FaMapMarkerAlt />
                                        <span>B-224, Samanvay Silicon, Opp Kalyan Hotel, Dairy Den Circle, Sayajigunj, Vadodara, 390020</span>
                                    </a>
                                </li>
                                <li className="footer__contact-item">
                                    <a href="tel:+919876543210" className="footer__contact-link">
                                        <FaPhoneAlt />
                                        <span>+91 98765 43210</span>
                                    </a>
                                </li>
                                <li className="footer__contact-item">
                                    <a href="mailto:stay@techorses.com" className="footer__contact-link">
                                        <FaEnvelope />
                                        <span>stay@techorses.com</span>
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div className="footer__col footer__fade-in">
                            <h3 className="footer__col-title">Stay Updated</h3>
                            <p className="footer__newsletter-text">
                                Get exclusive offers and updates straight to your inbox.
                            </p>
                            <form className="footer__newsletter" onSubmit={handleSubscribe}>
                                <input
                                    type="email"
                                    placeholder="Your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                    className="footer__newsletter-input"
                                />
                                <button 
                                    type="submit" 
                                    className="footer__newsletter-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="footer__spinner" />
                                    ) : (
                                        <FaArrowRight />
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="footer__divider" />

                    {/* Bottom bar */}
                    <div className="footer__bottom">
                        <p className="footer__copyright">
                            © {new Date().getFullYear()} Techorses. All rights reserved.
                        </p>
                        <div className="footer__bottom-links">
                            <span className="footer__design-credit">
                                Design & Developed By{" "}
                                <a
                                    href="https://techorses.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Techorses
                                </a>
                            </span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Booking Modal */}
            <BookingModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
        </>
    );
};

export default Footer;