// GalleryCategoryRows.jsx
import { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "swiper/css";
import "./GalleryCategoryRows.scss";

const rows = [
    {
        name: "Hotel Photos",
        images: [
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=900&auto=format&fit=crop",
        ],
    },
    {
        name: "Room Photos",
        images: [
            "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1611048268330-53de574cae3b?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=900&auto=format&fit=crop",
        ],
    },
    {
        name: "Restaurant",
        images: [
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=900&auto=format&fit=crop&sat=-20",
            "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=900&auto=format&fit=crop&sat=-20",
        ],
    },
    {
        name: "Swimming Pool",
        images: [
            "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1535498730771-e735b998cd64?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=900&auto=format&fit=crop&sat=-20",
            "https://images.unsplash.com/photo-1535498730771-e735b998cd64?q=80&w=900&auto=format&fit=crop&sat=-20",
        ],
    },
    {
        name: "Reception",
        images: [
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=900&auto=format&fit=crop&sat=-20",
        ],
    },
    {
        name: "Exterior",
        images: [
            "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1506059612708-99d6c258160e?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=900&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=900&auto=format&fit=crop&sat=-20",
        ],
    },
];

// Ensures every row has enough slides for Swiper's loop mode to actually
// have room to move — otherwise loop silently disables navigation when
// the visible count equals the total slide count.
const MIN_SLIDES_FOR_LOOP = 8;

const getLoopSafeImages = (images) => {
    if (images.length >= MIN_SLIDES_FOR_LOOP) return images;
    const repeated = [];
    while (repeated.length < MIN_SLIDES_FOR_LOOP) {
        repeated.push(...images);
    }
    return repeated.slice(0, MIN_SLIDES_FOR_LOOP);
};

const CategoryRow = ({ row }) => {
    const swiperRef = useRef(null);
    const loopImages = getLoopSafeImages(row.images);

    return (
        <div className="gallery-category-rows__row">
            <div className="gallery-category-rows__row-header">
                <h3 className="gallery-category-rows__row-name">{row.name}</h3>
                <span className="gallery-category-rows__row-count">
                    {row.images.length} Photos
                </span>
            </div>

            <div className="gallery-category-rows__slider-wrap">
                <Swiper
                    modules={[Autoplay]}
                    onSwiper={(swiper) => {
                        swiperRef.current = swiper;
                    }}
                    loop={true}
                    slidesPerView={1.2}
                    spaceBetween={18}
                    speed={600}
                    autoplay={{
                        delay: 3500,
                        disableOnInteraction: false,
                        pauseOnMouseEnter: true,
                    }}
                    breakpoints={{
                        480: { slidesPerView: 1.6, spaceBetween: 18 },
                        640: { slidesPerView: 2.2, spaceBetween: 20 },
                        860: { slidesPerView: 2.8, spaceBetween: 22 },
                        1024: { slidesPerView: 3.2, spaceBetween: 24 },
                        1280: { slidesPerView: 3.6, spaceBetween: 24 }, // ✅ kept below total slide count so loop always has room
                    }}
                    className="gallery-category-rows__swiper"
                >
                    {loopImages.map((img, i) => (
                        <SwiperSlide key={i}>
                            <div className="gallery-category-rows__photo">
                                <img src={img} alt={`${row.name} ${(i % row.images.length) + 1}`} />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                <button
                    type="button"
                    className="gallery-category-rows__arrow gallery-category-rows__arrow--prev"
                    onClick={() => {
                        if (swiperRef.current && !swiperRef.current.destroyed) {
                            swiperRef.current.slidePrev();
                        }
                    }}
                    aria-label="Previous"
                >
                    <FaChevronLeft />
                </button>
                <button
                    type="button"
                    className="gallery-category-rows__arrow gallery-category-rows__arrow--next"
                    onClick={() => {
                        if (swiperRef.current && !swiperRef.current.destroyed) {
                            swiperRef.current.slideNext();
                        }
                    }}
                    aria-label="Next"
                >
                    <FaChevronRight />
                </button>
            </div>
        </div>
    );
};

const GalleryCategoryRows = () => {
    return (
        <section className="gallery-category-rows">
            <div className="gallery-category-rows__header">
                <span className="gallery-category-rows__eyebrow">Browse By Space</span>
                <h2 className="gallery-category-rows__title">
                    Every Corner, Captured
                </h2>
            </div>

            {rows.map((row) => (
                <CategoryRow row={row} key={row.name} />
            ))}
        </section>
    );
};

export default GalleryCategoryRows;