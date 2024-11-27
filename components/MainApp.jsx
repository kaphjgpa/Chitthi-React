import React, { useEffect } from "react";
import "../components/css/MainApp.css";
import Login from "./Login";
// import Loading from "./Loading";
import firebase from "../src/firebase";
import { auth, db } from "../src/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Chitthi from "./Components/Chitthi";

function MainApp() {
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      db.collection("users").doc(user.uid).set(
        {
          email: user.email,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          photoURL: user.photoURL,
        },
        { merge: true }
      );
    }
  }, [user]);

  if (loading) return <Loading />;

  return (
    <div className="asdf">
      {!user ? (
        <Login />
      ) : (
        <div className="mainApp">
          <div className="gradient_layer">
            <Chitthi />
          </div>
        </div>
      )}
    </div>
  );
}

export default MainApp;
