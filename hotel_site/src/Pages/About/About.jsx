import React, { useEffect } from 'react'
import AboutHero from './Hero/AboutHero'
import AboutStory from './AboutStory/AboutStory'
import AboutMissionVisionCards from './MissionVision/AboutMissionVisionCards'
// import FacilitiesExpand from './Facilities/FacilitiesExpand'
import FacilitiesScrollSnap from './Facilities/FacilitiesScrollSnap'
import AboutNearbyAttractions from './NearbyAttractions/AboutNearbyAttractions'

const About = () => {

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth", // Smooth scroll animation
    });
  }, []);


  return (
    <>
      <AboutHero />
      <AboutStory />
      <AboutMissionVisionCards />

      {/* <FacilitiesExpand/> */}
      <FacilitiesScrollSnap />
      <AboutNearbyAttractions />
    </>
  )
}

export default About