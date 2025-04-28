import { sendCommand } from './car-api.js';

const joystickZone = document.getElementById("joystick-zone");
const directionsMap = {
  up: "FORWARD",
  down: "REVERSE",
  left: "LEFT",
  right: "RIGHT",
  'up-left': "FORWARD_LEFT",
  'up-right': "FORWARD_RIGHT",
  'down-left': "REVERSE_LEFT",
  'down-right': "REVERSE_RIGHT"
};

const joystick = nipplejs.create({
  zone: joystickZone,
  mode: 'static',
  position: { left: '50%', top: '50%' },
  color: 'blue',
  size: 150
});

let lastDirection = null;

joystick.on('dir', (evt, data) => {
  const dir = data.direction?.angle;
  if (dir && dir !== lastDirection) {
    const command = directionsMap[dir];
    if (command) {
      console.log("Joystick ->", command);
      sendCommand(command);
      lastDirection = dir;
    }
  }
});

joystick.on('end', () => {
  lastDirection = null;
  resetJoystickVisual();
});

// ------- CLAVIER AVEC MAINTIEN -------
const activeKeys = new Set();
let keyboardDirection = null;
let keyInterval = null;

document.addEventListener("keydown", (e) => {
  if (e.repeat || e.code === "Space") return;  // Ne traite pas la barre d’espace ici
  activeKeys.add(e.key);
  updateKeyboardDirection();
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space") return;  // Ne modifie pas les directions si c'est juste la barre d’espace
  activeKeys.delete(e.key);
  updateKeyboardDirection();
});

function updateKeyboardDirection() {
  const up = activeKeys.has("ArrowUp");
  const down = activeKeys.has("ArrowDown");
  const left = activeKeys.has("ArrowLeft");
  const right = activeKeys.has("ArrowRight");

  let dir = null;
  if (up && left) dir = "up-left";
  else if (up && right) dir = "up-right";
  else if (down && left) dir = "down-left";
  else if (down && right) dir = "down-right";
  else if (up) dir = "up";
  else if (down) dir = "down";
  else if (left) dir = "left";
  else if (right) dir = "right";

  if (dir !== keyboardDirection) {
    if (keyInterval) clearInterval(keyInterval);

    if (dir) {
      const command = directionsMap[dir];
      console.log("Clavier ->", command);
      sendCommand(command);
      simulateJoystickMovement(dir);

      keyInterval = setInterval(() => {
        sendCommand(command);
        console.log("Clavier (maintien) ->", command);
      }, 300);
    }

    keyboardDirection = dir;
  }

  if (!dir && keyInterval) {
    clearInterval(keyInterval);
    keyboardDirection = null;
    resetJoystickVisual();
  }
}

// ------- ANIMATION VISUELLE -------
function simulateJoystickMovement(dir) {
  const front = document.querySelector('.nipple .front');
  if (!front) return;

  let dx = 0, dy = 0;
  switch (dir) {
    case "up": dy = -30; break;
    case "down": dy = 30; break;
    case "left": dx = -30; break;
    case "right": dx = 30; break;
    case "up-left": dx = -22; dy = -22; break;
    case "up-right": dx = 22; dy = -22; break;
    case "down-left": dx = -22; dy = 22; break;
    case "down-right": dx = 22; dy = 22; break;
  }

  front.style.transform = `translate(${dx}px, ${dy}px)`;
}

function resetJoystickVisual() {
  const front = document.querySelector('.nipple .front');
  if (front) front.style.transform = `translate(0px, 0px)`;
}

// ------- BOUTONS CLASSIQUES -------
document.getElementById("start").addEventListener("click", () => sendCommand("START"));
document.getElementById("stop").addEventListener("click", () => sendCommand("STOP"));
document.getElementById("accelerate").addEventListener("click", () => sendCommand("ACCELERATE"));
document.getElementById("reverse").addEventListener("click", () => sendCommand("REVERSE"));



// ------- COMMANDE VOCALE -------
let recognition;
let listening = false;

function initSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      console.log("🎙️ Commande vocale activée...");
      listening = true;
    };
    
    recognition.onend = () => {
      console.log("🛑 Commande vocale arrêtée.");
      listening = false;
    };

    recognition.onresult = (event) => {
      const speech = event.results[0][0].transcript.toLowerCase().trim();
      console.log("🗣️ Commande vocale détectée :", `"${speech}"`);

      let command = null;

      if (speech.includes("avance") || speech.includes("en avant") || speech.includes("devant")) {
        command = "FORWARD";
      } else if (speech.includes("recule") || speech.includes("arrière") || speech.includes("en arrière")) {
        command = "REVERSE";
      } else if (speech.includes("gauche")) {
        command = "LEFT";
      } else if (speech.includes("droite")) {
        command = "RIGHT";
      } else if (speech.includes("démarre") || speech.includes("démarrage")) {
        command = "START";
      } else if (speech.includes("arrête") || speech.includes("stop")) {
        command = "STOP";
      }

      if (command) {
        console.log("📤 Envoi de la commande :", command);
        sendCommand(command)
          .then(response => {
            console.log("✅ Réponse du serveur :", response);
          })
          .catch(error => {
            console.error("❌ Erreur lors de l'envoi :", error);
          });
      } else {
        console.warn("⚠️ Commande vocale non reconnue :", speech);
      }
    };

    recognition.onerror = (event) => {
      console.error("🎤 Erreur de reconnaissance vocale :", event.error);
      listening = false;
    };
    
    return true;
  } else {
    console.error("La reconnaissance vocale n'est pas supportée par votre navigateur.");
    return false;
  }
}

// Initialiser la reconnaissance vocale au chargement
document.addEventListener("DOMContentLoaded", () => {
  if (initSpeechRecognition()) {
    console.log("✅ Système de reconnaissance vocale initialisé");
  }
});

// Gestion de la commande vocale avec barre espace (maintien)
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !listening && recognition) {
    try {
      recognition.start();
    } catch (error) {
      console.error("Erreur au démarrage de la reconnaissance vocale:", error);
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space" && listening && recognition) {
    try {
      recognition.stop();
    } catch (error) {
      console.error("Erreur à l'arrêt de la reconnaissance vocale:", error);
    }
  }
});

