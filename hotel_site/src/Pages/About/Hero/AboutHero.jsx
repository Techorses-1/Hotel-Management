// AboutHero.jsx
import "./AboutHero.scss";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=2000&auto=format&fit=crop";

const AboutHero = () => {
  return (
    <section className="about-hero">
      <div className="about-hero__image-wrap">
        <img
          src={HERO_IMAGE}
          alt="About our hotel"
          className="about-hero__image"
        />
        <div className="about-hero__overlay" />
      </div>

      <div className="about-hero__container">
        <span className="about-hero__eyebrow">About Us</span>
        <h1 className="about-hero__title">Our Story, Your Comfort</h1>
        <p className="about-hero__description">
          Built on care, shaped by detail - discover what makes every
          stay with us feel like more than just a room.
        </p>
      </div>
    </section>
  );
};

export default AboutHero;