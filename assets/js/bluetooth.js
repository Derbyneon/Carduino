// assets/js/bluetooth.js

let device, server, service, characteristic;

export async function connectToBluetooth() {
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb'] // UUID à remplacer selon ton module BT
    });
    server = await device.gatt.connect();
    service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
    characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
    alert("Connecté à la voiture !");
  } catch (error) {
    console.error("Erreur Bluetooth :", error);
    alert("Impossible de se connecter au Bluetooth.");
  }
}

export async function sendCommand(command) {
  if (!characteristic) {
    alert("Bluetooth non connecté !");
    return;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(command);
  await characteristic.writeValue(data);
}
