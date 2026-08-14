// RoomsGalleryZigzag.jsx
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./RoomsGalleryZigzag.scss";

gsap.registerPlugin(ScrollTrigger);

const categories = [
  {
    name: "Basic Rooms",
    desc: "Simple, clean comfort for the essentials of a good night's stay — thoughtfully designed without unnecessary extras.",
    photoCount: "18 Photos",
    mainImage:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200&auto=format&fit=crop",
    smallImage:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=700&auto=format&fit=crop",
  },
  {
    name: "Deluxe Rooms",
    desc: "A step up in space and detail, with upgraded furnishings and a more relaxed, homely atmosphere.",
    photoCount: "14 Photos",
    mainImage:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200&auto=format&fit=crop",
    smallImage:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=700&auto=format&fit=crop",
  },
  {
    name: "Premium Rooms",
    desc: "Elevated comfort with premium finishes, extra space, and views designed to make your stay memorable.",
    photoCount: "9 Photos",
    mainImage:
      "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=1200&auto=format&fit=crop",
    smallImage:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=700&auto=format&fit=crop",
  },
  {
    name: "Suites",
    desc: "Our finest offering — spacious living areas, private lounges, and details crafted for those who want the best.",
    photoCount: "4 Photos",
    mainImage:
      "https://images.unsplash.com/photo-1611048268330-53de574cae3b?q=80&w=1200&auto=format&fit=crop",
    smallImage:
      "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=700&auto=format&fit=crop",
  },
];

const RoomsGalleryZigzag = () => {
  const sectionRef = useRef(null);
  const rowRefs = useRef([]);

  rowRefs.current = [];
  const addToRows = (el) => {
    if (el && !rowRefs.current.includes(el)) {
      rowRefs.current.push(el);
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      rowRefs.current.forEach((row) => {
        const img = row.querySelector(".rooms-gallery-zigzag__image-col");
        const text = row.querySelector(".rooms-gallery-zigzag__text-col");

        gsap.fromTo(
          img,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 78%" },
          }
        );

        gsap.fromTo(
          text,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            delay: 0.15,
            scrollTrigger: { trigger: row, start: "top 78%" },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="rooms-gallery-zigzag" ref={sectionRef}>
      <div className="rooms-gallery-zigzag__container">
        <div className="rooms-gallery-zigzag__header">
          <span className="rooms-gallery-zigzag__eyebrow">Room Gallery</span>
          <h2 className="rooms-gallery-zigzag__title">
            A Closer Look At Every Room Type
          </h2>
        </div>

        {categories.map((cat, i) => (
          <div
            className={`rooms-gallery-zigzag__row ${
              i % 2 !== 0 ? "rooms-gallery-zigzag__row--reverse" : ""
            }`}
            key={cat.name}
            ref={addToRows}
          >
            <div className="rooms-gallery-zigzag__image-col">
              <div className="rooms-gallery-zigzag__image-cluster">
                <img
                  src={cat.mainImage}
                  alt={cat.name}
                  className="rooms-gallery-zigzag__image-main"
                />
                <img
                  src={cat.smallImage}
                  alt={`${cat.name} detail`}
                  className="rooms-gallery-zigzag__image-small"
                />
              </div>
            </div>

            <div className="rooms-gallery-zigzag__text-col">
              <span className="rooms-gallery-zigzag__photo-count">
                {cat.photoCount}
              </span>
              <h3 className="rooms-gallery-zigzag__name">{cat.name}</h3>
              <p className="rooms-gallery-zigzag__desc">{cat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RoomsGalleryZigzag;