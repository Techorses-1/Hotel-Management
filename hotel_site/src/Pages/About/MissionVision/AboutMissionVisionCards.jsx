// AboutMissionVisionCards.jsx - UPDATED
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaBullseye, FaEye } from "react-icons/fa";
import "./AboutMissionVisionCards.scss";

gsap.registerPlugin(ScrollTrigger);

const AboutMissionVisionCards = () => {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  cardsRef.current = [];
  const addToCards = (el) => {
    if (el && !cardsRef.current.includes(el)) {
      cardsRef.current.push(el);
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardsRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.18,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="about-mv-cards" ref={sectionRef}>
      <div className="about-mv-cards__container">
        <div className="about-mv-cards__grid">
          {/* Mission Card */}
          <div
            className="about-mv-cards__card about-mv-cards__card--light"
            ref={addToCards}
          >
            <span className="about-mv-cards__icon about-mv-cards__icon--light">
              <FaBullseye />
            </span>
            <h3 className="about-mv-cards__title about-mv-cards__title--dark">
              Our Mission
            </h3>
            <p className="about-mv-cards__desc about-mv-cards__desc--dark">
              To create a space where every guest feels genuinely cared
              for - not through grand gestures, but through consistent,
              thoughtful details that make each stay feel personal.
            </p>
          </div>

          {/* Vision Card */}
          <div
            className="about-mv-cards__card about-mv-cards__card--dark"
            ref={addToCards}
          >
            <span className="about-mv-cards__icon about-mv-cards__icon--dark">
              <FaEye />
            </span>
            <h3 className="about-mv-cards__title about-mv-cards__title--light">
              Our Vision
            </h3>
            <p className="about-mv-cards__desc about-mv-cards__desc--light">
              To be remembered not as a place guests stayed, but as a
              place they belonged - setting a standard for hospitality
              built on trust, comfort, and quiet excellence.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutMissionVisionCards;