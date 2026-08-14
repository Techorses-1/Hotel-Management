// ContactMap.jsx - UPDATED
import "./ContactMap.scss";

const MAP_QUERY = encodeURIComponent(
  "B-224, Samanvay Silicon, Opp Kalyan Hotel, Dairy Den Circle, Sayajigunj, Vadodara, 390020"
);

const ContactMap = () => {
  return (
    <section className="contact-map">
      <div className="contact-map__header">
        <span className="contact-map__eyebrow">Location</span>
        <h2 className="contact-map__title">Find Us On The Map</h2>
        <p className="contact-map__subtext">
          Located in the heart of Vadodara, easy to find and easy to reach.
        </p>
      </div>

      <div className="contact-map__container">
        <div className="contact-map__frame-wrap">
          <iframe
            title="Hotel Location"
            src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`}
            className="contact-map__frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>

        <div className="contact-map__address-card">
          <p className="contact-map__address-line">
            B-224, Samanvay Silicon, Opp Kalyan Hotel
          </p>
          <p className="contact-map__address-line">
            Dairy Den Circle, Sayajigunj, Vadodara, 390020
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContactMap;