// HomeAbout.jsx - UPDATED with mobile/tablet immediate load
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaAward, FaUsers, FaStar } from "react-icons/fa";
import "./HomeAbout.scss";
import { Link } from "react-router-dom"; // Import Link


const ABOUT_IMAGE =
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1600&auto=format&fit=crop";

const stats = [
    { icon: <FaAward />, value: "12+", label: "Years of Excellence" },
    { icon: <FaUsers />, value: "500+", label: "Happy Guests" },
    { icon: <FaStar />, value: "4.9", label: "Average Rating" },
];

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (delay = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] },
    }),
};

// Helper hook for media query
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener("resize", listener);
        return () => window.removeEventListener("resize", listener);
    }, [matches, query]);

    return matches;
};

const HomeAbout = () => {
    const sectionRef = useRef(null);
    const isMobileOrTablet = useMediaQuery('(max-width: 1024px)');

    // For mobile/tablet - elements are always visible (no animation)
    const imageAnimation = isMobileOrTablet
        ? { initial: { opacity: 1, x: 0 }, whileInView: { opacity: 1, x: 0 }, transition: {} }
        : {
            initial: { opacity: 0, x: -60 },
            whileInView: { opacity: 1, x: 0 },
            transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] },
            viewport: { once: true, amount: 0.3 }
        };

    const textAnimation = isMobileOrTablet
        ? { initial: { opacity: 1, x: 0 }, whileInView: { opacity: 1, x: 0 }, transition: {} }
        : {
            initial: { opacity: 0, x: 60 },
            whileInView: { opacity: 1, x: 0 },
            transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] },
            viewport: { once: true, amount: 0.3 }
        };

    const statAnimation = isMobileOrTablet
        ? { initial: "visible", whileInView: "visible" }
        : { initial: "hidden", whileInView: "visible", viewport: { once: true, amount: 0.4 } };

    return (
        <section className="home-about" ref={sectionRef}>
            <div className="home-about__container">
                {/* Image Side */}
                <motion.div
                    className="home-about__image-col"
                    {...imageAnimation}
                >
                    <div className="home-about__image-wrap">
                        <img
                            src={ABOUT_IMAGE}
                            alt="Hotel lobby interior"
                            className="home-about__image"
                        />
                    </div>

                    {/* Floating Stat Cards */}
                    <div className="home-about__stats">
                        {stats.map((stat, i) => (
                            <motion.div
                                className="home-about__stat-card"
                                key={stat.label}
                                custom={0.3 + i * 0.15}
                                variants={fadeUp}
                                {...statAnimation}
                            >
                                <span className="home-about__stat-icon">{stat.icon}</span>
                                <div className="home-about__stat-text">
                                    <span className="home-about__stat-value">{stat.value}</span>
                                    <span className="home-about__stat-label">{stat.label}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Text Side */}
                <motion.div
                    className="home-about__text-col"
                    {...textAnimation}
                >
                    <span className="home-about__eyebrow">About Us</span>
                    <h2 className="home-about__title">
                        A Place Built On <span>Care</span>
                    </h2>
                    <p className="home-about__desc">
                        Every corner of our hotel is shaped around one idea - that
                        comfort should feel effortless. From the warmth of our staff
                        to the quiet details in every room, we've spent over a decade
                        perfecting what it means to feel truly at home, away from home.
                    </p>
                    <p className="home-about__desc">
                        We believe hospitality isn't just a service, it's a feeling
                        guests carry with them long after they've checked out.
                    </p>
                    <Link to="/about" className="home-about__btn-link">
                        <button className="home-about__btn">Learn More</button>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};

export default HomeAbout;