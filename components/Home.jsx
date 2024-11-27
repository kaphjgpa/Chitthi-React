import React from "react";
import "../components/css/Home.css";
import BlackLogo from "/BlackLogo.png";

function Home() {
  return (
    <div className="home">
      <div className="hero_section">
        <div className="hero_left">
          <h1 className="hero_text">
            We have make "Secure" web
            <span className="with_underline"> messenger</span> that respect your
            privacy.
          </h1>
          <p className="hero_subheading">
            We do not believe in tracking our customers and collecting data from
            our precious users.
          </p>
        </div>
        <div className="hero_right">
          <img src={BlackLogo} alt="logo" />
        </div>
      </div>
      <div className="gradient1 hue_shift "></div>
      <div className="gradient2 hue_shift "></div>
    </div>
  );
}

export default Home;
