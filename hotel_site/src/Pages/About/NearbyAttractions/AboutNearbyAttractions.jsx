// AboutNearbyAttractions.jsx - UPDATED with Vadodara locations
import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FaMapMarkerAlt, FaWalking, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "swiper/css";
import "./AboutNearbyAttractions.scss";

const attractions = [
    {
        name: "Sayaji Baug (Kamati Baug)",
        distance: "1.2 km · 5 min drive",
        desc: "One of the largest gardens in Gujarat, featuring a zoo, museum, and planetarium.",
        image:
            "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=900&auto=format&fit=crop",
    },
    {
        name: "Laxmi Vilas Palace",
        distance: "2.5 km · 8 min drive",
        desc: "A magnificent palace four times the size of Buckingham Palace, showcasing Indo-Saracenic architecture.",
        image:
            "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=900&auto=format&fit=crop",
    },
    {
        name: "Kirti Mandir",
        distance: "3.0 km · 10 min drive",
        desc: "A beautiful temple dedicated to Lord Krishna, known for its intricate carvings and peaceful atmosphere.",
        image:
            "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=900&auto=format&fit=crop",
    },
    {
        name: "Maharaja Fateh Singh Museum",
        distance: "2.8 km · 9 min drive",
        desc: "Housed within the palace complex, featuring royal artifacts, paintings, and sculptures.",
        image:
            "https://images.unsplash.com/photo-1506059612708-99d6c258160e?q=80&w=900&auto=format&fit=crop",
    },
    {
        name: "Sursagar Lake",
        distance: "4.0 km · 12 min drive",
        desc: "A scenic lake with a giant statue of Lord Shiva in the center, perfect for evening walks.",
        image:
            "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?q=80&w=900&auto=format&fit=crop",
    },
];

const AboutNearbyAttractions = () => {
    const swiperRef = useRef(null);

    return (
        <section className="about-nearby">
            <div className="about-nearby__container">
                <div className="about-nearby__header">
                    <span className="about-nearby__eyebrow">Nearby Attractions</span>
                    <h2 className="about-nearby__title">Explore What's Close By</h2>
                    <p className="about-nearby__subtext">
                        The best of Vadodara, just minutes from your stay.
                    </p>
                </div>
            </div>

            <div className="about-nearby__slider-wrap">
                <Swiper
                    onSwiper={(swiper) => {
                        swiperRef.current = swiper;
                    }}
                    slidesPerView={1.15}
                    spaceBetween={20}
                    breakpoints={{
                        480: { slidesPerView: 1.4, spaceBetween: 20 },
                        640: { slidesPerView: 2.2, spaceBetween: 22 },
                        860: { slidesPerView: 2.6, spaceBetween: 24 },
                        1024: { slidesPerView: 3.2, spaceBetween: 26 },
                        1280: { slidesPerView: 4, spaceBetween: 26 },
                    }}
                    className="about-nearby__swiper"
                >
                    {attractions.map((item) => (
                        <SwiperSlide key={item.name}>
                            <div className="about-nearby__card">
                                <div className="about-nearby__image-wrap">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="about-nearby__image"
                                    />
                                    <span className="about-nearby__distance">
                                        <FaWalking /> {item.distance}
                                    </span>
                                </div>
                                <div className="about-nearby__content">
                                    <h3 className="about-nearby__name">
                                        <FaMapMarkerAlt /> {item.name}
                                    </h3>
                                    <p className="about-nearby__desc">{item.desc}</p>
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                {/* Custom Arrow Navigation */}
                <button
                    type="button"
                    className="about-nearby__arrow about-nearby__arrow--prev"
                    onClick={() => swiperRef.current?.slidePrev()}
                    aria-label="Previous"
                >
                    <FaChevronLeft />
                </button>
                <button
                    type="button"
                    className="about-nearby__arrow about-nearby__arrow--next"
                    onClick={() => swiperRef.current?.slideNext()}
                    aria-label="Next"
                >
                    <FaChevronRight />
                </button>
            </div>
        </section>
    );
};

export default AboutNearbyAttractions;