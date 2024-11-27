import React from "react";
import { Avatar } from "@material-ui/core";
import "../components/css/ChatTwo.css";
import { useAuthState } from "react-firebase-hooks/auth";
import { db, auth } from "../src/firebase";
import { useCollection } from "react-firebase-hooks/firestore";
import { Link } from "react-router-dom";
import getRecipientEmail from "../components/utils/getRecipientEmail";

function ChatTwo({ id, users }) {
  const [user] = useAuthState(auth);
  const [recipientSnapshot] = useCollection(
    db.collection("users").where("email", "==", getRecipientEmail(users, user))
  );
  const recipient = recipientSnapshot?.docs?.[0]?.data();
  const recipientEmail = getRecipientEmail(users, user);

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
