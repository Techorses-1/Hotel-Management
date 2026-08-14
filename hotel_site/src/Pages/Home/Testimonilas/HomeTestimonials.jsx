// HomeTestimonials.jsx
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { FaQuoteLeft } from "react-icons/fa";
import "./HomeTestimonials.scss";

const testimonials = [
    {
        name: "Ariana Kolt",
        text: "The kind of place where every small detail feels considered. I've stayed at a lot of hotels — this one actually remembered my preferences the next morning.",
    },
    {
        name: "Devon Marsh",
        text: "Quiet, clean, and genuinely comfortable. The staff never made me feel like just another room number.",
    },
    {
        name: "Priya Nandan",
        text: "I came for a work trip and ended up extending my stay by two nights. That says enough.",
    },
    {
        name: "Elliot Cruz",
        text: "The concierge team handled a last-minute change without a single complaint. Rare these days.",
    },
    {
        name: "Sofia Bellamy",
        text: "Felt more like a boutique retreat than a standard hotel stay. Will be back for sure.",
    },
    {
        name: "Marcus Idehen",
        text: "Everything from check-in to check-out was smooth. No surprises, just a genuinely good stay.",
    },
];

const HomeTestimonials = () => {
    const trackRef = useRef(null);
    const tweenRef = useRef(null);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const ctx = gsap.context(() => {
            const totalWidth = track.scrollWidth / 2;

            tweenRef.current = gsap.fromTo(
                track,
                { x: 0 },
                {
                    x: -totalWidth,
                    duration: 32,
                    ease: "none",
                    repeat: -1,
                }
            );
        });

        return () => ctx.revert();
    }, []);

    const handleMouseEnter = () => {
        tweenRef.current?.pause();
    };

    const handleMouseLeave = () => {
        tweenRef.current?.play();
    };

    const loopList = [...testimonials, ...testimonials];

    return (
        <section className="home-testimonials">
            <div className="home-testimonials__container">
                <div className="home-testimonials__header">
                    <span className="home-testimonials__eyebrow">Testimonials</span>
                    <h2 className="home-testimonials__title">What Our Guests Say</h2>
                </div>
            </div>

            <div
                className="home-testimonials__marquee"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="home-testimonials__track" ref={trackRef}>
                    {loopList.map((item, i) => (
                        <div className="home-testimonials__card" key={`${item.name}-${i}`}>
                            <FaQuoteLeft className="home-testimonials__quote-icon" />
                            <p className="home-testimonials__text">{item.text}</p>
                            <span className="home-testimonials__name">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HomeTestimonials;