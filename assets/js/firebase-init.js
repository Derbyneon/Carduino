// assets/js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-5waJz29UckwBwh76YrETVNwA2Ykqkgo",
  authDomain: "carduino-8242d.firebaseapp.com",
  projectId: "carduino-8242d",
  storageBucket: "carduino-8242d.firebasestorage.app",
  messagingSenderId: "843357376345",
  appId: "1:843357376345:web:418a002a68baf712d6c648",
  measurementId: "G-9F31J2KV6H"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
