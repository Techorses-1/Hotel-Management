// FacilitiesScrollSnap.jsx
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./FacilitiesScrollSnap.scss";

gsap.registerPlugin(ScrollTrigger);

const facilities = [
    {
        name: "Swimming Pool",
        tagline: "Open year-round, day or night",
        image:
            "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=2000&auto=format&fit=crop",
    },
    {
        name: "Spa & Wellness",
        tagline: "A quiet retreat within your stay",
        image:
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2000&auto=format&fit=crop",
    },
    {
        name: "Fitness Center",
        tagline: "24-hour access, fully equipped",
        image:
            "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop",
    },
    {
        name: "Fine Dining",
        tagline: "Seasonal menus, crafted with care",
        image:
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2000&auto=format&fit=crop",
    },
];

const FacilitiesScrollSnap = () => {
    const containerRef = useRef(null);
    const slideRefs = useRef([]);

    slideRefs.current = [];
    const addToSlides = (el) => {
        if (el && !slideRefs.current.includes(el)) {
            slideRefs.current.push(el);
        }
    };

    useEffect(() => {
        const ctx = gsap.context(() => {
            slideRefs.current.forEach((slide) => {
                const img = slide.querySelector(
                    ".facilities-scroll-snap__slide-image"
                );
                const text = slide.querySelector(
                    ".facilities-scroll-snap__slide-text"
                );

                // Parallax on image
                gsap.fromTo(
                    img,
                    { y: "-8%" },
                    {
                        y: "8%",
                        ease: "none",
                        scrollTrigger: {
                            trigger: slide,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true,
                        },
                    }
                );

                // Text fade in as slide enters
                gsap.fromTo(
                    text,
                    { opacity: 0, y: 30 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.8,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: slide,
                            start: "top 60%",
                            end: "top 20%",
                            scrub: true,
                        },
                    }
                );
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section className="facilities-scroll-snap" ref={containerRef}>
            {facilities.map((item, i) => (
                <div
                    className="facilities-scroll-snap__slide"
                    key={item.name}
                    ref={addToSlides}
                >
                    <div className="facilities-scroll-snap__slide-image-wrap">
                        <img
                            src={item.image}
                            alt={item.name}
                            className="facilities-scroll-snap__slide-image"
                        />
                        <div className="facilities-scroll-snap__slide-overlay" />
                    </div>

                    <div className="facilities-scroll-snap__slide-text">
                        <span className="facilities-scroll-snap__slide-count">
                            {String(i + 1).padStart(2, "0")} / {String(facilities.length).padStart(2, "0")}
                        </span>
                        <h3 className="facilities-scroll-snap__slide-name">
                            {item.name}
                        </h3>
                        <p className="facilities-scroll-snap__slide-tagline">
                            {item.tagline}
                        </p>
                    </div>
                </div>
            ))}
        </section>
    );
};

export default FacilitiesScrollSnap;