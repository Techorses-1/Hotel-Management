import React from 'react'
import GalleryHero from './Hero/GalleryHero'
import GalleryMasonry from './GalleryShowcase/GalleryMasonry'
import GalleryCategoryRows from './GalleryShowcase/GalleryCategoryRows'

const Gallery = () => {
    return (
        <>
            <GalleryHero />

            {/* <GalleryMasonry /> */}
            <GalleryCategoryRows />
        </>
    )
}

export default Gallery