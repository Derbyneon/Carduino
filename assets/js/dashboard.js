import { auth } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

const batteryEl = document.getElementById("battery");
const speedEl = document.getElementById("speed");
const engineEl = document.getElementById("engine");

async function fetchVehicleStats() {
  try {
    const response = await fetch("http://192.168.100.153:5000/api/stats");
    if (!response.ok) throw new Error("Erreur de connexion au serveur Flask");
    const data = await response.json();

    batteryEl.textContent = data.battery + "%";
    speedEl.textContent = data.speed + " km/h";
    engineEl.textContent = data.engine ? "En marche" : "Arrêté";

    // Changement couleur batterie si faible
    if (data.battery <= 20) {
      batteryEl.classList.add("low");
      alert("⚠️ Batterie faible !");
    } else {
      batteryEl.classList.remove("low");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des stats :", error);
    batteryEl.textContent = speedEl.textContent = engineEl.textContent = "Indisponible";
  }
}

// Authentification avant de lancer le dashboard
onAuthStateChanged(auth, (user) => {
  if (user) {
    fetchVehicleStats();
    setInterval(fetchVehicleStats, 5000); // Rafraîchit toutes les 5 secondes
  } else {
    alert("Vous devez être connecté pour voir ce tableau de bord.");
    window.location.href = "login.html";
  }
});
