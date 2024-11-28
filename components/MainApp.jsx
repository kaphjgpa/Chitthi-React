import React, { useEffect } from "react";
import "../components/css/MainApp.css";
import Login from "./Login";
import Loading from "./Loading";
import { auth, db } from "../src/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Chitthi from "./Chitthi";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

function MainApp() {
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      setDoc(
        userRef,
        {
          email: user.email,
          lastSeen: serverTimestamp(),
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
