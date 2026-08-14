// HomeWhyChooseUs.jsx
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./HomeWhyChooseUs.scss";

gsap.registerPlugin(ScrollTrigger);

const features = [
    {
        number: "01",
        title: "Personalized Service",
        desc: "Every guest is known by name, not room number - our team remembers preferences so your stay feels tailored, not templated.",
    },
    {
        number: "02",
        title: "Prime Location",
        desc: "Steps away from the city's best - dining, culture, and transit are all within easy reach, without sacrificing quiet at night.",
    },
    {
        number: "03",
        title: "24/7 Concierge",
        desc: "Whatever you need, whenever you need it - our concierge team is available around the clock, not just during business hours.",
    },
    {
        number: "04",
        title: "Thoughtful Details",
        desc: "From the linens to the lighting, every choice is intentional - comfort isn't an afterthought here, it's the whole point.",
    },
];

const HomeWhyChooseUs = () => {
    const sectionRef = useRef(null);
    const itemsRef = useRef([]);

    itemsRef.current = [];
    const addToItems = (el) => {
        if (el && !itemsRef.current.includes(el)) {
            itemsRef.current.push(el);
        }
    };

    useEffect(() => {
        const ctx = gsap.context(() => {
            itemsRef.current.forEach((item) => {
                gsap.fromTo(
                    item,
                    { y: 50, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        ease: "power3.out",
                        scrollTrigger: {
                            trigger: item,
                            start: "top 82%",
                        },
                    }
                );
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section className="home-why-choose-us" ref={sectionRef}>
            <div className="home-why-choose-us__container">
                <div className="home-why-choose-us__left">
                    <span className="home-why-choose-us__eyebrow">Why Choose Us</span>
                    <h2 className="home-why-choose-us__title">
                        Why Guests Keep Coming Back
                    </h2>
                    <p className="home-why-choose-us__subtext">
                        It's rarely one big thing - it's the sum of small details,
                        handled consistently, every single stay.
                    </p>
                </div>

                <div className="home-why-choose-us__right">
                    {features.map((feature, i) => (
                        <div
                            className="home-why-choose-us__item"
                            key={feature.number}
                            ref={addToItems}
                        >
                            <span className="home-why-choose-us__number">
                                {feature.number}
                            </span>
                            <div className="home-why-choose-us__item-text">
                                <h3 className="home-why-choose-us__item-title">
                                    {feature.title}
                                </h3>
                                <p className="home-why-choose-us__item-desc">
                                    {feature.desc}
                                </p>
                            </div>
                            {i !== features.length - 1 && (
                                <span className="home-why-choose-us__divider" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HomeWhyChooseUs;