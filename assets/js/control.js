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
  if (e.repeat) return;
  activeKeys.add(e.key);
  updateKeyboardDirection();
});

document.addEventListener("keyup", (e) => {
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
      simulateJoystickMovement(dir);  // <<< animation directionnelle persistante

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
    resetJoystickVisual(); // <<< retour visuel au centre
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

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';

  recognition.onresult = (event) => {
    const speech = event.results[0][0].transcript.toLowerCase();
    console.log("Commande vocale reçue :", speech);

    if (speech.includes("avance") || speech.includes("devant")) sendCommand("FORWARD");
    else if (speech.includes("recule") || speech.includes("arrière")) sendCommand("REVERSE");
    else if (speech.includes("gauche")) sendCommand("LEFT");
    else if (speech.includes("droite")) sendCommand("RIGHT");
    else if (speech.includes("démarre")) sendCommand("START");
    else if (speech.includes("arrête")) sendCommand("STOP");
    else console.log("Commande vocale non reconnue");
  };

  recognition.onerror = (err) => {
    console.warn("Erreur vocale :", err);
  };
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !listening) {
    listening = true;
    recognition?.start();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space" && listening) {
    listening = false;
    recognition?.stop();
  }
});
