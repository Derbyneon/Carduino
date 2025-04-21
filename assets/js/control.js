// assets/js/control.js
import { connectToBluetooth, sendCommand } from './bluetooth.js';

document.getElementById("connect-btn").addEventListener("click", connectToBluetooth);

document.getElementById("start").addEventListener("click", () => sendCommand("START"));
document.getElementById("stop").addEventListener("click", () => sendCommand("STOP"));
document.getElementById("accelerate").addEventListener("click", () => sendCommand("ACCELERATE"));
document.getElementById("reverse").addEventListener("click", () => sendCommand("REVERSE"));
