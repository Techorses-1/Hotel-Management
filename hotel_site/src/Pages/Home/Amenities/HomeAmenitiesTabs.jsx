// HomeAmenitiesTabs.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FaSwimmingPool,
    FaSpa,
    FaDumbbell,
    FaUtensils,
} from "react-icons/fa";
import "./HomeAmenitiesTabs.scss";

const amenities = [
    {
        id: "pool",
        name: "Swimming Pool",
        icon: <FaSwimmingPool />,
        desc: "A heated outdoor pool open year-round, surrounded by private loungers and quiet garden views - perfect for a slow morning swim or an evening under the sky.",
        image:
            "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1400&auto=format&fit=crop",
    },
    {
        id: "spa",
        name: "Spa & Wellness",
        icon: <FaSpa />,
        desc: "Full-service spa offering massages, facials, and steam therapy - designed as a quiet retreat within your stay, away from the noise of travel.",
        image:
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1400&auto=format&fit=crop",
    },
    {
        id: "gym",
        name: "Fitness Center",
        icon: <FaDumbbell />,
        desc: "A fully equipped 24-hour gym with modern equipment and natural light, so your routine never has to pause while you're away from home.",
        image:
            "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1400&auto=format&fit=crop",
    },
    {
        id: "dining",
        name: "Fine Dining",
        icon: <FaUtensils />,
        desc: "An in-house restaurant serving seasonal menus crafted by our chefs, alongside a curated wine list - all just an elevator ride from your room.",
        image:
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format&fit=crop",
    },
];

const HomeAmenitiesTabs = () => {
    const [activeId, setActiveId] = useState(amenities[0].id);
    const active = amenities.find((a) => a.id === activeId);

    return (
        <section className="home-amenities-tabs">
            <div className="home-amenities-tabs__container">
                <div className="home-amenities-tabs__header">
                    <span className="home-amenities-tabs__eyebrow">Amenities</span>
                    <h2 className="home-amenities-tabs__title">
                        Explore What Awaits You
                    </h2>
                </div>

                <div className="home-amenities-tabs__content">
                    {/* Tab List */}
                    <div className="home-amenities-tabs__list">
                        {amenities.map((item) => (
                            <button
                                key={item.id}
                                className={`home-amenities-tabs__tab ${activeId === item.id ? "home-amenities-tabs__tab--active" : ""
                                    }`}
                                onClick={() => setActiveId(item.id)}
                            >
                                <span className="home-amenities-tabs__tab-icon">
                                    {item.icon}
                                </span>
                                <span className="home-amenities-tabs__tab-name">
                                    {item.name}
                                </span>
                                {activeId === item.id && (
                                    <motion.span
                                        layoutId="tab-indicator"
                                        className="home-amenities-tabs__tab-indicator"
                                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Image + Description */}
                    <div className="home-amenities-tabs__display">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={active.id}
                                className="home-amenities-tabs__panel"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <div className="home-amenities-tabs__image-wrap">
                                    <img
                                        src={active.image}
                                        alt={active.name}
                                        className="home-amenities-tabs__image"
                                    />
                                </div>
                                <h3 className="home-amenities-tabs__panel-title">
                                    {active.name}
                                </h3>
                                <p className="home-amenities-tabs__panel-desc">
                                    {active.desc}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HomeAmenitiesTabs;