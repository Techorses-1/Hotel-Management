import React , {useEffect} from 'react'
import ContactHero from './Hero/ContactHero'
import ContactDetails from './ContactDetails/ContactDetails'
import ContactMap from './ContactMap/ContactMap'
import ContactCta from './ContactCta/ContactCta'

const Contact = () => {

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth", // Smooth scroll animation
    });
  }, []);
  return (
    <>
      <ContactHero />
      <ContactDetails />
      <ContactMap />
      <ContactCta />
    </>
  )
}

export default Contact