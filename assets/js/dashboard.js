// assets/js/dashboard.js
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc, getDoc, collection, getDocs, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const userInfo = document.getElementById("user-info");
const vehiclesList = document.getElementById("vehicles-list");
const addVehicleBtn = document.getElementById("add-vehicle-btn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Veuillez vous connecter.");
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const userDocRef = doc(db, "users", uid);
  const userDocSnap = await getDoc(userDocRef);
  const userData = userDocSnap.data();

  userInfo.innerHTML = `
    <p><strong>Nom :</strong> ${userData.name}</p>
    <p><strong>Email :</strong> ${userData.email}</p>
  `;

  // Afficher les véhicules enregistrés
  await afficherVehicules(uid);

  // Ajouter un véhicule
  addVehicleBtn.addEventListener("click", async () => {
    const vehiculesRef = doc(db, `users/${uid}/vehicles/vehicle1`); // tu peux générer un ID unique si tu veux
    await setDoc(vehiculesRef, {
      name: "Carduino 1",
      created_at: serverTimestamp(),
      last_connected: null
    });
    alert("Véhicule ajouté !");
    await afficherVehicules(uid); // recharger la liste
  });
});

async function afficherVehicules(uid) {
  const vehiculesRef = collection(db, `users/${uid}/vehicles`);
  const snapshot = await getDocs(vehiculesRef);

  vehiclesList.innerHTML = `<h3>Véhicules enregistrés :</h3>`;

  if (snapshot.empty) {
    vehiclesList.innerHTML += `<p>Aucun véhicule enregistré.</p>`;
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    vehiclesList.innerHTML += `
      <div class="vehicle-card">
        <p><strong>Nom :</strong> ${data.name}</p>
        <p><strong>Créé le :</strong> ${data.created_at?.toDate()?.toLocaleString() || 'Inconnu'}</p>
        <p><strong>Dernière connexion :</strong> ${data.last_connected?.toDate?.().toLocaleString() || 'Inconnue'}</p>
      </div>
    `;
  });
}
