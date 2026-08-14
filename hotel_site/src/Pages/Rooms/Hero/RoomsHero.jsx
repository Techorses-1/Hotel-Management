// RoomsHero.jsx
import "./RoomsHero.scss";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2000&auto=format&fit=crop";

const RoomsHero = () => {
  return (
    <section className="rooms-hero">
      <div className="rooms-hero__image-wrap">
        <img
          src={HERO_IMAGE}
          alt="Our rooms and suites"
          className="rooms-hero__image"
        />
        <div className="rooms-hero__overlay" />
      </div>

      <div className="rooms-hero__container">
        <span className="rooms-hero__eyebrow">Rooms & Suites</span>
        <h1 className="rooms-hero__title">Find Your Perfect Stay</h1>
        <p className="rooms-hero__description">
          From cozy retreats to spacious suites - every room is designed
          with comfort, quiet, and quality in mind.
        </p>
      </div>
    </section>
  );
};

export default RoomsHero;