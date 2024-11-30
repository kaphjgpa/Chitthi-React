import React, { useState, useEffect, useRef } from "react";
import firebase from "firebase/compat/app";
import { useAuthState } from "react-firebase-hooks/auth";
import { useParams } from "react-router-dom";
import { auth, db, storage } from "../src/firebase";
import * as EmailValidator from "email-validator";
import "../components/css/Chitthi.css";
import { Avatar, IconButton } from "@material-ui/core";
// import Avatar from "@mui/material/Avatar";
import FindInPageOutlinedIcon from "@mui/icons-material/FindInPageOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import GroupIcon from "@mui/icons-material/Group";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CancelIcon from "@mui/icons-material/Cancel";
import AddIcon from "@mui/icons-material/Add";
import ImageIcon from "@mui/icons-material/Image";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import TelegramIcon from "@mui/icons-material/Telegram";
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
import { Diversity1Outlined } from "@mui/icons-material";
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
    e.preventDefault(); // Stop this from refreshing the page

    try {
      // Update user's last seen
      await setDoc(
        doc(db, "users", user.uid),
        { lastSeen: serverTimestamp() },
        { merge: true }
      );

      // Add message to the "messages" subcollection
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

      // Handle image upload if there's an image
      if (imageToMessage) {
        const uploadTaskRef = ref(storage, `images/${messageRef.id}`);
        const uploadTask = uploadString(
          uploadTaskRef,
          imageToMessage,
          "data_url"
        );

        removeImage();

        uploadTask
          .then(async () => {
            const url = await getDownloadURL(uploadTaskRef);

            // Update the message with the image URL
            await updateDoc(
              doc(db, "chats", chatId, "messages", messageRef.id),
              {
                sendImage: url,
              }
            );
          })
          .catch((error) => {
            console.error("Error uploading image:", error);
          });
      }

      setChatInput("");
      autoScroll.current.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error sending message:", error);
    }
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
              <ChatBubbleIcon
                onClick={() => setActive("Chats")}
                fontSize="default"
              />
              <h5>Chats</h5>
            </div>
            <br />
            <div className="Rooms">
              <GroupIcon
                onClick={() => setActive("Groups")}
                fontSize="default"
              />
              <h5>Rooms</h5>
            </div>
          </div>
          <div className="chitthi_buttom">
            <div className="Create_room">
              <GroupAddIcon onClick={createRoom} fontSize="small" />
              <h5>Create</h5>
              <h5>Room</h5>
            </div>
            <IconButton>
              <Avatar
                className="avatar"
                src={user.photoURL}
                onClick={() => auth.signOut()}
              />
            </IconButton>
          </div>
        </div>
        <div className="chitthi_wrapper_left">
          <div className="add_conversation">
            <button onClick={createChat} className="conversation_btn">
              <AddIcon className="add" fontSize="small" />{" "}
              <h5>New Conversation</h5>
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
            <IconButton>
              <FindInPageOutlinedIcon />
            </IconButton>
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
            <div className="chitthi_wrapper_center_top">
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
            <img src={user.photoURL} alt="" />
            <h4>{user.displayName}</h4>
            <p>{user.email}</p>
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
