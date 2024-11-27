import React from "react";
import "../components/css/Navbar.css";
import WhiteLogo from "/WhiteLogo.png";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div className="navbar">
      <div className="navbar_left">
        <img className="logo" src={WhiteLogo} alt="logo" />
        <p>Chitthi</p>
      </div>
      <div className="navbar_right">
        <Link to="/mainapp">
          <button className="app_btn">
            <img className="logo_btn" src={WhiteLogo} alt="logo" /> GET IN APP
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Navbar;
