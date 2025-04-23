const API_URL = "http://192.168.11.103:5000";
//const API_URL = "http://192.168.100.153:5000"; // l'IP locale de ta Raspberry Pi avec Flask

export async function sendCommand(command) {
  try {
    const response = await fetch(`${API_URL}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command })
    });

    const result = await response.json();
    console.log("Réponse serveur :", result);
  } catch (error) {
    console.error("Erreur lors de l'envoi de la commande :", error);
  }
}
