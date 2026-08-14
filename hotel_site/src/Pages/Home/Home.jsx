import React from 'react'
import HomeHero from './Hero/HomeHero'
import HomeAbout from './About/HomeAbout'
import FeaturedRooms from './FeaturedRooms/FeaturedRooms'
import HomeAmenitiesTabs from './Amenities/HomeAmenitiesTabs'
import HomeWhyChooseUs from './WhyChooseUs/HomeWhyChooseUs'
import HomeTestimonials from './Testimonilas/HomeTestimonials'
import HomeCta from './CTA/HomeCta'

const Home = () => {
  return (
    <>
    <HomeHero/>
    <HomeAbout/>
    <FeaturedRooms/>

    <HomeAmenitiesTabs/>
    <HomeWhyChooseUs/>
    <HomeTestimonials/>
    {/* <HomeCta/> */}
    </>
  )
}

export default Home