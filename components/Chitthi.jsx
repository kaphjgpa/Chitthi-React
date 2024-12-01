import React, { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useParams } from "react-router-dom";
import { auth, db, storage } from "../src/firebase";
import * as EmailValidator from "email-validator";
import "../components/css/Chitthi.css";
import { Avatar, IconButton } from "@material-ui/core";
// import Avatar from "@mui/material/Avatar";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CancelIcon from "@mui/icons-material/Cancel";
import BlackLogo from "/BlackLogo.png";
import ChatTwo from "./ChatTwo";
import SidebarChat from "./SidebarChat";
import Emoji from "./Emoji";

// After Update Firebase v9+
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import { getAuth } from "firebase/auth";
// import { firebaseConfig } from "./firebaseConfig";

function Chitthi() {
  const [user] = useAuthState(auth);
  // This is for Group Chat
  const [active, setActive] = useState("");
  const { roomId } = useParams();
  const [inputValue, setInputValue] = useState("");
  const [roomName, setRoomName] = useState("");
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  // Right Side of the Chitthi
  const [isOpen, setIsOpen] = useState(false);
  const [isDocOpen, setDocOpen] = useState(false);

  // This is for 1-1 Chat
  const { chatId } = useParams();
  const [chatInput, setChatInput] = useState("");
  // Image with messages
  const imagePickerRef = useRef(null);
  const imagePickerRefG = useRef(null);
  const [imageToMessage, setImageToMessage] = useState(null);
  const [imageToGroups, setImageToGroups] = useState(null);

  const [personMessages, setPersonMessages] = useState([]);
  const [personName, setPersonName] = useState("");
  // Add Emojis in Chats or Groups
  const [showEmojis, setShowEmojis] = useState(false);
  const [chosenEmoji, setChosenEmoji] = useState(null);

  const onEmojiClick = (event, emojiObject) => {
    setChosenEmoji(emojiObject);
  };

  // Logic behind Image with text in 1-1
  const addImageToMessage = (e) => {
    const reader = new FileReader();
    if (e.target.files[0]) {
      reader.readAsDataURL(e.target.files[0]);
    }
    reader.onload = (readerEvent) => {
      setImageToMessage(readerEvent.target.result);
    };
  };

  // Remove the image from State for 1-1
  const removeImage = () => {
    setImageToMessage(null);
  };

  // Auto Scroll to Bottom
  const autoScroll = useRef();

  // This code is for 1-1 Chat
  useEffect(() => {
    if (chatId) {
      // Setting up the chat reference to get chat details
      const chatRef = doc(db, "chats", chatId);
      const unsubscribeChat = onSnapshot(chatRef, (snapshot) => {
        setPersonName(snapshot.data()?.name);
      });

      // Setting up the messages reference to get ordered messages
      const messagesRef = collection(chatRef, "messages");
      const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        setPersonMessages(snapshot.docs.map((doc) => doc.data()));
      });

      // Cleanup listeners when chatId changes or component unmounts
      return () => {
        unsubscribeChat();
        unsubscribeMessages();
      };
    }
  }, [chatId]);

  const createChat = () => {
    const input = prompt(
      "Please enter an email address for the user you wish to chat with"
    );
    if (!input) return null;

    if (
      EmailValidator.validate(input) &&
      !chatAlreadyExists(input) &&
      input !== user.email
    ) {
      const chatsRef = collection(db, "chats");
      addDoc(chatsRef, {
        users: [user.email, input],
      });
    }
  };

  const userChatRef = query(
    collection(db, "chats"),
    where("users", "array-contains", user.email || null)
  );
  const [chatsSnapshot] = useCollection(userChatRef);

  const chatAlreadyExists = (recipientEmail) =>
    !!chatsSnapshot?.docs.find(
      (chat) =>
        chat.data().users.find((user) => user.email === recipientEmail)
          ?.length > 0
    );

  const SendMessageToChat = async (e) => {
    e.preventDefault(); // Prevent page refresh

    try {
      // Update last seen for the user
      await setDoc(
        doc(db, "users", user.uid),
        { lastSeen: serverTimestamp() },
        { merge: true }
      );

      // Add a new message to the chat
      const messageRef = await addDoc(
        collection(db, "chats", chatId, "messages"),
        {
          timestamp: serverTimestamp(),
          message: chatInput,
          name: user.displayName,
          user: user.email,
          photoURL: user.photoURL,
        }
      );

      // If there's an image to upload
      if (imageToMessage) {
        const imageRef = ref(storage, `images/${messageRef.id}`);
        const uploadTask = uploadString(imageRef, imageToMessage, "data_url");

        uploadTask
          .then(async () => {
            const url = await getDownloadURL(imageRef);

            // Update the message with the image URL
            await setDoc(
              doc(db, "chats", chatId, "messages", messageRef.id),
              { sendImage: url },
              { merge: true }
            );
          })
          .catch((error) => {
            console.error("Image upload failed: ", error);
          });

        removeImage();
      }
    } catch (error) {
      console.error("Error sending message: ", error);
    }

    setChatInput("");
    autoScroll.current.scrollIntoView({ behavior: "smooth" });
  };
  //room functionality
  //THIS FUNCTION MOUNT THE ALL ROOMS THAT ARE IN OUR DATABASE

  //-------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // Logic behind Images with text in Groups
  const addImageToGroup = (e) => {
    const greader = new FileReader();
    if (e.target.files[0]) {
      greader.readAsDataURL(e.target.files[0]);
    }
    greader.onload = (readerEvent) => {
      setImageToGroups(readerEvent.target.result);
    };
  };
  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // Remove the image from State for groups
  const removeGroupImage = () => {
    setImageToGroups(null);
  };

  useEffect(() => {
    const roomsRef = collection(db, "rooms");
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      setRooms(snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const createRoom = async () => {
    const roomName = prompt("Please enter name for Group");

    if (!roomName) return;

    try {
      await addDoc(collection(db, "rooms"), {
        name: roomName,
      });
    } catch (error) {
      console.error("Error adding room: ", error);
    }
  };

  useEffect(() => {
    if (roomId) {
      // Listening to room name
      const roomRef = doc(db, "rooms", roomId);
      const unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
        setRoomName(snapshot.data()?.name);
      });

      // Listening to messages collection ordered by timestamp
      const messagesRef = collection(db, "rooms", roomId, "messages");
      const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        setMessages(snapshot.docs.map((doc) => doc.data()));
      });

      // Clean up listeners on unmount or when roomId changes
      return () => {
        unsubscribeRoom();
        unsubscribeMessages();
      };
    }
  }, [roomId]);

  const SendMessageToRooms = (e) => {
    e.preventDefault();

    const messageRef = collection(db, "rooms", roomId, "messages");
    addDoc(messageRef, {
      message: inputValue,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      timestamp: new Date(),
    }).then((docRef) => {
      if (imageToGroups) {
        const imageRef = ref(storage, `groupsImages/${docRef.id}`);
        uploadString(imageRef, imageToGroups, "data_url")
          .then(() => {
            getDownloadURL(imageRef).then((url) => {
              const messageDoc = doc(
                db,
                "rooms",
                roomId,
                "messages",
                docRef.id
              );
              setDoc(messageDoc, { groupImage: url }, { merge: true });
            });
          })
          .catch((error) => console.error(error));
        removeGroupImage();
      }
    });

    setInputValue("");
    autoScroll.current.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="chitthi_wrapper">
      <div className="chitthi_body">
        <div className="chitthi_left">
          <div className="chitthi_top">
            <img className="chitthi_logo" src={BlackLogo} alt="logo" />
          </div>
          <div className="chitthi_center">
            <div className="Chats">
              <svg
                width="24px"
                height="24px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                onClick={() => setActive("Chats")}
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path
                    d="M20.97 1H18.03C16.76 1 16 1.76 16 3.03V5.97C16 7.24 16.76 8 18.03 8H20.97C22.24 8 23 7.24 23 5.97V3.03C23 1.76 22.24 1 20.97 1ZM21.61 4.68C21.24 5.86 19.95 6.5 19.5 6.5C19.05 6.5 17.77 5.88 17.39 4.68C17.33 4.5 17.3 4.3 17.3 4.11C17.3 3.46 17.63 2.79 18.32 2.57C18.73 2.44 19.17 2.51 19.48 2.77C19.8 2.52 20.24 2.44 20.66 2.57C21.58 2.86 21.87 3.89 21.61 4.68Z"
                    fill="#ffffff"
                  ></path>{" "}
                  <path
                    opacity="0.4"
                    d="M20.97 8H18.03C16.76 8 16 7.24 16 5.97V3.03C16 2.63 16.08 2.29 16.22 2H7C4.24 2 2 4.23 2 6.98V12.96V13.96C2 16.71 4.24 18.94 7 18.94H8.5C8.77 18.94 9.13 19.12 9.3 19.34L10.8 21.33C11.46 22.21 12.54 22.21 13.2 21.33L14.7 19.34C14.89 19.09 15.19 18.94 15.5 18.94H17C19.76 18.94 22 16.71 22 13.96V7.77C21.71 7.92 21.37 8 20.97 8Z"
                    fill="#ffffff"
                  ></path>{" "}
                  <path
                    d="M12 12C11.44 12 11 11.55 11 11C11 10.45 11.45 10 12 10C12.55 10 13 10.45 13 11C13 11.55 12.56 12 12 12Z"
                    fill="#ffffff"
                  ></path>{" "}
                  <path
                    d="M16 12C15.44 12 15 11.55 15 11C15 10.45 15.45 10 16 10C16.55 10 17 10.45 17 11C17 11.55 16.56 12 16 12Z"
                    fill="#ffffff"
                  ></path>{" "}
                  <path
                    d="M8 12C7.44 12 7 11.55 7 11C7 10.45 7.45 10 8 10C8.55 10 9 10.45 9 11C9 11.55 8.56 12 8 12Z"
                    fill="#ffffff"
                  ></path>{" "}
                </g>
              </svg>
              <h5>Chats</h5>
            </div>
            <br />
            <div className="Rooms">
              <svg
                width="24px"
                height="24px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                onClick={() => setActive("Groups")}
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path
                    d="M3 19V18C3 15.7909 4.79086 14 7 14H11C13.2091 14 15 15.7909 15 18V19M15 11C16.6569 11 18 9.65685 18 8C18 6.34315 16.6569 5 15 5M21 19V18C21 15.7909 19.2091 14 17 14H16.5M12 8C12 9.65685 10.6569 11 9 11C7.34315 11 6 9.65685 6 8C6 6.34315 7.34315 5 9 5C10.6569 5 12 6.34315 12 8Z"
                    stroke="#ffffff"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>{" "}
                </g>
              </svg>
              <h5>Rooms</h5>
            </div>
          </div>
          <div className="chitthi_buttom">
            <div className="Create_room">
              <svg
                width="24px"
                height="24px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                onClick={createRoom}
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <circle
                    cx="9"
                    cy="9"
                    r="3"
                    stroke="#ffffff"
                    stroke-width="2"
                    stroke-linecap="round"
                  ></circle>{" "}
                  <path
                    d="M12.2679 9C12.5332 8.54063 12.97 8.20543 13.4824 8.06815C13.9947 7.93086 14.5406 8.00273 15 8.26795C15.4594 8.53317 15.7946 8.97 15.9319 9.48236C16.0691 9.99472 15.9973 10.5406 15.7321 11C15.4668 11.4594 15.03 11.7946 14.5176 11.9319C14.0053 12.0691 13.4594 11.9973 13 11.7321C12.5406 11.4668 12.2054 11.03 12.0681 10.5176C11.9309 10.0053 12.0027 9.45937 12.2679 9L12.2679 9Z"
                    stroke="#ffffff"
                    stroke-width="2"
                  ></path>{" "}
                  <path
                    d="M13.8816 19L12.9013 19.1974L13.0629 20H13.8816V19ZM17.7202 17.9042L18.6627 17.5699L17.7202 17.9042ZM11.7808 15.7105L11.176 14.9142L10.0194 15.7927L11.2527 16.5597L11.7808 15.7105ZM16.8672 18H13.8816V20H16.8672V18ZM16.7777 18.2384C16.7707 18.2186 16.7642 18.181 16.7725 18.1354C16.7804 18.0921 16.7982 18.0593 16.8151 18.0383C16.8474 17.9982 16.874 18 16.8672 18V20C18.0132 20 19.1414 18.9194 18.6627 17.5699L16.7777 18.2384ZM14 16C15.6416 16 16.4027 17.1811 16.7777 18.2384L18.6627 17.5699C18.1976 16.2588 16.9485 14 14 14V16ZM12.3857 16.5069C12.7702 16.2148 13.282 16 14 16V14C12.8381 14 11.9028 14.3622 11.176 14.9142L12.3857 16.5069ZM11.2527 16.5597C12.2918 17.206 12.7271 18.3324 12.9013 19.1974L14.8619 18.8026C14.644 17.7204 14.0374 15.9364 12.309 14.8614L11.2527 16.5597Z"
                    fill="#ffffff"
                  ></path>{" "}
                  <path
                    d="M9 15C12.5715 15 13.5919 17.5512 13.8834 19.0089C13.9917 19.5504 13.5523 20 13 20H5C4.44772 20 4.00829 19.5504 4.11659 19.0089C4.4081 17.5512 5.42846 15 9 15Z"
                    stroke="#ffffff"
                    stroke-width="2"
                    stroke-linecap="round"
                  ></path>{" "}
                  <path
                    d="M19 3V7"
                    stroke="#ffffff"
                    stroke-width="2"
                    stroke-linecap="round"
                  ></path>{" "}
                  <path
                    d="M21 5L17 5"
                    stroke="#ffffff"
                    stroke-width="2"
                    stroke-linecap="round"
                  ></path>{" "}
                </g>
              </svg>
              <h5>Create</h5>
              <h5>Room</h5>
            </div>
            <Avatar
              className="avatar"
              src={user.photoURL}
              onClick={() => auth.signOut()}
            />
          </div>
        </div>
        <div className="chitthi_wrapper_left">
          <div className="add_conversation">
            <button onClick={createChat} className="conversation_btn">
              <svg
                width="24px"
                height="24px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g
                  id="SVGRepo_tracerCarrier"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                ></g>
                <g id="SVGRepo_iconCarrier">
                  {" "}
                  <path
                    opacity="0.4"
                    d="M21.0901 21.5C21.0901 21.78 20.8701 22 20.5901 22H3.41016C3.13016 22 2.91016 21.78 2.91016 21.5C2.91016 17.36 6.99015 14 12.0002 14C13.0302 14 14.0302 14.14 14.9502 14.41C14.3602 15.11 14.0002 16.02 14.0002 17C14.0002 17.75 14.2101 18.46 14.5801 19.06C14.7801 19.4 15.0401 19.71 15.3401 19.97C16.0401 20.61 16.9702 21 18.0002 21C19.1202 21 20.1302 20.54 20.8502 19.8C21.0102 20.34 21.0901 20.91 21.0901 21.5Z"
                    fill="#ffffff"
                  ></path>{" "}
                  <path
                    d="M20.97 14.33C20.25 13.51 19.18 13 18 13C16.88 13 15.86 13.46 15.13 14.21C14.43 14.93 14 15.92 14 17C14 17.75 14.21 18.46 14.58 19.06C14.78 19.4 15.04 19.71 15.34 19.97C16.04 20.61 16.97 21 18 21C19.46 21 20.73 20.22 21.42 19.06C21.63 18.72 21.79 18.33 21.88 17.93C21.96 17.63 22 17.32 22 17C22 15.98 21.61 15.04 20.97 14.33ZM19.5 17.73H18.75V18.51C18.75 18.92 18.41 19.26 18 19.26C17.59 19.26 17.25 18.92 17.25 18.51V17.73H16.5C16.09 17.73 15.75 17.39 15.75 16.98C15.75 16.57 16.09 16.23 16.5 16.23H17.25V15.52C17.25 15.11 17.59 14.77 18 14.77C18.41 14.77 18.75 15.11 18.75 15.52V16.23H19.5C19.91 16.23 20.25 16.57 20.25 16.98C20.25 17.39 19.91 17.73 19.5 17.73Z"
                    fill="#ffffff"
                  ></path>{" "}
                  <path
                    d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                    fill="#ffffff"
                  ></path>{" "}
                </g>
              </svg>{" "}
              <h5 className="Conversation">New Conversation</h5>
            </button>
          </div>
          <div className="chat_heading">
            <div className="text_chat">
              {active === "Chats" && <h1>Chats</h1>}
              {active === "Groups" && <h1>Groups</h1>}
            </div>
            <div className="dots">
              <MoreHorizIcon fontSize="small" />
            </div>
          </div>
          <div className="search_bar">
            <input type="text" placeholder="Search here" />
            <svg
              className="user_search"
              width="24px"
              height="24px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                {" "}
                <path
                  d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                  fill="#ffffff"
                ></path>{" "}
                <path
                  opacity="0.4"
                  d="M12.0002 14.5C6.99018 14.5 2.91016 17.86 2.91016 22C2.91016 22.28 3.13016 22.5 3.41016 22.5H20.5902C20.8702 22.5 21.0902 22.28 21.0902 22C21.0902 17.86 17.0102 14.5 12.0002 14.5Z"
                  fill="#ffffff"
                ></path>{" "}
                <path
                  d="M22.77 20.68L22.01 19.92C22.41 19.32 22.64 18.6 22.64 17.83C22.64 15.72 20.93 14.01 18.82 14.01C16.71 14.01 15 15.72 15 17.83C15 19.94 16.71 21.65 18.82 21.65C19.59 21.65 20.31 21.42 20.91 21.02L21.67 21.78C21.82 21.93 22.02 22.01 22.22 22.01C22.42 22.01 22.62 21.93 22.77 21.78C23.08 21.47 23.08 20.98 22.77 20.68Z"
                  fill="#ffffff"
                ></path>{" "}
              </g>
            </svg>
          </div>
          <div className="chats_holder">
            {active === "Chats" &&
              chatsSnapshot?.docs.map((chat) => (
                <ChatTwo key={chat.id} id={chat.id} users={chat.data().users} />
              ))}
            <div ref={autoScroll}></div>
          </div>
          <div className="chats_holder">
            {active === "Groups" &&
              rooms.map((room) => (
                <SidebarChat key={room.id} id={room.id} name={room.data.name} />
              ))}

            <div ref={autoScroll}></div>
          </div>
        </div>
        {/* This is where the Group ChatScreens are Mounted */}
        {active === "Groups" && (
          <div className="chitthi_wrapper_center">
            <div className="chitthi_wrapper_center_top_group">
              <div className="chitthi_wrapper_center_top_left">
                <Avatar />
                <div className="recipient_info">
                  <h2>{roomName}</h2>
                  <p className="lastSeen">
                    Last seen{" "}
                    {new Date(
                      messages[messages.length - 1]?.timestamp?.toDate()
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="chat_screen">
              {messages.map((message) => (
                <div
                  className={`chat_message ${
                    message.name === user.displayName && "chat_reciever"
                  }`}
                >
                  {message.groupImage && (
                    <div className="send_Image">
                      <img src={message.groupImage} alt="" />
                    </div>
                  )}
                  <p className="message">{message.message}</p>
                  <span className="chat_timestamp">
                    {new Date(message.timestamp?.toDate()).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="autoScroll" ref={autoScroll}></div>
            </div>
            {showEmojis ? (
              <Emoji className="emoji_tray" onEmojiClick={onEmojiClick} />
            ) : null}
            {imageToGroups && (
              <div className="send_Image_Container">
                <CancelIcon
                  className="cancel_btn"
                  fontSize="small"
                  color="error"
                  onClick={removeGroupImage}
                />
                <img src={imageToGroups} alt="Selected Image" />
                {/* Audio support is coming soon */}
              </div>
            )}
            <div className="chitthi_chat_footer">
              <div className="add_docs">
                <svg
                  width="24px"
                  height="24px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => imagePickerRefG.current.click()}
                >
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <path
                      d="M14.2639 15.9375L12.5958 14.2834C11.7909 13.4851 11.3884 13.086 10.9266 12.9401C10.5204 12.8118 10.0838 12.8165 9.68048 12.9536C9.22188 13.1095 8.82814 13.5172 8.04068 14.3326L4.04409 18.2801M14.2639 15.9375L14.6053 15.599C15.4112 14.7998 15.8141 14.4002 16.2765 14.2543C16.6831 14.126 17.12 14.1311 17.5236 14.2687C17.9824 14.4251 18.3761 14.8339 19.1634 15.6514L20 16.4934M14.2639 15.9375L18.275 19.9565M18.275 19.9565C17.9176 20 17.4543 20 16.8 20H7.2C6.07989 20 5.51984 20 5.09202 19.782C4.71569 19.5903 4.40973 19.2843 4.21799 18.908C4.12796 18.7313 4.07512 18.5321 4.04409 18.2801M18.275 19.9565C18.5293 19.9256 18.7301 19.8727 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V16.4934M4.04409 18.2801C4 17.9221 4 17.4575 4 16.8V7.2C4 6.0799 4 5.51984 4.21799 5.09202C4.40973 4.71569 4.71569 4.40973 5.09202 4.21799C5.51984 4 6.07989 4 7.2 4H16.8C17.9201 4 18.4802 4 18.908 4.21799C19.2843 4.40973 19.5903 4.71569 19.782 5.09202C20 5.51984 20 6.0799 20 7.2V16.4934M17 8.99989C17 10.1045 16.1046 10.9999 15 10.9999C13.8954 10.9999 13 10.1045 13 8.99989C13 7.89532 13.8954 6.99989 15 6.99989C16.1046 6.99989 17 7.89532 17 8.99989Z"
                      stroke="#000000"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>{" "}
                  </g>
                </svg>
                <input
                  ref={imagePickerRefG}
                  onChange={addImageToGroup}
                  type="file"
                  hidden
                />
              </div>
              <div className="input_bar">
                <form className="Form">
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    type="text"
                    placeholder="Type a message"
                  />
                  <button
                    className="Send_button"
                    disabled={inputValue === ""}
                    onClick={SendMessageToRooms}
                    type="submit"
                  >
                    <svg
                      fill="#000000"
                      height="22px"
                      width="22px"
                      version="1.1"
                      id="Capa_1"
                      xmlns="http://www.w3.org/2000/svg"
                      xmlns:xlink="http://www.w3.org/1999/xlink"
                      viewBox="0 0 495.003 495.003"
                      xml:space="preserve"
                    >
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        {" "}
                        <g id="XMLID_51_">
                          {" "}
                          <path
                            id="XMLID_53_"
                            d="M164.711,456.687c0,2.966,1.647,5.686,4.266,7.072c2.617,1.385,5.799,1.207,8.245-0.468l55.09-37.616 l-67.6-32.22V456.687z"
                          ></path>{" "}
                          <path
                            id="XMLID_52_"
                            d="M492.431,32.443c-1.513-1.395-3.466-2.125-5.44-2.125c-1.19,0-2.377,0.264-3.5,0.816L7.905,264.422 c-4.861,2.389-7.937,7.353-7.904,12.783c0.033,5.423,3.161,10.353,8.057,12.689l125.342,59.724l250.62-205.99L164.455,364.414 l156.145,74.4c1.918,0.919,4.012,1.376,6.084,1.376c1.768,0,3.519-0.322,5.186-0.977c3.637-1.438,6.527-4.318,7.97-7.956 L494.436,41.257C495.66,38.188,494.862,34.679,492.431,32.443z"
                          ></path>{" "}
                        </g>{" "}
                      </g>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* This is where the Chats ChatScreens are Mounted  */}
        {active === "Chats" && (
          <div className="chitthi_wrapper_center">
            <div className="chitthi_wrapper_center_top">
              <div className="chitthi_wrapper_center_top_left">
                <div className="recipient_info">
                  <p className="lastSeen">
                    Last seen{" "}
                    {new Date(
                      personMessages[
                        personMessages.length - 1
                      ]?.timestamp?.toDate()
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="chat_screen">
              {personMessages.map((message) => (
                <div
                  className={`chat_message ${
                    message.user === user.email && "chat_reciever"
                  }`}
                >
                  {message.sendImage && (
                    <div className="send_Image">
                      <img src={message.sendImage} alt="" />
                    </div>
                  )}
                  <p>{message.message}</p>
                  <span className="chat_timestamp">
                    {new Date(message.timestamp?.toDate()).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="autoScroll" ref={autoScroll}></div>
            </div>
            {showEmojis ? (
              <Emoji className="emoji_tray" onEmojiClick={onEmojiClick} />
            ) : null}
            {imageToMessage && (
              <div className="send_Image_Container">
                <CancelIcon
                  className="cancel_btn"
                  fontSize="small"
                  color="error"
                  onClick={removeImage}
                />
                <img src={imageToMessage} alt="Selected Image" />
              </div>
            )}
            <div className="chitthi_chat_footer">
              <div className="add_docs">
                <svg
                  width="24px"
                  height="24px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={() => imagePickerRef.current.click()}
                >
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <path
                      d="M14.2639 15.9375L12.5958 14.2834C11.7909 13.4851 11.3884 13.086 10.9266 12.9401C10.5204 12.8118 10.0838 12.8165 9.68048 12.9536C9.22188 13.1095 8.82814 13.5172 8.04068 14.3326L4.04409 18.2801M14.2639 15.9375L14.6053 15.599C15.4112 14.7998 15.8141 14.4002 16.2765 14.2543C16.6831 14.126 17.12 14.1311 17.5236 14.2687C17.9824 14.4251 18.3761 14.8339 19.1634 15.6514L20 16.4934M14.2639 15.9375L18.275 19.9565M18.275 19.9565C17.9176 20 17.4543 20 16.8 20H7.2C6.07989 20 5.51984 20 5.09202 19.782C4.71569 19.5903 4.40973 19.2843 4.21799 18.908C4.12796 18.7313 4.07512 18.5321 4.04409 18.2801M18.275 19.9565C18.5293 19.9256 18.7301 19.8727 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V16.4934M4.04409 18.2801C4 17.9221 4 17.4575 4 16.8V7.2C4 6.0799 4 5.51984 4.21799 5.09202C4.40973 4.71569 4.71569 4.40973 5.09202 4.21799C5.51984 4 6.07989 4 7.2 4H16.8C17.9201 4 18.4802 4 18.908 4.21799C19.2843 4.40973 19.5903 4.71569 19.782 5.09202C20 5.51984 20 6.0799 20 7.2V16.4934M17 8.99989C17 10.1045 16.1046 10.9999 15 10.9999C13.8954 10.9999 13 10.1045 13 8.99989C13 7.89532 13.8954 6.99989 15 6.99989C16.1046 6.99989 17 7.89532 17 8.99989Z"
                      stroke="#000000"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>{" "}
                  </g>
                </svg>
                <input
                  ref={imagePickerRef}
                  onChange={addImageToMessage}
                  type="file"
                  hidden
                />
              </div>
              <div className="input_bar">
                <form className="Form">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    type="text"
                    placeholder="Type a message"
                  />
                  <button
                    className="Send_button"
                    disabled={chatInput === ""}
                    onClick={SendMessageToChat}
                    type="submit"
                  >
                    <svg
                      fill="#000000"
                      height="22px"
                      width="22px"
                      version="1.1"
                      id="Capa_1"
                      xmlns="http://www.w3.org/2000/svg"
                      xmlns:xlink="http://www.w3.org/1999/xlink"
                      viewBox="0 0 495.003 495.003"
                      xml:space="preserve"
                    >
                      <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        {" "}
                        <g id="XMLID_51_">
                          {" "}
                          <path
                            id="XMLID_53_"
                            d="M164.711,456.687c0,2.966,1.647,5.686,4.266,7.072c2.617,1.385,5.799,1.207,8.245-0.468l55.09-37.616 l-67.6-32.22V456.687z"
                          ></path>{" "}
                          <path
                            id="XMLID_52_"
                            d="M492.431,32.443c-1.513-1.395-3.466-2.125-5.44-2.125c-1.19,0-2.377,0.264-3.5,0.816L7.905,264.422 c-4.861,2.389-7.937,7.353-7.904,12.783c0.033,5.423,3.161,10.353,8.057,12.689l125.342,59.724l250.62-205.99L164.455,364.414 l156.145,74.4c1.918,0.919,4.012,1.376,6.084,1.376c1.768,0,3.519-0.322,5.186-0.977c3.637-1.438,6.527-4.318,7.97-7.956 L494.436,41.257C495.66,38.188,494.862,34.679,492.431,32.443z"
                          ></path>{" "}
                        </g>{" "}
                      </g>
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* Right Side of the Chitthi */}
        <div className="chitthi_wrapper_right">
          <div className="user_profile">
            <div>
              <img className="user_image" src={user.photoURL} alt="" />
            </div>
            <div className="info">
              <h4>{user.displayName}</h4>
              <p>{user.email}</p>
            </div>
          </div>
          {/* Only Chat Images */}
          {active === "Chats" && (
            <div className="user_images">
              <div className="sub_heading_container">
                <h3>Images</h3>
                <svg
                  className="down_arrow"
                  width="24px"
                  height="24px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="#000000"
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <path
                      d="M12 6V18M12 18L7 13M12 18L17 13"
                      stroke="#ffffff"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>{" "}
                  </g>
                </svg>
              </div>
              {personMessages.map((message) => (
                <div className="image_container_holder">
                  {isOpen && (
                    <div className="images_container">
                      {message.sendImage && (
                        <div className="both_users_images">
                          <img
                            className="image"
                            src={message.sendImage}
                            alt=""
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Only Groups Images */}
          {active === "Groups" && (
            <div className="user_images">
              <div className="sub_heading_container">
                <h3>Images</h3>
                <svg
                  className="down_arrow"
                  width="24px"
                  height="24px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="#000000"
                  onClick={() => setDocOpen(!isDocOpen)}
                >
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <path
                      d="M12 6V18M12 18L7 13M12 18L17 13"
                      stroke="#ffffff"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    ></path>{" "}
                  </g>
                </svg>
              </div>
              {messages.map((message) => (
                <div className="image_container_holder">
                  {isDocOpen && (
                    <div className="images_container">
                      {message.groupImage && (
                        <div className="both_users_images">
                          <img
                            className="image"
                            src={message.groupImage}
                            alt=""
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default Chitthi;
