// RoomsGalleryTabs.jsx
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "swiper/css";
import "swiper/css/navigation";
import "./RoomsGalleryTabs.scss";

const roomData = {
  basic: {
    label: "Basic",
    images: [
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1611048268330-53de574cae3b?q=80&w=1600&auto=format&fit=crop",
    ],
  },
  deluxe: {
    label: "Deluxe",
    images: [
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=1600&auto=format&fit=crop",
    ],
  },
  premium: {
    label: "Premium",
    images: [
      "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600&auto=format&fit=crop",
    ],
  },
  suite: {
    label: "Suite",
    images: [
      "https://images.unsplash.com/photo-1611048268330-53de574cae3b?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1600&auto=format&fit=crop",
    ],
  },
};

const categoryKeys = Object.keys(roomData);

const RoomsGalleryTabs = () => {
  const [activeCat, setActiveCat] = useState("basic");
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const swiperRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const handleTabChange = (key) => {
    setActiveCat(key);
    setActiveImageIdx(0);
  };

  const handleThumbClick = (i) => {
    setActiveImageIdx(i);
    if (swiperRef.current) {
      swiperRef.current.slideToLoop(i, 700);
    }
  };

  const currentImages = roomData[activeCat].images;

  return (
    <section className="rooms-gallery-tabs">
      <div className="rooms-gallery-tabs__container">
        <div className="rooms-gallery-tabs__header">
          <span className="rooms-gallery-tabs__eyebrow">Room Gallery</span>
          <h2 className="rooms-gallery-tabs__title">See Every Room Type</h2>
        </div>

        {/* Category Tabs - plain, all 4 always visible, centered */}
        <div className="rooms-gallery-tabs__tabs">
          {categoryKeys.map((key) => (
            <button
              key={key}
              className={`rooms-gallery-tabs__tab ${activeCat === key ? "rooms-gallery-tabs__tab--active" : ""
                }`}
              onClick={() => handleTabChange(key)}
            >
              {roomData[key].label}
              {activeCat === key && (
                <motion.span
                  layoutId="gallery-tab-underline"
                  className="rooms-gallery-tabs__tab-underline"
                />
              )}
            </button>
          ))}
        </div>

        {/* Main Image - now a Swiper slider with arrows */}
        <div className="rooms-gallery-tabs__main-image-wrap">
          <button
            ref={prevRef}
            type="button"
            aria-label="Previous image"
            className="rooms-gallery-tabs__img-nav-btn rooms-gallery-tabs__img-nav-btn--prev"
          >
            <FaChevronLeft />
          </button>

          <Swiper
            key={activeCat}
            modules={[Navigation, Autoplay]}
            slidesPerView={1}
            loop={true}
            speed={700}
            autoplay={{
              delay: 6000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onBeforeInit={(swiper) => {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
              swiperRef.current = swiper;
            }}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => {
              setActiveImageIdx(swiper.realIndex);
            }}
            className="rooms-gallery-tabs__main-swiper"
          >
            {currentImages.map((img, i) => (
              <SwiperSlide key={i}>
                <img
                  src={img}
                  alt={`${roomData[activeCat].label} room`}
                  className="rooms-gallery-tabs__main-image"
                />
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            ref={nextRef}
            type="button"
            aria-label="Next image"
            className="rooms-gallery-tabs__img-nav-btn rooms-gallery-tabs__img-nav-btn--next"
          >
            <FaChevronRight />
          </button>
        </div>

        {/* Thumbnail Strip - unchanged, stays synced with main swiper */}
        <div className="rooms-gallery-tabs__thumbs">
          {currentImages.map((img, i) => (
            <button
              key={i}
              className={`rooms-gallery-tabs__thumb ${activeImageIdx === i ? "rooms-gallery-tabs__thumb--active" : ""
                }`}
              onClick={() => handleThumbClick(i)}
            >
              <img src={img} alt={`Thumbnail ${i + 1}`} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoomsGalleryTabs;