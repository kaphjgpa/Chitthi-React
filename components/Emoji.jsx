import React from "react";
// import "./Emoji.css";
import Picker from "emoji-picker-react";

function Emoji({ onEmojiClick }) {
  return (
    <div className="emoji_tray">
      <Picker onEmojiClick={onEmojiClick} />
    </div>
  );
}

export default Emoji;
