// assets/js/profile.js
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    const userDoc = await getDoc(doc(db, "users", uid));
    const data = userDoc.data();

    document.getElementById("profile-data").innerHTML = `
      <p><strong>Nom :</strong> ${data.name}</p>
      <p><strong>Email :</strong> ${data.email}</p>
      <p><strong>Compte créé le :</strong> ${data.created_at?.toDate?.().toLocaleString() || 'N/A'}</p>
    `;
  } else {
    alert("Non connecté !");
    window.location.href = "login.html";
  }
});
