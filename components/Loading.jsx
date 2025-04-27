import React from "react";
import BlackLogo from "../src/assets/images/BlackLogo.png";
import "./css/Loading.css";
import loading from "/unnamed.gif";

function Loading() {
  return (
    <div className="loading">
      <div className="loading_container">
        <div className="loading_logo">
          <img src={BlackLogo} alt="Logo" />
        </div>
        <div className="loading_icon">
          <div className="icon_loading">
            <img src={loading} alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Loading;
