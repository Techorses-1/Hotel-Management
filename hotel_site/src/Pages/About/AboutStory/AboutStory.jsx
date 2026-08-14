// AboutStory.jsx - UPDATED
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./AboutStory.scss";

gsap.registerPlugin(ScrollTrigger);

const STORY_IMAGE =
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1600&auto=format&fit=crop";

const AboutStory = () => {
  const sectionRef = useRef(null);
  const imageRef = useRef(null);
  const paraRefs = useRef([]);

  paraRefs.current = [];
  const addToParas = (el) => {
    if (el && !paraRefs.current.includes(el)) {
      paraRefs.current.push(el);
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        imageRef.current,
        { opacity: 0, scale: 1.05 },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        }
      );

      paraRefs.current.forEach((para) => {
        gsap.fromTo(
          para,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: para,
              start: "top 85%",
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="about-story" ref={sectionRef}>
      <div className="about-story__container">
        <div className="about-story__header">
          <span className="about-story__eyebrow">Our Story</span>
          <h2 className="about-story__title">
            A Journey Built On Genuine Hospitality
          </h2>
        </div>

        <div className="about-story__content">
          {/* Sticky Image */}
          <div className="about-story__image-col">
            <div className="about-story__image-wrap" ref={imageRef}>
              <img
                src={STORY_IMAGE}
                alt="Hotel exterior"
                className="about-story__image"
              />
            </div>
          </div>

          {/* Narrative Text */}
          <div className="about-story__text-col">
            <p className="about-story__para about-story__para--dropcap" ref={addToParas}>
              It began with a simple belief - that hospitality should feel
              personal, not transactional. What started as a modest
              property with a handful of rooms has grown into a place
              guests return to, not because it's convenient, but because
              it feels like somewhere they belong.
            </p>

            <p className="about-story__para" ref={addToParas}>
              Every renovation, every new addition, every small change
              has been guided by one question: does this make a guest's
              stay feel more considered? We've turned down shortcuts that
              would have been easier, in favor of details that guests
              actually notice - the quality of the linens, the warmth of
              the staff, the quiet in the halls at night.
            </p>

            <p className="about-story__para" ref={addToParas}>
              Today, we're still guided by that same idea. Not chasing
              trends, not competing on size - just quietly getting better
              at the one thing that matters most: making people feel at
              home, even when they're far from it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutStory;