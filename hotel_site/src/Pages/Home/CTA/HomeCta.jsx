// HomeCta.jsx
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaArrowRight } from "react-icons/fa";
import "./HomeCta.scss";

gsap.registerPlugin(ScrollTrigger);

const HomeCta = () => {
    const sectionRef = useRef(null);
    const titleRef = useRef(null);
    const subTextRef = useRef(null);
    const btnRef = useRef(null);
    const shape1Ref = useRef(null);
    const shape2Ref = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Entry animation — fade + scale up as section enters view
            gsap.fromTo(
                [titleRef.current, subTextRef.current, btnRef.current],
                { y: 40, opacity: 0, scale: 0.96 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.9,
                    ease: "power3.out",
                    stagger: 0.15,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top 70%",
                    },
                }
            );

            // Slow ambient drift for background shapes — decorative, non-distracting
            gsap.to(shape1Ref.current, {
                x: 40,
                y: -30,
                duration: 8,
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
            });

            gsap.to(shape2Ref.current, {
                x: -35,
                y: 25,
                duration: 10,
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section className="home-cta" ref={sectionRef}>
            {/* Decorative floating shapes */}
            <span className="home-cta__shape home-cta__shape--one" ref={shape1Ref} />
            <span className="home-cta__shape home-cta__shape--two" ref={shape2Ref} />

            <div className="home-cta__container">
                <h2 className="home-cta__title" ref={titleRef}>
                    Your Stay Starts With One Click
                </h2>
                <p className="home-cta__subtext" ref={subTextRef}>
                    No long forms, no waiting on hold - just pick your dates and
                    we'll take care of the rest.
                </p>
                <button className="home-cta__btn" ref={btnRef}>
                    Book Your Stay <FaArrowRight />
                </button>
            </div>
        </section>
    );
};

export default HomeCta;