import React from "react";
import "../components/css/Login.css";
import { provider, auth } from "../src/firebase"; // Combined Firebase imports
import { signInWithPopup } from "firebase/auth"; // Import from Firebase v9
import Button from "@mui/material/Button";
import WhiteLogo from "/WhiteLogo.png";
import Google_Logo from "/Google_Logo.png";
import { Helmet } from "react-helmet"; // For managing document head

function Login() {
  const signIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert(`Sign-in failed: ${error.message}`);
    }
  };

  return (
    <div className="login">
      {/* Use Helmet to manage document head */}
      <Helmet>
        <title>Login - Chitthi</title>
      </Helmet>
      <h1 className="login_heading">Login</h1>
      <div className="login_wrapper">
        <div className="image_container">
          {/* Add login illustration here if needed */}
        </div>
        <div className="login_container">
          <img src={WhiteLogo} alt="Chitthi Logo" />
          <div className="login_text">
            <h1>Sign in to Chitthi</h1>
          </div>
          <Button onClick={signIn} className="button">
            <img className="google_logo" src={Google_Logo} alt="Google Logo" />
            SIGN IN WITH GOOGLE
          </Button>
        </div>
      </div>
      <div className="gradient_login"></div>
      <div className="gradient_login2"></div>
    </div>
  );
}

export default Login;
