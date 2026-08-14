// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import useSmoothScroll from "./Components/SmoothScroll/useSmoothScroll";

import ScrollToTop from "./Components/GoToTop/ScrollToTop";
import Home from "./Pages/Home/Home";
import Navbar from "./Components/Navbar/Navbar";
import Footer from "./Components/Footer/Footer";
import Contact from "./Pages/Contact/Contact";
import About from "./Pages/About/About";
import Rooms from "./Pages/Rooms/Rooms";
import Gallery from "./Pages/Gallery/Gallery";

const AppContent = () => {
  const location = useLocation();

  return (
    <>
      <Navbar />
      <div>
        {/* key forces a full clean unmount/remount on every route change,
            avoiding conflicts with GSAP's pin-spacer DOM manipulation */}
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/room" element={<Rooms />} />
          <Route path="/gallery" element={<Gallery />} />
        </Routes>
      </div>
      <Footer />
    </>
  );
};

function App() {
  useSmoothScroll();

  return (
    <Router>
      <ScrollToTop />
      <AppContent />
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;