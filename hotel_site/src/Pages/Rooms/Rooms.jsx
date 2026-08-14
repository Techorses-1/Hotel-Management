import React , {useEffect} from 'react'
import RoomsHero from './Hero/RoomsHero'
import RoomsInfo from './RoomsInfo/RoomsInfo'
import RoomsGalleryTabs from './Gallary/RoomsGalleryTabs'
// import RoomsGalleryZigzag from './Gallary/RoomsGalleryZigzag'
import BookingContactSplit from './Booking/BookingContactSplit'
import FloatingContactDock from './Booking/FloatingContactDock'

const Rooms = () => {


    useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth", // Smooth scroll animation
    });
  }, []);
    return (
        <>
            <RoomsHero />
            <RoomsInfo />

            <RoomsGalleryTabs />
            {/* <RoomsGalleryZigzag /> */}

            <FloatingContactDock />
            <BookingContactSplit />

        </>
    )
}

export default Rooms