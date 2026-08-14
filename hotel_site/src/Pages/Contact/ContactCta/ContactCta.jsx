// ContactCta.jsx - UPDATED with BookingModal
import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaArrowRight, FaBed } from "react-icons/fa";
import BookingModal from "../../../Components/BookingModal/BookingModal";
import "./ContactCta.scss";

gsap.registerPlugin(ScrollTrigger);

const ContactCta = () => {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const titleRef = useRef(null);
  const subTextRef = useRef(null);
  const btnGroupRef = useRef(null);
  const shape1Ref = useRef(null);
  const shape2Ref = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        [eyebrowRef.current, titleRef.current, subTextRef.current, btnGroupRef.current],
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
    <>
      <section className="contact-cta" ref={sectionRef}>
        <span className="contact-cta__shape contact-cta__shape--one" ref={shape1Ref} />
        <span className="contact-cta__shape contact-cta__shape--two" ref={shape2Ref} />

        <div className="contact-cta__container">
          <span className="contact-cta__eyebrow" ref={eyebrowRef}>
            Get Started
          </span>

          <h2 className="contact-cta__title" ref={titleRef}>
            Ready to Experience It?
          </h2>
          <p className="contact-cta__subtext" ref={subTextRef}>
            We typically respond within 2 hours - so once you reach out,
            your next stay is just a step away.
          </p>

          <div className="contact-cta__btn-group" ref={btnGroupRef}>
            <button 
              className="contact-cta__btn contact-cta__btn--primary"
              onClick={() => setIsModalOpen(true)}
            >
              Book Now <FaArrowRight />
            </button>
            {/* <button className="contact-cta__btn contact-cta__btn--secondary">
              <FaBed /> Browse Rooms
            </button> */}
          </div>
        </div>
      </section>

      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default ContactCta;