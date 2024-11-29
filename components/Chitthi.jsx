import React, { useState, useEffect, useRef } from "react";
import firebase from "firebase/compat/app";
import { useAuthState } from "react-firebase-hooks/auth";
import { useParams } from "react-router-dom";
import { auth, db, storage } from "../src/firebase";
import * as EmailValidator from "email-validator";
import "../components/css/Chitthi.css";
// import { Avatar, IconButton } from "@material-ui/core";
import { IconButton, Avatar } from "@mui/material";
// import FindInPageOutlinedIcon from "@mui/icons-material/FindInPageOutlined";
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
  const [input, setInput] = useState("");
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

  // Remove the image from State for 1-1
  const removeImage = () => {
    setImageToMessage(null);
  };
  // Remove the image from State for groups
  const removeGroupImage = () => {
    setImageToGroups(null);
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

  const SendMessage = (e) => {
    e.preventDefault(); // Stop this from refresh the page
    db.collection("users").doc(user.uid).set(
      {
        lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    db.collection("chats")
      .doc(chatId)
      .collection("messages")
      .add({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        message: chatInput,
        name: user.displayName,
        user: user.email,
        photoURL: user.photoURL,
      })
      // Upload Images to firestore
      .then((doc) => {
        if (imageToMessage) {
          const uploadTask = storage
            .ref(`images/${doc.id}`)
            .putString(imageToMessage, "data_url");

          removeImage();

          uploadTask.on(
            "state_change",
            null,
            (error) => console.error(error),
            () => {
              storage
                .ref("images")
                .child(doc.id)
                .getDownloadURL()
                .then((url) => {
                  db.collection("chats")
                    .doc(chatId)
                    .collection("messages")
                    .doc(doc.id)
                    .set(
                      {
                        sendImage: url,
                      },
                      { merge: true }
                    );
                });
            }
          );
        }
      });
    setChatInput("");
    autoScroll.current.scrollIntoView({ behavior: "smooth" });
  };

  //room functionality
  //THIS FUNCTION MOUNT THE ALL ROOMS THAT ARE IN OUR DATABASE
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

  const sendMessage = (e) => {
    e.preventDefault();

    const messageRef = collection(db, "rooms", roomId, "messages");
    addDoc(messageRef, {
      message: input,
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

    setInput("");
  };

  return (
    <div className="chitthi_wrapper">
      <div className="chitthi_body">
        <div className="chitthi_left">
          <div className="chitthi_top">
            <img className="chitthi_logo" src={BlackLogo} alt="logo" />
          </div>
          <div className="chitthi_center">
            <IconButton>
              <ChatBubbleIcon
                onClick={() => setActive("Chats")}
                fontSize="large"
              />
            </IconButton>
            <IconButton>
              <GroupIcon onClick={() => setActive("Groups")} fontSize="large" />
            </IconButton>
          </div>
          <div className="chitthi_buttom">
            <IconButton>
              <GroupAddIcon onClick={createRoom} fontSize="large" />
            </IconButton>
            <IconButton>
              <SettingsIcon fontSize="large" />
            </IconButton>
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
              <AddIcon className="add" fontSize="large" /> New Conversation
            </button>
          </div>
          <div className="chat_heading">
            <div className="text_chat">
              {active === "Chats" && <h1>Chats</h1>}
              {active === "Groups" && <h1>Groups</h1>}
            </div>
            <div className="dots">
              <IconButton>
                <MoreHorizIcon fontSize="large" />
              </IconButton>
            </div>
          </div>
          <div className="search_bar">
            <input type="text" placeholder="Search here" />
            <IconButton>{/* <FindInPageOutlinedIcon /> */}</IconButton>
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
              <div className="chitthi_wrapper_center_top_right">
                <div className="members">
                  <h3>Members :</h3>
                </div>
                <div className="add_and_avatar">
                  <IconButton>
                    <AddIcon />
                  </IconButton>
                  <Avatar />
                </div>
                <div className="settings">
                  <IconButton>
                    <SettingsIcon />
                  </IconButton>
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
            {/* {fileToGroup && (
              <div className="send_Image_Container">
                <CancelIcon
                  className="cancel_btn"
                  fontSize="small"
                  color="error"
                  onClick={removeFileToGroup}
                />
                <img src={fileToGroup} alt="Selected Image" />
                Audio support is coming soon
              </div>
            )} */}
            <div className="chitthi_chat_footer">
              <div className="add_docs">
                <IconButton>
                  <ImageIcon
                    onClick={() => imagePickerRefG.current.click()}
                    fontSize="default"
                  />
                </IconButton>
                <input
                  ref={imagePickerRefG}
                  onChange={addImageToGroup}
                  type="file"
                  hidden
                />
                {/* <IconButton>
                  <AttachFileIcon
                    onClick={() => filePickerRefG.current.click()}
                    fontSize="default"
                  />
                </IconButton>
                <input
                  ref={filePickerRefG}
                  onChange={addFileToGroup}
                  type="file"
                  hidden
                /> */}
              </div>
              <div className="input_bar">
                <form className="Form">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    type="text"
                    placeholder="Type a message"
                  />
                  <button disabled={!input} onClick={sendMessage} type="submit">
                    Send a message
                  </button>
                </form>
              </div>
              <div className="emoji_send">
                <IconButton>
                  <EmojiEmotionsIcon
                    onClick={() => setShowEmojis(!showEmojis)}
                    fontSize="default"
                  />
                </IconButton>
                <IconButton>
                  <TelegramIcon
                    disabled={!input}
                    onClick={sendMessage}
                    type="submit"
                    fontSize="large"
                  />
                </IconButton>
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
              <div className="chitthi_wrapper_center_top_right">
                <div className="members">
                  <h3>Members :</h3>
                </div>
                <div className="add_and_avatar">
                  <IconButton>
                    <AddIcon />
                  </IconButton>
                  <Avatar />
                </div>
                <div className="settings">
                  <IconButton>
                    <SettingsIcon />
                  </IconButton>
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
            {/* {fileToMessage && (
              <div className="send_Image_Container">
                <CancelIcon
                  className="cancel_btn"
                  fontSize="small"
                  color="error"
                  onClick={removeFileToMessage}
                />
                <img src={fileToMessage} alt="Selected Image" />
                Audio support is coming soon
              </div>
            )} */}
            <div className="chitthi_chat_footer">
              <div className="add_docs">
                <IconButton>
                  <ImageIcon
                    onClick={() => imagePickerRef.current.click()}
                    fontSize="default"
                  />
                </IconButton>
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
                    disabled={!chatInput}
                    onClick={SendMessage}
                    type="submit"
                  >
                    Send a message
                  </button>
                </form>
              </div>
              <div className="emoji_send">
                <IconButton>
                  <EmojiEmotionsIcon
                    onClick={() => setShowEmojis(!showEmojis)}
                    fontSize="default"
                  />
                </IconButton>
                <IconButton>
                  <TelegramIcon
                    disabled={!chatInput}
                    onClick={SendMessage}
                    type="submit"
                    fontSize="large"
                  />
                </IconButton>
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
              <div className="images_header">
                <div className="sub_heading_container">
                  <h3>Images</h3>
                  <IconButton>
                    <KeyboardArrowDownIcon onClick={() => setIsOpen(!isOpen)} />
                  </IconButton>
                </div>
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
              <div className="images_header">
                <div className="sub_heading_container">
                  <h3>Images</h3>
                  <IconButton>
                    <KeyboardArrowDownIcon
                      onClick={() => setDocOpen(!isDocOpen)}
                    />
                  </IconButton>
                </div>
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
