import { auth, db } from './firebase-init.js';
import {
  onAuthStateChanged,
  updateEmail
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();

      // Affichage des données
      document.getElementById("name").textContent = data.name;
      document.getElementById("email").textContent = data.email;
      document.getElementById("created-at").textContent = data.created_at?.toDate?.().toLocaleString() || "Inconnue";

      // Avatar
      const avatarUrl = data.avatar || "assets/img/default-avatar.png";
      document.getElementById("avatar").src = avatarUrl;

      // Liste des véhicules
      const vehiclesList = document.getElementById("vehicles-list");
      vehiclesList.innerHTML = "<h3>Véhicules enregistrés :</h3>";

      if (data.vehicles && Object.keys(data.vehicles).length > 0) {
        for (const [id, vehicle] of Object.entries(data.vehicles)) {
          vehiclesList.innerHTML += `
            <div class="vehicle-card">
              <p><strong>Nom :</strong> ${vehicle.name}</p>
              <p><strong>Dernière connexion :</strong> ${vehicle.last_connected?.toDate?.().toLocaleString() || 'Inconnue'}</p>
            </div>
          `;
        }
      } else {
        vehiclesList.innerHTML += "<p>Aucun véhicule enregistré.</p>";
      }

      // Sauvegarde des modifications
      document.getElementById("save-btn").addEventListener("click", async () => {
        const newName = document.getElementById("edit-name").value.trim();
        const newEmail = document.getElementById("edit-email").value.trim();

        try {
          if (newName) await updateDoc(userRef, { name: newName });
          if (newEmail && newEmail !== user.email) {
            await updateEmail(user, newEmail);
            await updateDoc(userRef, { email: newEmail });
          }

          alert("Profil mis à jour !");
          window.location.reload(); // recharge la page
        } catch (error) {
          alert("Erreur lors de la mise à jour : " + error.message);
        }
      });

    } else {
      alert("Données utilisateur introuvables.");
    }

  } else {
    alert("Non connecté !");
    window.location.href = "login.html";
  }
});
