// HomeHero.jsx
import { useRef, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./HomeHero.scss";
import { Link } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2000&auto=format&fit=crop";

const HomeHero = () => {
  const sectionRef = useRef(null);
  const linesRef = useRef([]);
  const imageWrapRef = useRef(null);
  const subTextRef = useRef(null);
  const scrollCueRef = useRef(null);

  linesRef.current = [];

  const addToLines = (el) => {
    if (el && !linesRef.current.includes(el)) {
      linesRef.current.push(el);
    }
  };

  useLayoutEffect(() => {
    let ctx;
    // wait one frame so layout (images/fonts) has settled before GSAP measures anything
    const rafId = requestAnimationFrame(() => {
      ctx = gsap.context(() => {
        // Entry animation for headline lines
        gsap.fromTo(
          linesRef.current,
          { y: "110%", opacity: 0 },
          {
            y: "0%",
            opacity: 1,
            duration: 1.1,
            ease: "power4.out",
            stagger: 0.12,
            delay: 0.3,
          }
        );

        // Subtext + CTA fade in after lines
        gsap.fromTo(
          subTextRef.current,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            delay: 1.1,
            onComplete: () => {
              // Entry animation is done now — safe to attach the scroll-linked
              // fade/scale tween without it clashing with the entry tween's
              // control over opacity. This is what makes it scrub smoothly
              // AND reverse properly on scroll-back, same as the title.
              gsap.fromTo(
                subTextRef.current,
                { opacity: 1, scale: 1 },
                {
                  opacity: 0.15,
                  scale: 0.92,
                  scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top top",
                    end: "+=90%",
                    scrub: 1,
                    invalidateOnRefresh: true,
                  },
                }
              );
            },
          }
        );

        // Scroll cue fade in
        gsap.fromTo(
          scrollCueRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.8, delay: 1.6 }
        );

        // Scroll-triggered image reveal (clip-path opens like curtains)
        gsap.fromTo(
          imageWrapRef.current,
          { clipPath: "inset(0% 50% 0% 50%)", scale: 1.15 },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top top",
              end: "+=99%",
              scrub: 1,
              pin: true,
              pinSpacing: true,
              invalidateOnRefresh: true,
            },
          }
        );

        // Headline shrinks / fades slightly as image reveals
        gsap.to(".home-hero__title", {
          opacity: 0.15,
          scale: 0.92,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "+=90%",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        ScrollTrigger.refresh();
      }, sectionRef);
    });

    // safety net: recalc once everything (images, fonts) is fully loaded
    const handleWindowLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", handleWindowLoad);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("load", handleWindowLoad);
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <section className="home-hero" ref={sectionRef}>
      <div className="home-hero__content">
        <h1 className="home-hero__title">
          <span className="home-hero__line-wrap">
            <span className="home-hero__line" ref={addToLines}>
              STAY.
            </span>
          </span>
          <span className="home-hero__line-wrap">
            <span className="home-hero__line" ref={addToLines}>
              UNWIND.
            </span>
          </span>
          <span className="home-hero__line-wrap">
            <span className="home-hero__line home-hero__line--accent" ref={addToLines}>
              BELONG.
            </span>
          </span>
        </h1>

        <div className="home-hero__sub" ref={subTextRef}>
          <p className="home-hero__subtext">
            A quiet retreat built around comfort, care, and the details
            that make a stay feel personal.
          </p>
          <Link to="/gallery" className="home-hero__cta-link">
            <button className="home-hero__cta">EXPLORE</button>
          </Link>
        </div>
      </div>

      <div className="home-hero__image-wrap" ref={imageWrapRef}>
        <img
          src={HERO_IMAGE}
          alt="Hotel room interior"
          className="home-hero__image"
        />
        <div className="home-hero__image-overlay" />
      </div>

      <div className="home-hero__scroll-cue" ref={scrollCueRef}>
        <span className="home-hero__scroll-text">Scroll</span>
      </div>
    </section>
  );
};

export default HomeHero;