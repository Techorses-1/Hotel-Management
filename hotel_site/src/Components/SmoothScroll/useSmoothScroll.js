import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * useSmoothScroll
 * ----------------
 * Sets up Lenis smooth scrolling for the WHOLE app and keeps GSAP
 * ScrollTrigger perfectly in sync with it.
 *
 * IMPORTANT: call this ONCE, at the top of your root App.jsx —
 * not inside individual sections like HeroSection or AboutSection.
 * Those sections' own ScrollTrigger animations will keep working
 * correctly once this is running at the root.
 *
 * Usage in App.jsx:
 *   import useSmoothScroll from "./useSmoothScroll";
 *   function App() {
 *     useSmoothScroll();
 *     return ( ...your sections... );
 *   }
 *
 * Install once: npm install lenis gsap
 */
export default function useSmoothScroll() {
    useEffect(() => {
        const prefersReduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        if (prefersReduced) return; // respect accessibility preference, skip entirely

        const lenis = new Lenis({
            duration: 1.1,
            easing: (t) => 1 - Math.pow(1 - t, 3), // smooth ease-out cubic
            smoothWheel: true,
            touchMultiplier: 1.1, // keep touch scroll close to native on mobile
        });

        lenis.on("scroll", ScrollTrigger.update);

        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        return () => {
            lenis.destroy();
            gsap.ticker.remove(lenis.raf);
        };
    }, []);
}