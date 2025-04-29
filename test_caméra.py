"""import cv2
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
if ret:
    cv2.imshow('frame', frame)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
else:
    print("Erreur lors de la capture de l'image.")"""


"""import cv2
import mediapipe as mp

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(min_detection_confidence=0.5)
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

while cap.isOpened():
    success, image = cap.read()
    if not success:
        print("Échec de capture vidéo")
        break

    image = cv2.flip(image, 1)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = hands.process(image_rgb)

    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            mp_draw.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            print("🚨 Obstacle détecté (main)")

    cv2.imshow("Caméra", image)
    if cv2.waitKey(5) & 0xFF == 27:  # Touche ESC pour quitter
        break

cap.release()
cv2.destroyAllWindows()
"""



import torch
import cv2

# Charger le modèle YOLOv5 pré-entraîné
model = torch.hub.load('ultralytics/yolov5', 'yolov5s')

cap = cv2.VideoCapture(0)

# Seuil à partir duquel on considère qu'un objet est trop proche
THRESHOLD = 50000  # À ajuster en fonction de tes tests

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame)
    labels = results.pandas().xyxy[0]

    for _, row in labels.iterrows():
        x1, y1, x2, y2, conf, cls, name = row
        label = f"{name} {conf:.2f}"
        # Dessiner la box
        cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
        cv2.putText(frame, label, (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 2)

        # Calculer la taille de l'objet détecté
        area = (x2 - x1) * (y2 - y1)

        # Si l'objet prend trop de place dans le champ de vision → il est proche
        if area > THRESHOLD:
            print("🚨 Obstacle proche !")
            cv2.putText(frame, "🚨 Obstacle détecté !", (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

    cv2.imshow("Détection", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()


"""

# pc_server/detection_server.py
from flask import Flask, Response
import cv2
import torch
import requests
import threading
import time

app = Flask(__name__)

# Charger YOLOv5
model = torch.hub.load('ultralytics/yolov5', 'yolov5s')

# Flux vidéo brut de la Raspberry Pi
PI_STREAM = "http://192.168.100.126:5000/video_feed"  # À modifier
PI_ALERT_ENDPOINT = "http://192.168.100.126:6000/obstacle"  # À modifier

cap = cv2.VideoCapture(PI_STREAM)
THRESHOLD = 50000
last_alert_time = 0

frame_to_send = None

def detection_loop():
    global frame_to_send, last_alert_time
    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        results = model(frame)
        labels = results.pandas().xyxy[0]

        obstacle_detected = False
        obstacle_proche = False

        for _, row in labels.iterrows():
            x1, y1, x2, y2, conf, cls, name = row
            label = f"{name} {conf:.2f}"
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            cv2.putText(frame, label, (int(x1), int(y1)-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 2)

            area = (x2 - x1) * (y2 - y1)
            if area > THRESHOLD:
                obstacle_proche = True
                cv2.putText(frame, "🚨 Obstacle DETECTÉ", (50, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

        frame_to_send = frame.copy()

        if (obstacle_proche or obstacle_detected) and (time.time() - last_alert_time > 2):
            try:
                requests.post(PI_ALERT_ENDPOINT, json={"obstacle": True, "proche": obstacle_proche})
                last_alert_time = time.time()
            except Exception as e:
                print("Erreur en envoyant l'alerte à la Pi :", e)

# Lancer la détection dans un thread séparé
threading.Thread(target=detection_loop, daemon=True).start()

@app.route('/processed_feed')
def processed_feed():
    def generate():
        while True:
            if frame_to_send is None:
                continue
            _, buffer = cv2.imencode('.jpg', frame_to_send)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7000)
"""