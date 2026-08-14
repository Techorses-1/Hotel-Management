// GalleryMasonry.jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./GalleryMasonry.scss";

const categories = ["All", "Hotel", "Rooms", "Restaurant", "Pool", "Reception", "Exterior"];

const photos = [
  { id: 1, cat: "Hotel", tall: true, src: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=900&auto=format&fit=crop" },
  { id: 2, cat: "Rooms", tall: false, src: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=900&auto=format&fit=crop" },
  { id: 3, cat: "Restaurant", tall: true, src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=900&auto=format&fit=crop" },
  { id: 4, cat: "Pool", tall: false, src: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=900&auto=format&fit=crop" },
  { id: 5, cat: "Reception", tall: true, src: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=900&auto=format&fit=crop" },
  { id: 6, cat: "Exterior", tall: false, src: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=900&auto=format&fit=crop" },
  { id: 7, cat: "Rooms", tall: true, src: "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=900&auto=format&fit=crop" },
  { id: 8, cat: "Hotel", tall: false, src: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?q=80&w=900&auto=format&fit=crop" },
  { id: 9, cat: "Pool", tall: true, src: "https://images.unsplash.com/photo-1535498730771-e735b998cd64?q=80&w=900&auto=format&fit=crop" },
  { id: 10, cat: "Rooms", tall: false, src: "https://images.unsplash.com/photo-1611048268330-53de574cae3b?q=80&w=900&auto=format&fit=crop" },
  { id: 11, cat: "Restaurant", tall: false, src: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=900&auto=format&fit=crop" },
  { id: 12, cat: "Exterior", tall: true, src: "https://images.unsplash.com/photo-1506059612708-99d6c258160e?q=80&w=900&auto=format&fit=crop" },
  { id: 13, cat: "Rooms", tall: false, src: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=900&auto=format&fit=crop" },
  { id: 14, cat: "Reception", tall: false, src: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=900&auto=format&fit=crop&sat=-30" },
  { id: 15, cat: "Hotel", tall: true, src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=900&auto=format&fit=crop" },
  { id: 16, cat: "Exterior", tall: false, src: "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=900&auto=format&fit=crop" },
];

const GalleryMasonry = () => {
  const [activeCat, setActiveCat] = useState("All");
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const filtered =
    activeCat === "All" ? photos : photos.filter((p) => p.cat === activeCat);

  const openLightbox = (idx) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);

  const nextImage = () =>
    setLightboxIdx((prev) => (prev + 1) % filtered.length);
  const prevImage = () =>
    setLightboxIdx((prev) => (prev - 1 + filtered.length) % filtered.length);

  return (
    <section className="gallery-masonry">
      <div className="gallery-masonry__container">
        {/* Filter Pills */}
        <div className="gallery-masonry__filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`gallery-masonry__filter ${
                activeCat === cat ? "gallery-masonry__filter--active" : ""
              }`}
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        <motion.div className="gallery-masonry__grid" layout>
          <AnimatePresence>
            {filtered.map((photo, idx) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className={`gallery-masonry__item ${
                  photo.tall ? "gallery-masonry__item--tall" : ""
                }`}
                onClick={() => openLightbox(idx)}
              >
                <img src={photo.src} alt={photo.cat} />
                <div className="gallery-masonry__item-overlay">
                  <span>{photo.cat}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            className="gallery-masonry__lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <button
              className="gallery-masonry__lightbox-close"
              onClick={closeLightbox}
            >
              <FaTimes />
            </button>

            <button
              className="gallery-masonry__lightbox-nav gallery-masonry__lightbox-nav--prev"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
            >
              <FaChevronLeft />
            </button>

            <motion.img
              key={filtered[lightboxIdx].id}
              src={filtered[lightboxIdx].src}
              alt={filtered[lightboxIdx].cat}
              className="gallery-masonry__lightbox-image"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            />

            <button
              className="gallery-masonry__lightbox-nav gallery-masonry__lightbox-nav--next"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
            >
              <FaChevronRight />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default GalleryMasonry;