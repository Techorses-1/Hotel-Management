// FeaturedRooms.jsx - UPDATED
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { 
    FaBed, 
    FaUserFriends, 
    FaWifi, 
    FaArrowRight,
    FaChevronLeft,
    FaChevronRight 
} from "react-icons/fa";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import "./FeaturedRooms.scss";

gsap.registerPlugin(ScrollTrigger);

const rooms = [
    {
        id: 1,
        name: "Deluxe Room",
        tagline: "Cozy comfort with a city view",
        price: "120",
        image:
            "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=1200&auto=format&fit=crop",
        guests: 2,
        bed: "Queen Bed",
    },
    {
        id: 2,
        name: "Executive Suite",
        tagline: "Spacious living with a private lounge",
        price: "210",
        image:
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1200&auto=format&fit=crop",
        guests: 3,
        bed: "King Bed",
    },
    {
        id: 3,
        name: "Family Room",
        tagline: "Extra space designed for togetherness",
        price: "180",
        image:
            "https://images.unsplash.com/photo-1611048268330-53de574cae3b?q=80&w=1200&auto=format&fit=crop",
        guests: 4,
        bed: "2 Queen Beds",
    },
    {
        id: 4,
        name: "Premium Suite",
        tagline: "Our finest stay, top to bottom",
        price: "260",
        image:
            "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=1200&auto=format&fit=crop",
        guests: 2,
        bed: "King Bed",
    },
];

const FeaturedRooms = () => {
    const sectionRef = useRef(null);
    const cardsRef = useRef([]);

    cardsRef.current = [];
    const addToCards = (el) => {
        if (el && !cardsRef.current.includes(el)) {
            cardsRef.current.push(el);
        }
    };

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                cardsRef.current,
                { y: 60, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: "power3.out",
                    stagger: 0.15,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top 75%",
                    },
                }
            );
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section className="featured-rooms" ref={sectionRef}>
            <div className="featured-rooms__container">
                <div className="featured-rooms__header">
                    <span className="featured-rooms__eyebrow">Our Rooms</span>
                    <h2 className="featured-rooms__title">Featured Rooms & Suites</h2>
                    <p className="featured-rooms__subtext">
                        A handpicked selection of our most loved stays - each designed
                        with comfort and quiet luxury in mind.
                    </p>
                </div>

                {/* Desktop Grid View */}
                <div className="featured-rooms__grid featured-rooms__grid--desktop">
                    {rooms.map((room) => (
                        <div
                            className="featured-rooms__card"
                            key={room.id}
                            ref={addToCards}
                        >
                            <div className="featured-rooms__image-wrap">
                                <img
                                    src={room.image}
                                    alt={room.name}
                                    className="featured-rooms__image"
                                />
                                <span className="featured-rooms__price">
                                    ₹{room.price}
                                    <span>/ day</span>
                                </span>
                            </div>

                            <div className="featured-rooms__content">
                                <h3 className="featured-rooms__name">{room.name}</h3>
                                <p className="featured-rooms__tagline">{room.tagline}</p>

                                <div className="featured-rooms__amenities">
                                    <span className="featured-rooms__amenity">
                                        <FaBed /> {room.bed}
                                    </span>
                                    <span className="featured-rooms__amenity">
                                        <FaUserFriends /> {room.guests} Guests
                                    </span>
                                    <span className="featured-rooms__amenity">
                                        <FaWifi /> Free Wifi
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tablet & Mobile Slider View */}
                <div className="featured-rooms__slider">
                    <Swiper
                        modules={[Navigation]}
                        navigation={{
                            nextEl: '.featured-rooms__swiper-next',
                            prevEl: '.featured-rooms__swiper-prev',
                        }}
                        spaceBetween={24}
                        slidesPerView={1}
                        breakpoints={{
                            641: {
                                slidesPerView: 2,
                                spaceBetween: 24,
                            },
                        }}
                        className="featured-rooms__swiper"
                    >
                        {rooms.map((room) => (
                            <SwiperSlide key={room.id}>
                                <div className="featured-rooms__card">
                                    <div className="featured-rooms__image-wrap">
                                        <img
                                            src={room.image}
                                            alt={room.name}
                                            className="featured-rooms__image"
                                        />
                                        <span className="featured-rooms__price">
                                            ₹{room.price}
                                            <span>/ day</span>
                                        </span>
                                    </div>

                                    <div className="featured-rooms__content">
                                        <h3 className="featured-rooms__name">{room.name}</h3>
                                        <p className="featured-rooms__tagline">{room.tagline}</p>

                                        <div className="featured-rooms__amenities">
                                            <span className="featured-rooms__amenity">
                                                <FaBed /> {room.bed}
                                            </span>
                                            <span className="featured-rooms__amenity">
                                                <FaUserFriends /> {room.guests} Guests
                                            </span>
                                            <span className="featured-rooms__amenity">
                                                <FaWifi /> Free Wifi
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* Arrows - Below cards, RIGHT SIDE */}
                    <div className="featured-rooms__slider-arrows">
                        <button className="featured-rooms__swiper-prev">
                            <FaChevronLeft />
                        </button>
                        <button className="featured-rooms__swiper-next">
                            <FaChevronRight />
                        </button>
                    </div>
                </div>

                {/* View All Button - CENTER - Links to /rooms */}
                <div className="featured-rooms__footer">
                    <a href="/room" className="featured-rooms__view-all">
                        View All Rooms <FaArrowRight />
                    </a>
                </div>
            </div>
        </section>
    );
};

export default FeaturedRooms;