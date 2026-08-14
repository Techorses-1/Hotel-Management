// FloatingContactDock.jsx - UPDATED with Book Now
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPhoneAlt, FaTimes, FaCommentDots, FaArrowRight } from "react-icons/fa";
import BookingModal from "../../../Components/BookingModal/BookingModal";
import "./FloatingContactDock.scss";

const FloatingContactDock = () => {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Appears after scrolling past roughly one viewport height
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBookNow = () => {
    setExpanded(false);
    setIsModalOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            className="floating-contact-dock"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AnimatePresence mode="wait">
              {expanded ? (
                <motion.div
                  key="expanded"
                  className="floating-contact-dock__panel"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    className="floating-contact-dock__close"
                    onClick={() => setExpanded(false)}
                    aria-label="Close"
                  >
                    <FaTimes />
                  </button>

                  <p className="floating-contact-dock__panel-title">
                    Need help booking?
                  </p>
                  <p className="floating-contact-dock__panel-subtext">
                    Reach us instantly - we usually reply within minutes.
                  </p>

                  <div className="floating-contact-dock__actions">
                    <a  
                      href="tel:+919876543210"
                      className="floating-contact-dock__action floating-contact-dock__action--call"
                    >
                      <FaPhoneAlt /> Call Us
                    </a>
                    <button
                      className="floating-contact-dock__action floating-contact-dock__action--book"
                      onClick={handleBookNow}
                    >
                      <FaArrowRight /> Book Now
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="collapsed"
                  className="floating-contact-dock__toggle"
                  onClick={() => setExpanded(true)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="floating-contact-dock__pulse" />
                  <FaCommentDots />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Modal */}
      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default FloatingContactDock;