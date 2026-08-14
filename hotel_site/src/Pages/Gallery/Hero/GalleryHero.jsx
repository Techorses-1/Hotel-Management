// GalleryHero.jsx
import "./GalleryHero.scss";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=2000&auto=format&fit=crop";

const GalleryHero = () => {
  return (
    <section className="gallery-hero">
      <div className="gallery-hero__image-wrap">
        <img
          src={HERO_IMAGE}
          alt="Hotel gallery"
          className="gallery-hero__image"
        />
        <div className="gallery-hero__overlay" />
      </div>

      <div className="gallery-hero__container">
        <span className="gallery-hero__eyebrow">Gallery</span>
        <h1 className="gallery-hero__title">A Glimpse Inside</h1>
        <p className="gallery-hero__description">
          Take a visual tour through our rooms, spaces, and the moments
          that make every stay memorable.
        </p>
      </div>
    </section>
  );
};

export default GalleryHero;