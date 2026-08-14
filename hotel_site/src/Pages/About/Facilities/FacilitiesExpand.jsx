// FacilitiesExpand.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import {
    FaSwimmingPool,
    FaSpa,
    FaDumbbell,
    FaUtensils,
    FaCocktail,
    FaConciergeBell,
} from "react-icons/fa";
import "./FacilitiesExpand.scss";

const facilities = [
    {
        id: "pool",
        name: "Swimming Pool",
        icon: <FaSwimmingPool />,
        desc: "A heated pool open year-round, framed by private loungers and quiet garden views.",
        image:
            "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1200&auto=format&fit=crop",
    },
    {
        id: "spa",
        name: "Spa & Wellness",
        icon: <FaSpa />,
        desc: "Full-service spa offering massages, facials, and steam therapy for total relaxation.",
        image:
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200&auto=format&fit=crop",
    },
    {
        id: "gym",
        name: "Fitness Center",
        icon: <FaDumbbell />,
        desc: "A fully equipped 24-hour gym with modern equipment and natural light.",
        image:
            "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop",
    },
    {
        id: "dining",
        name: "Fine Dining",
        icon: <FaUtensils />,
        desc: "Seasonal menus crafted by our chefs alongside a curated wine list.",
        image:
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1200&auto=format&fit=crop",
    },
    {
        id: "bar",
        name: "Bar & Lounge",
        icon: <FaCocktail />,
        desc: "Craft cocktails and a relaxed lounge atmosphere, open late into the evening.",
        image:
            "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1200&auto=format&fit=crop",
    },
    {
        id: "service",
        name: "Room Service",
        icon: <FaConciergeBell />,
        desc: "Available 24/7 — whatever you need, whenever you need it.",
        image:
            "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200&auto=format&fit=crop",
    },
];

const FacilitiesExpand = () => {
    const [activeId, setActiveId] = useState(facilities[0].id);

    return (
        <section className="facilities-expand">
            <div className="facilities-expand__container">
                <div className="facilities-expand__header">
                    <span className="facilities-expand__eyebrow">Facilities</span>
                    <h2 className="facilities-expand__title">Explore Our Facilities</h2>
                </div>

                <div className="facilities-expand__panels">
                    {facilities.map((item) => {
                        const isActive = activeId === item.id;
                        return (
                            <motion.div
                                key={item.id}
                                className={`facilities-expand__panel ${isActive ? "facilities-expand__panel--active" : ""
                                    }`}
                                onMouseEnter={() => setActiveId(item.id)}
                                onClick={() => setActiveId(item.id)}
                                animate={{ flex: isActive ? 4 : 1 }}
                                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                            >
                                <div className="facilities-expand__panel-bg">
                                    <img src={item.image} alt={item.name} />
                                    <div className="facilities-expand__panel-overlay" />
                                </div>

                                <div className="facilities-expand__panel-content">
                                    <span className="facilities-expand__panel-icon">
                                        {item.icon}
                                    </span>
                                    <h3 className="facilities-expand__panel-name">
                                        {item.name}
                                    </h3>
                                    {isActive && (
                                        <motion.p
                                            className="facilities-expand__panel-desc"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2, duration: 0.4 }}
                                        >
                                            {item.desc}
                                        </motion.p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FacilitiesExpand;