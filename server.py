from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import pandas as pd
from camera import SharedCamera  # 👈 Assure-toi que ça correspond au nom dans camera.py
import torch
import cv2
import time

app = Flask(__name__)
CORS(app)

# Initialiser la caméra partagée
camera = SharedCamera()

# Charger un modèle YOLOv5 léger (yolov5n pour moins de ressources)
model = torch.hub.load('ultralytics/yolov5', 'yolov5n')  # Version plus légère du modèle

# Seuil à partir duquel on considère qu'un objet est trop proche
THRESHOLD = 50000  # À ajuster

# Paramètres de la caméra : réduire la résolution pour alléger la charge
FRAME_WIDTH = 320
FRAME_HEIGHT = 240

@app.route('/')
def home():
    return "🚗 Carduino Server - Flask est actif."

@app.route('/command', methods=['POST'])
def command():
    data = request.json
    cmd = data.get('command', '')
    print(f"Commande reçue : {cmd}")
    return jsonify(status="ok", message=f"Commande '{cmd}' reçue")

@app.route('/stream')
def stream():
    def generate():
        while True:
            frame = camera.get_frame()
            if frame is not None:
                # Réduire la taille de l'image pour réduire la charge
                frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
                _, jpeg = cv2.imencode('.jpg', frame)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            else:
                continue

    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/stream_with_obstacle_detection')
def stream_with_obstacle_detection():
    def generate():
        frame_count = 0
        last_detection = []
        last_detection_time = time.time()

        while True:
            frame = camera.get_frame()
            if frame is None:
                continue

            # Réduire la taille de l'image pour réduire la charge
            frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))

            frame_count += 1

            # Effectuer la détection d'obstacle à intervalles réguliers (toutes les 3 secondes)
            if time.time() - last_detection_time > 3:
                # Faire une détection toutes les 3 secondes au lieu de tous les 5 frames
                results = model(frame)

                # Utiliser la méthode pandas pour obtenir un DataFrame
                last_detection = results.pandas().xyxy[0]
                last_detection_time = time.time()

            # Si last_detection est un DataFrame valide, on peut itérer
            if isinstance(last_detection, pd.DataFrame):
                for _, row in last_detection.iterrows():
                    x1, y1, x2, y2, conf, cls, name = row
                    label = f"{name} {conf:.2f}"

                    # Dessiner la boîte de détection
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                    cv2.putText(frame, label, (int(x1), int(y1)-10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                    area = (x2 - x1) * (y2 - y1)
                    if area > THRESHOLD:
                        print("🚨 Obstacle proche !")
                        cv2.putText(frame, "🚨 Obstacle détecté !", (50, 50),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

            # Encoder et envoyer le frame
            _, jpeg = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')

    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000)
    finally:
        camera.release()  # Libère proprement la caméra à la fermeture
