import React from "react";
import { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import "../components/css/ChatTwo.css";
import { useAuthState } from "react-firebase-hooks/auth";
import { db, auth } from "../src/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import getRecipientEmail from "../components/utils/getRecipientEmail";

function ChatTwo({ id, users }) {
  const [user] = useAuthState(auth);
  const [recipient, setRecipient] = useState(null);
  const recipientEmail = getRecipientEmail(users, user);

  useEffect(() => {
    const fetchRecipient = async () => {
      if (recipientEmail) {
        const q = query(
          collection(db, "users"),
          where("email", "==", recipientEmail)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setRecipient(snapshot.docs[0].data());
        }
      }
    };

    fetchRecipient();
  }, [recipientEmail]);

  return (
    <Link to={`/mainapp/chat/${id}`}>
      <div className="chatTwo_Wrapper">
        {recipient ? (
          <Avatar src={recipient?.photoURL} className="avatar" />
        ) : (
          <Avatar>{recipientEmail[0]}</Avatar>
        )}
        <div className="recipient_info">
          <h2>{recipientEmail}</h2>
        </div>
      </div>
    </Link>
  );
}

export default ChatTwo;
