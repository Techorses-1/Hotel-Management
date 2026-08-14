// ContactHero.jsx
import "./ContactHero.scss";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?q=80&w=2000&auto=format&fit=crop";

const ContactHero = () => {
  return (
    <section className="contact-hero">
      <div className="contact-hero__image-wrap">
        <img
          src={HERO_IMAGE}
          alt="Contact us"
          className="contact-hero__image"
        />
        <div className="contact-hero__overlay" />
      </div>

      <div className="contact-hero__container">
        <span className="contact-hero__eyebrow">Contact Us</span>
        <h1 className="contact-hero__title">Get In Touch</h1>
        <p className="contact-hero__description">
          We're here to help - reach out anytime with questions, special
          requests, or just to say hello.
        </p>
      </div>
    </section>
  );
};

export default ContactHero;