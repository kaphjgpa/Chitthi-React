// import * as firebase from "firebase/app";
// import "firebase/storage";

// const firebaseConfig = {
//   apiKey: "AIzaSyCCFPm_me39f48H0jZLrByu6QSgMTPIV0g",
//   authDomain: "project-x-e3c38.firebaseapp.com",
//   projectId: "project-x-e3c38",
//   storageBucket: "project-x-e3c38.appspot.com",
//   messagingSenderId: "908665978885",
//   appId: "1:908665978885:web:6963083df0a10afcb21c6c",
//   measurementId: "G-EQBQF885BY",
// };

// const firebaseApp = firebase.initializeApp(firebaseConfig);
// const db = firebaseApp.firestore();
// const storage = firebase.storage();
// const auth = firebaseApp.auth();
// const provider = new firebase.auth.GoogleAuthProvider();

// export { db, storage, auth, provider };

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCCFPm_me39f48H0jZLrByu6QSgMTPIV0g",
  authDomain: "project-x-e3c38.firebaseapp.com",
  projectId: "project-x-e3c38",
  storageBucket: "project-x-e3c38.appspot.com",
  messagingSenderId: "908665978885",
  appId: "1:908665978885:web:6963083df0a10afcb21c6c",
  measurementId: "G-EQBQF885BY",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

export { db, storage, auth, provider };
