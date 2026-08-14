// Navbar.jsx - UPDATED with Booking Modal
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineMenuAlt4, HiX } from "react-icons/hi";
import BookingModal from "../BookingModal/BookingModal";
import "./Navbar.scss";

const navLinks = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Gallery", path: "/gallery" },
    { name: "Rooms", path: "/room" },
    { name: "Contact", path: "/contact" },
];

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const location = useLocation();

    const isHome = location.pathname === "/";
    const closeMenu = () => setIsOpen(false);

    const handleBookNow = () => {
        setIsModalOpen(true);
        setIsOpen(false); // Close mobile menu if open
    };

    return (
        <>
            <header className={`navbar ${!isHome ? "navbar--light" : ""} ${isOpen ? "navbar--menu-open" : ""}`}>
                <div className="navbar__container">
                    <NavLink to="/" className="navbar__logo" onClick={closeMenu}>
                        <span className="navbar__logo-text">
                            Hotel<span className="navbar__logo-accent">Name</span>
                        </span>
                    </NavLink>

                    <nav className="navbar__links">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.name}
                                to={link.path}
                                className={({ isActive }) =>
                                    `navbar__link ${isActive ? "navbar__link--active" : ""}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <span>{link.name}</span>
                                        {isActive && (
                                            <motion.span
                                                layoutId="navbar-underline"
                                                className="navbar__underline"
                                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <button
                        className="navbar__cta"
                        onClick={handleBookNow}
                    >
                        Book Now
                    </button>

                    <button
                        className="navbar__hamburger"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Toggle menu"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {isOpen ? (
                                <motion.span
                                    key="close"
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <HiX size={28} />
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="menu"
                                    initial={{ rotate: 90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: -90, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <HiOutlineMenuAlt4 size={28} />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <>
                            <motion.div
                                className="navbar__overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                onClick={closeMenu}
                            />

                            <motion.div
                                className="navbar__mobile-menu"
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "tween", duration: 0.4, ease: [0.77, 0, 0.175, 1] }}
                            >
                                <nav className="navbar__mobile-links">
                                    {navLinks.map((link, i) => (
                                        <motion.div
                                            key={link.name}
                                            initial={{ opacity: 0, x: 40 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                                        >
                                            <NavLink
                                                to={link.path}
                                                onClick={closeMenu}
                                                className={({ isActive }) =>
                                                    `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""
                                                    }`
                                                }
                                            >
                                                {link.name}
                                            </NavLink>
                                        </motion.div>
                                    ))}
                                </nav>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 + navLinks.length * 0.08, duration: 0.4 }}
                                >
                                    <button
                                        onClick={handleBookNow}
                                        className="navbar__mobile-cta"
                                    >
                                        Book Now
                                    </button>
                                </motion.div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </header>

            {/* Booking Modal */}
            <BookingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};

export default Navbar;