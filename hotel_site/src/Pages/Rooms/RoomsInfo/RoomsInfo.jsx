// RoomsInfo.jsx - UPDATED with Rupee symbol
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaBed, FaHotel, FaCrown, FaGem } from "react-icons/fa";
import "./RoomsInfo.scss";

gsap.registerPlugin(ScrollTrigger);

const categories = [
    {
        icon: <FaBed />,
        count: "18",
        name: "Basic Rooms",
        price: "From ₹89/day",
    },
    {
        icon: <FaHotel />,
        count: "14",
        name: "Deluxe Rooms",
        price: "From ₹129/day",
    },
    {
        icon: <FaCrown />,
        count: "9",
        name: "Premium Rooms",
        price: "From ₹179/day",
    },
    {
        icon: <FaGem />,
        count: "4",
        name: "Suites",
        price: "From ₹260/day",
    },
];

const RoomsInfo = () => {
    const sectionRef = useRef(null);
    const numberRefs = useRef([]);
    const blockRefs = useRef([]);

    numberRefs.current = [];
    blockRefs.current = [];

    const addToNumbers = (el) => {
        if (el && !numberRefs.current.includes(el)) {
            numberRefs.current.push(el);
        }
    };

    const addToBlocks = (el) => {
        if (el && !blockRefs.current.includes(el)) {
            blockRefs.current.push(el);
        }
    };

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                blockRefs.current,
                { y: 50, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: "power3.out",
                    stagger: 0.15,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top 75%",
                    },
                }
            );

            // Count-up animation for each number
            numberRefs.current.forEach((el) => {
                const target = parseInt(el.dataset.count, 10);
                const counter = { val: 0 };

                gsap.to(counter, {
                    val: target,
                    duration: 1.6,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top 75%",
                    },
                    onUpdate: () => {
                        el.textContent = Math.floor(counter.val);
                    },
                });
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section className="rooms-info" ref={sectionRef}>
            <div className="rooms-info__container">
                <div className="rooms-info__header">
                    <span className="rooms-info__eyebrow">Room Categories</span>
                    <h2 className="rooms-info__title">
                        Choose The Stay That Fits You
                    </h2>
                </div>

                <div className="rooms-info__grid">
                    {categories.map((cat, i) => (
                        <div
                            className="rooms-info__block"
                            key={cat.name}
                            ref={addToBlocks}
                        >
                            <span className="rooms-info__icon">{cat.icon}</span>
                            <span
                                className="rooms-info__number"
                                ref={addToNumbers}
                                data-count={cat.count}
                            >
                                0
                            </span>
                            <h3 className="rooms-info__name">{cat.name}</h3>
                            <p className="rooms-info__price">{cat.price}</p>
                            {i !== categories.length - 1 && (
                                <span className="rooms-info__divider" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default RoomsInfo;