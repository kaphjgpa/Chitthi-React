import React from "react";
import { Link, useRouteError } from "react-router-dom"; // Correctly import hooks and Link
import "../components/css/Error.css";

import BlackLogo from "../public/BlackLogo.png";
import WhiteLogo from "../public/WhiteLogo.png";

const ErrorPage = () => {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="error_container">
      <div className="error_subcontainer">
        <div className="error_logo">
          <img src={BlackLogo} alt="Chitthi Logo" />
        </div>
        <div className="error_information">
          <h1>Oops, something went wrong</h1>
          <h3>Check your URL and try again</h3>
          <h5>We couldn’t find the page you’re looking for.</h5>
        </div>
        <div className="error_buttons">
          <Link to="/">
            <button className="app_btn error_btn">
              <img className="logo_btn" src={WhiteLogo} alt="logo" />
              HOME
            </button>
          </Link>
          <Link to="/mainapp">
            <button className="app_btn error_btn">
              <img className="logo_btn" src={WhiteLogo} alt="logo" /> GET IN APP
            </button>
          </Link>
        </div>
      </div>
      <div className="gradient41 hue_shift"></div>
      <div className="gradient42 hue_shift"></div>
      <div className="gradient45 hue_shift"></div>
    </div>
  );
};

export default ErrorPage;
