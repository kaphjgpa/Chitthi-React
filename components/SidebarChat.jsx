import React, { useState, useEffect } from "react";
import Avatar from "@mui/material/Avatar";
import "../components/css/SidebarChat.css";
import { db } from "../src/firebase";
import { Link } from "react-router-dom";
import {
  doc,
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
function SidebarChat({ id, name, addNewChat }) {
  const [messages, setMessages] = useState("");

  useEffect(() => {
    if (id) {
      // Create reference to the messages collection of a specific room
      const messagesRef = collection(doc(db, "rooms", id), "messages");
      const messagesQuery = query(messagesRef, orderBy("timestamp", "desc"));

      // Set up real-time listener for the messages collection
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        setMessages(snapshot.docs.map((doc) => doc.data()));
      });

      // Cleanup listener when the component is unmounted or id changes
      return () => unsubscribe();
    }
  }, [id]);

  const createRoom = async () => {
    const roomName = prompt("Please enter name for chat room");

    if (roomName) {
      try {
        await addDoc(collection(db, "rooms"), {
          name: roomName,
          // You can add other fields as needed, for example:
          createdAt: new Date(),
        });
      } catch (error) {
        console.error("Error creating room: ", error);
      }
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
