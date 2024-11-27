import React, { useState, useEffect } from "react";
import { Avatar } from "@material-ui/core";
import "../components/css/SidebarChat.css";
import { db } from "../src/firebase";
import { Link } from "react-router-dom";

function SidebarChat({ id, name, addNewChat }) {
  const [messages, setMessages] = useState("");

  useEffect(() => {
    if (id) {
      db.collection("rooms")
        .doc(id)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) =>
          setMessages(snapshot.docs.map((doc) => doc.data()))
        );
    }
  }, [id]);

  const createRoom = () => {
    const roomName = prompt("Please enter name for chat room");

    if (roomName) {
      db.collection("rooms").add({
        //do some clever database stuff
        name: roomName,
      });
    }
  };

  return !addNewChat ? (
    <Link to={`/mainapp/rooms/${id}`}>
      <div className="sidebarChat">
        <Avatar />
        <div className="sidebarChat_info">
          <h2>{name}</h2>
          <p>{messages[0]?.message}</p>
        </div>
      </div>
    </Link>
  ) : (
    <div onClick={createRoom} className="sidebarChat addNewChat">
      <h2>Create new Room</h2>
    </div>
  );
}

export default SidebarChat;
