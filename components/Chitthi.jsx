import React, { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useParams } from "react-router-dom";
import { auth, db, storage } from "../src/firebase";
import * as EmailValidator from "email-validator";
import "../components/css/Chitthi.css";
import { Avatar } from "@material-ui/core";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CancelIcon from "@mui/icons-material/Cancel";
import BlackLogo from "/BlackLogo.png";
import ChatTwo from "./ChatTwo";
import SidebarChat from "./SidebarChat";
import { Helmet } from "react-helmet"; // For managing document head
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";

// After Update Firebase v9+
import {
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
import { ref, uploadString, getDownloadURL } from "firebase/storage";

function Chitthi({ users }) {
  const [user] = useAuthState(auth);
  // This is for Group Chat
  const [active, setActive] = useState("");
  const { roomId } = useParams();
  const [inputValue, setInputValue] = useState(""); //
  const [roomName, setRoomName] = useState("");
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  // Right Side of the Chitthi
  const [isOpen, setIsOpen] = useState(false);
  const [isDocOpen, setDocOpen] = useState(false);

  // This is for 1-1 Chat
  const { chatId } = useParams();
  const [chatInput, setChatInput] = useState(""); // take chatInput and Emoji and merj them
  // Add Emojis in Chats and Groups
  const [isVisible, setIsVisible] = useState(false);
  // const [Emoji, setEmoji] = useState("");

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev); // Toggle visibility
  };
  // Image with messages
  const imagePickerRef = useRef(null);
  const imagePickerRefG = useRef(null);
  const [imageToMessage, setImageToMessage] = useState(null);
  const [imageToGroups, setImageToGroups] = useState(null);

  const [personMessages, setPersonMessages] = useState([]);
  const [personName, setPersonName] = useState("");

  // Logic behind Image with text in 1-1
  const addImageToMessage = (e) => {
    const reader = new FileReader();
    if (e.target.files[0]) {
      reader.readAsDataURL(e.target.files[0]);
    }
    reader.onload = (readerEvent) => {
      setImageToMessage(readerEvent.target.result);
      setIsVisible(false);
    };
  };

  //Logic behind sending Text + Emoji in chats
  const textEmoji = (emojiObject) => {
    setChatInput((chatInput) => chatInput + emojiObject.emoji);
    setIsVisible(true);
  };

  // Logic behind sendingText + Emoji in Rooms
  const roomEmoji = (emojiObject) => {
    setInputValue((InputValue) => InputValue + emojiObject.emoji);
    setIsVisible(true);
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

  ////////////////////////////////////////////////////////////////////////

  const createChat = async () => {
    const input = prompt(
      "Please enter an email address for the user you wish to chat with"
    )?.trim();

    if (!input) {
      alert("Invalid input!");
      return null;
    }

    if (input === user.email) {
      alert("You cannot chat with yourself!");
      return null;
    }

    if (!EmailValidator.validate(input)) {
      alert("Please enter a valid email address!");
      return null;
    }

    if (chatAlreadyExists(input)) {
      alert("Chat already exists!");
      return null;
    }

    if (
      EmailValidator.validate(input) && //donot let user to chat with themselves
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
    where("users", "array-contains", user.email)
  );
  const [chatsSnapshot] = useCollection(userChatRef);

  const chatAlreadyExists = (recipientEmail) =>
    !!chatsSnapshot?.docs.find((chat) =>
      chat.data().users.includes(recipientEmail)
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
      <Helmet>
        <title>Chitthi</title>
      </Helmet>
      <div className="chitthi_body">
        <div className="chitthi_left">
          <div className="chitthi_top">
            <img className="chitthi_logo" src={BlackLogo} alt="logo" />
          </div>
          <div className="chitthi_center">
            <button onClick={() => setActive("Chats")} className="Chats">
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
            </button>
            <button onClick={() => setActive("Groups")} className="Rooms">
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
                    d="M3 19V18C3 15.7909 4.79086 14 7 14H11C13.2091 14 15 15.7909 15 18V19M15 11C16.6569 11 18 9.65685 18 8C18 6.34315 16.6569 5 15 5M21 19V18C21 15.7909 19.2091 14 17 14H16.5M12 8C12 9.65685 10.6569 11 9 11C7.34315 11 6 9.65685 6 8C6 6.34315 7.34315 5 9 5C10.6569 5 12 6.34315 12 8Z"
                    stroke="#ffffff"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></path>{" "}
                </g>
              </svg>
              <h5>Rooms</h5>
            </button>
          </div>
          <div className="chitthi_buttom">
            <button onClick={createRoom} className="Create_room">
              <svg
                width="30px"
                height="30px"
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
            </button>
            <button className="logout_btn" onClick={() => auth.signOut()}>
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
                    d="M16.8 2H14.2C11 2 9 4 9 7.2V11.25H15.25C15.66 11.25 16 11.59 16 12C16 12.41 15.66 12.75 15.25 12.75H9V16.8C9 20 11 22 14.2 22H16.79C19.99 22 21.99 20 21.99 16.8V7.2C22 4 20 2 16.8 2Z"
                    fill="#ffffff"
                  ></path>{" "}
                  <path
                    d="M4.56141 11.2498L6.63141 9.17984C6.78141 9.02984 6.85141 8.83984 6.85141 8.64984C6.85141 8.45984 6.78141 8.25984 6.63141 8.11984C6.34141 7.82984 5.86141 7.82984 5.57141 8.11984L2.22141 11.4698C1.93141 11.7598 1.93141 12.2398 2.22141 12.5298L5.57141 15.8798C5.86141 16.1698 6.34141 16.1698 6.63141 15.8798C6.92141 15.5898 6.92141 15.1098 6.63141 14.8198L4.56141 12.7498H9.00141V11.2498H4.56141Z"
                    fill="#ffffff"
                  ></path>{" "}
                </g>
              </svg>
              <h6>Logout</h6>
            </button>
            <Avatar className="avatar" src={user.photoURL} />
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
            <input type="text" placeholder="Search" />
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
                  <div className="information">
                    <div className="group_user_name_img">
                      <img src={message.photoURL} alt="user_image" />
                      <p>{message.name}</p>
                    </div>
                    <span className="chat_timestamp">
                      {new Date(message.timestamp?.toDate()).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              <div className="autoScroll" ref={autoScroll}></div>
            </div>
            {/* {showEmojis ? (
              <Emoji className="emoji_tray" onEmojiClick={onEmojiClick} />
            ) : null} */}
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
                <button
                  className="image_add"
                  onClick={() => imagePickerRefG.current.click()}
                >
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
                        d="M14.2647 15.9377L12.5473 14.2346C11.758 13.4519 11.3633 13.0605 10.9089 12.9137C10.5092 12.7845 10.079 12.7845 9.67922 12.9137C9.22485 13.0605 8.83017 13.4519 8.04082 14.2346L4.04193 18.2622M14.2647 15.9377L14.606 15.5991C15.412 14.7999 15.8149 14.4003 16.2773 14.2545C16.6839 14.1262 17.1208 14.1312 17.5244 14.2688C17.9832 14.4253 18.3769 14.834 19.1642 15.6515L20 16.5001M14.2647 15.9377L18.22 19.9628M18.22 19.9628C17.8703 20 17.4213 20 16.8 20H7.2C6.07989 20 5.51984 20 5.09202 19.782C4.7157 19.5903 4.40973 19.2843 4.21799 18.908C4.12583 18.7271 4.07264 18.5226 4.04193 18.2622M18.22 19.9628C18.5007 19.9329 18.7175 19.8791 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V13M11 4H7.2C6.07989 4 5.51984 4 5.09202 4.21799C4.7157 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.0799 4 7.2V16.8C4 17.4466 4 17.9066 4.04193 18.2622M18 9V6M18 6V3M18 6H21M18 6H15"
                        stroke="#ffffff"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></path>{" "}
                    </g>
                  </svg>
                </button>
                <button className="emoji_add" onClick={toggleVisibility}>
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
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM8.1851 15.7508C8.2858 15.349 8.69315 15.1049 9.09494 15.2056C10.2252 15.4889 11.5232 15.4924 12.841 15.1393C14.1588 14.7862 15.2811 14.1342 16.1183 13.3237C16.4159 13.0356 16.8908 13.0433 17.1789 13.3409C17.467 13.6385 17.4593 14.1133 17.1617 14.4014C16.8142 14.7378 16.4297 15.0492 16.0128 15.3301L16.1708 15.652C16.5394 16.4031 16.2223 17.3106 15.4661 17.6685C14.7249 18.0194 13.8393 17.71 13.478 16.9738L13.2817 16.574L13.2292 16.5882C11.6739 17.005 10.1166 17.0081 8.73026 16.6606C8.32847 16.5599 8.0844 16.1526 8.1851 15.7508ZM15.4754 9.51572C15.6898 10.3159 15.4311 11.0805 14.8977 11.2234C14.3642 11.3664 13.7579 10.8336 13.5435 10.0334C13.3291 9.23316 13.5877 8.4686 14.1212 8.32565C14.6547 8.18271 15.2609 8.71552 15.4754 9.51572ZM9.10225 12.7764C9.63571 12.6335 9.89436 11.8689 9.67994 11.0687C9.46553 10.2685 8.85926 9.73569 8.32579 9.87863C7.79232 10.0216 7.53368 10.7861 7.74809 11.5863C7.9625 12.3865 8.56878 12.9194 9.10225 12.7764Z"
                        fill="#ffffff"
                      ></path>{" "}
                    </g>
                  </svg>
                </button>
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
                      fill="#ffffff"
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
                      <img src={message.sendImage} alt="Image" />
                    </div>
                  )}
                  <p>{message.message}</p>

                  <div className="chat_information">
                    <div className="chat_user_name_img">
                      <img className="msg_avatar" src={message.photoURL} />
                      <p className="chat_user_name">{message.name}</p>
                    </div>
                    <span className="chat_timestamp">
                      {new Date(message.timestamp?.toDate()).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              <div className="autoScroll" ref={autoScroll}></div>
            </div>
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
                <button
                  className="image_add"
                  onClick={() => imagePickerRef.current.click()}
                >
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
                        d="M14.2647 15.9377L12.5473 14.2346C11.758 13.4519 11.3633 13.0605 10.9089 12.9137C10.5092 12.7845 10.079 12.7845 9.67922 12.9137C9.22485 13.0605 8.83017 13.4519 8.04082 14.2346L4.04193 18.2622M14.2647 15.9377L14.606 15.5991C15.412 14.7999 15.8149 14.4003 16.2773 14.2545C16.6839 14.1262 17.1208 14.1312 17.5244 14.2688C17.9832 14.4253 18.3769 14.834 19.1642 15.6515L20 16.5001M14.2647 15.9377L18.22 19.9628M18.22 19.9628C17.8703 20 17.4213 20 16.8 20H7.2C6.07989 20 5.51984 20 5.09202 19.782C4.7157 19.5903 4.40973 19.2843 4.21799 18.908C4.12583 18.7271 4.07264 18.5226 4.04193 18.2622M18.22 19.9628C18.5007 19.9329 18.7175 19.8791 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V13M11 4H7.2C6.07989 4 5.51984 4 5.09202 4.21799C4.7157 4.40973 4.40973 4.71569 4.21799 5.09202C4 5.51984 4 6.0799 4 7.2V16.8C4 17.4466 4 17.9066 4.04193 18.2622M18 9V6M18 6V3M18 6H21M18 6H15"
                        stroke="#ffffff"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></path>{" "}
                    </g>
                  </svg>
                </button>
                <button className="emoji_add" onClick={toggleVisibility}>
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
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM8.1851 15.7508C8.2858 15.349 8.69315 15.1049 9.09494 15.2056C10.2252 15.4889 11.5232 15.4924 12.841 15.1393C14.1588 14.7862 15.2811 14.1342 16.1183 13.3237C16.4159 13.0356 16.8908 13.0433 17.1789 13.3409C17.467 13.6385 17.4593 14.1133 17.1617 14.4014C16.8142 14.7378 16.4297 15.0492 16.0128 15.3301L16.1708 15.652C16.5394 16.4031 16.2223 17.3106 15.4661 17.6685C14.7249 18.0194 13.8393 17.71 13.478 16.9738L13.2817 16.574L13.2292 16.5882C11.6739 17.005 10.1166 17.0081 8.73026 16.6606C8.32847 16.5599 8.0844 16.1526 8.1851 15.7508ZM15.4754 9.51572C15.6898 10.3159 15.4311 11.0805 14.8977 11.2234C14.3642 11.3664 13.7579 10.8336 13.5435 10.0334C13.3291 9.23316 13.5877 8.4686 14.1212 8.32565C14.6547 8.18271 15.2609 8.71552 15.4754 9.51572ZM9.10225 12.7764C9.63571 12.6335 9.89436 11.8689 9.67994 11.0687C9.46553 10.2685 8.85926 9.73569 8.32579 9.87863C7.79232 10.0216 7.53368 10.7861 7.74809 11.5863C7.9625 12.3865 8.56878 12.9194 9.10225 12.7764Z"
                        fill="#ffffff"
                      ></path>{" "}
                    </g>
                  </svg>
                </button>
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
                      fill="#ffffff"
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
          {/* <div className="user_profile">
            <div>
              <img className="user_image" src={user.photoURL} alt="" />
            </div>
            <div className="info">
              <h4>{user.displayName}</h4>
              <p>{user.email}</p>
            </div>
          </div> */}
          <div className="emoji_wrapper">
            {isVisible && (
              <EmojiPicker
                className="emoji_tray"
                pickerStyle={{ width: "100%" }}
                onEmojiClick={textEmoji}
                theme="dark"
                skinTonesDisabled={true}
                emojiStyle={EmojiStyle.APPLE} // Change this to NATIVE, GOOGLE, etc.
                // theme={isDarkMode ? "dark" : "light"}
              />
            )}
          </div>
          {/* Only Chat Images */}
          {active === "Chats" && (
            <div className="user_images">
              <div className="sub_heading_container">
                <h3>Images</h3>
                <svg
                  width="24px"
                  height="24px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
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
                    <g id="File / Download_Package">
                      {" "}
                      <path
                        id="Vector"
                        d="M4 8V16.8C4 17.9201 4 18.4798 4.21799 18.9076C4.40973 19.2839 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2839 19.7822 18.9076C20 18.4802 20 17.921 20 16.8031V8M4 8H20M4 8L5.36518 5.61089C5.7002 5.0246 5.86768 4.73151 6.10325 4.51807C6.31184 4.32907 6.55859 4.18605 6.82617 4.09871C7.12861 4 7.46623 4 8.14258 4H15.8571C16.5334 4 16.8723 4 17.1747 4.09871C17.4423 4.18605 17.6879 4.32907 17.8965 4.51807C18.1322 4.73168 18.3002 5.02507 18.6357 5.6123L20 8M12 11V17M12 17L15 15M12 17L9 15"
                        stroke="#ffffff"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></path>{" "}
                    </g>{" "}
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
                  width="24px"
                  height="24px"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
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
                    <g id="File / Download_Package">
                      {" "}
                      <path
                        id="Vector"
                        d="M4 8V16.8C4 17.9201 4 18.4798 4.21799 18.9076C4.40973 19.2839 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2839 19.7822 18.9076C20 18.4802 20 17.921 20 16.8031V8M4 8H20M4 8L5.36518 5.61089C5.7002 5.0246 5.86768 4.73151 6.10325 4.51807C6.31184 4.32907 6.55859 4.18605 6.82617 4.09871C7.12861 4 7.46623 4 8.14258 4H15.8571C16.5334 4 16.8723 4 17.1747 4.09871C17.4423 4.18605 17.6879 4.32907 17.8965 4.51807C18.1322 4.73168 18.3002 5.02507 18.6357 5.6123L20 8M12 11V17M12 17L15 15M12 17L9 15"
                        stroke="#ffffff"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      ></path>{" "}
                    </g>{" "}
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
