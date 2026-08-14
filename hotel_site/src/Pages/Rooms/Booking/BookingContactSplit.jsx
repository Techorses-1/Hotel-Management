// BookingContactSplit.jsx - UPDATED with Book Now button
import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaPhoneAlt, FaArrowRight } from "react-icons/fa";
import BookingModal from "../../../Components/BookingModal/BookingModal";
import "./BookingContactSplit.scss";

gsap.registerPlugin(ScrollTrigger);

const BookingContactSplit = () => {
    const sectionRef = useRef(null);
    const leftRef = useRef(null);
    const rightRef = useRef(null);
    const phoneIconRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                leftRef.current,
                { x: -50, opacity: 0 },
                {
                    x: 0,
                    opacity: 1,
                    duration: 0.9,
                    ease: "power3.out",
                    scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
                }
            );

            gsap.fromTo(
                rightRef.current,
                { x: 50, opacity: 0 },
                {
                    x: 0,
                    opacity: 1,
                    duration: 0.9,
                    ease: "power3.out",
                    delay: 0.15,
                    scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
                }
            );

            // Phone "ring" shake loop
            gsap.to(phoneIconRef.current, {
                rotation: 15,
                duration: 0.15,
                ease: "power1.inOut",
                yoyo: true,
                repeat: 5,
                repeatDelay: 2.5,
                transformOrigin: "top center",
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <>
            <section className="booking-contact-split" ref={sectionRef}>
                {/* Left - Call */}
                <div className="booking-contact-split__half booking-contact-split__half--call">
                    <div className="booking-contact-split__content" ref={leftRef}>
                        <span className="booking-contact-split__icon-wrap">
                            <FaPhoneAlt
                                className="booking-contact-split__icon"
                                ref={phoneIconRef}
                            />
                        </span>
                        <h3 className="booking-contact-split__title">Prefer to Talk?</h3>
                        <p className="booking-contact-split__desc">
                            Speak directly with our team - we're happy to help you find
                            the right room and answer anything on your mind.
                        </p>
                        <a href="tel:+919876543210" className="booking-contact-split__btn">
                            <FaPhoneAlt /> Call Now
                        </a>
                    </div>
                </div>

                {/* Right - Book Now */}
                <div className="booking-contact-split__half booking-contact-split__half--book">
                    <div className="booking-contact-split__content" ref={rightRef}>
                        <span className="booking-contact-split__icon-wrap booking-contact-split__icon-wrap--book">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M8 2v4" />
                                <path d="M16 2v4" />
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M3 10h18" />
                                <path d="M8 14h.01" />
                                <path d="M12 14h.01" />
                                <path d="M16 14h.01" />
                                <path d="M8 18h.01" />
                                <path d="M12 18h.01" />
                                <path d="M16 18h.01" />
                            </svg>
                        </span>
                        <h3 className="booking-contact-split__title booking-contact-split__title--book">
                            Ready to Book?
                        </h3>
                        <p className="booking-contact-split__desc booking-contact-split__desc--book">
                            Secure your stay in just a few clicks. Fill in your details
                            and we'll confirm your booking right away.
                        </p>
                        <button 
                            className="booking-contact-split__btn booking-contact-split__btn--book"
                            onClick={() => setIsModalOpen(true)}
                        >
                            Book Now <FaArrowRight />
                        </button>
                    </div>
                </div>
            </section>

            {/* Booking Modal */}
            <BookingModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
        </>
    );
};

export default BookingContactSplit;