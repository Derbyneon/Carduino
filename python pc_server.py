import socket
import struct
import pickle
import cv2
import torch
import numpy as np
import threading
import json
import time

class ObstacleDetectionServer:
    def __init__(self, host='0.0.0.0', port=8000, raspberry_ip='192.168.200.100', raspberry_port=8001):
        # Configuration du serveur
        self.host = host
        self.port = port
        self.raspberry_ip = raspberry_ip
        self.raspberry_port = raspberry_port
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        # Connection à la Raspberry Pi pour envoyer les alertes
        self.pi_connection = None
        
        # Seuil de détection d'obstacle
        self.THRESHOLD = 50000  # Ajustable selon les besoins
        
        # Chargement du modèle YOLOv5
        print("Chargement du modèle YOLOv5...")
        try:
            self.model = torch.hub.load('ultralytics/yolov5', 'yolov5s')
            print("Modèle YOLOv5 chargé avec succès")
        except Exception as e:
            print(f"Erreur lors du chargement du modèle: {e}")
            raise
        
        # Variables de contrôle
        self.running = False
        self.clients = []
        
    def start(self):
        if self.running:
            return
            
        self.running = True
        
        # Démarrer le serveur qui reçoit les images
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        print(f"Serveur de détection démarré sur {self.host}:{self.port}")
        
        # Démarrer un thread pour la connexion à la Raspberry Pi
        pi_thread = threading.Thread(target=self._connect_to_raspberry)
        pi_thread.daemon = True
        pi_thread.start()
        
        # Démarrer la boucle principale du serveur
        self._accept_clients()
    
    def _connect_to_raspberry(self):
        """Thread qui maintient la connexion avec la Raspberry Pi pour envoyer les alertes"""
        while self.running:
            try:
                if self.pi_connection is None:
                    print(f"Connexion à la Raspberry Pi sur {self.raspberry_ip}:{self.raspberry_port}...")
                    self.pi_connection = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    self.pi_connection.connect((self.raspberry_ip, self.raspberry_port))
                    print("Connecté à la Raspberry Pi")
                
                # Si on arrive ici, on est connecté
                time.sleep(5)  # Vérifier la connexion toutes les 5 secondes
                
            except ConnectionRefusedError:
                print("La Raspberry Pi n'est pas disponible. Nouvelle tentative dans 5 secondes...")
                self.pi_connection = None
                time.sleep(5)
            except Exception as e:
                print(f"Erreur de connexion à la Raspberry Pi: {e}")
                self.pi_connection = None
                time.sleep(5)
    
    def send_obstacle_alert(self, is_obstacle=False, message=""):
        """Envoie une alerte d'obstacle à la Raspberry Pi"""
        if self.pi_connection is None:
            return
            
        try:
            data = {
                "obstacle": is_obstacle,
                "message": message,
                "timestamp": time.time()
            }
            
            self.pi_connection.sendall(json.dumps(data).encode('utf-8'))
        except Exception as e:
            print(f"Erreur lors de l'envoi de l'alerte: {e}")
            self.pi_connection = None  # Forcer la reconnexion
    
    def _accept_clients(self):
        """Accepte les connexions entrantes des clients (Raspberry Pi)"""
        while self.running:
            try:
                client_socket, addr = self.server_socket.accept()
                print(f"Nouvelle connexion de {addr}")
                
                client_thread = threading.Thread(target=self._handle_client, args=(client_socket, addr))
                client_thread.daemon = True
                client_thread.start()
                
            except Exception as e:
                print(f"Erreur lors de l'acceptation d'un client: {e}")
    
    def _handle_client(self, client_socket, addr):
        """Gère la connexion avec un client (réception des images et détection)"""
        data = b""
        payload_size = struct.calcsize("L")
        
        window_name = f"Flux de {addr[0]}"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        
        try:
            while self.running:
                # Récupérer la taille des données
                while len(data) < payload_size:
                    packet = client_socket.recv(4096)
                    if not packet:
                        break
                    data += packet
                
                if not packet:
                    break
                    
                # Extraire la taille des données
                packed_msg_size = data[:payload_size]
                data = data[payload_size:]
                msg_size = struct.unpack("L", packed_msg_size)[0]
                
                # Récupérer les données de l'image
                while len(data) < msg_size:
                    data += client_socket.recv(4096)
                
                # Extraire les données de l'image
                frame_data = data[:msg_size]
                data = data[msg_size:]
                
                # Décoder l'image
                frame = pickle.loads(frame_data)
                frame = cv2.imdecode(frame, cv2.IMREAD_COLOR)
                
                # Appliquer YOLOv5 pour la détection d'objets
                results = self.model(frame)
                
                # Variable pour suivre si un obstacle est détecté
                obstacle_detected = False
                obstacle_name = ""
                
                # Traiter les résultats
                labels = results.pandas().xyxy[0]
                for _, row in labels.iterrows():
                    x1, y1, x2, y2, conf, cls, name = row[['xmin', 'ymin', 'xmax', 'ymax', 'confidence', 'class', 'name']]
                    
                    # Dessiner la box
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                    
                    # Ajouter le libellé
                    label = f"{name} {conf:.2f}"
                    cv2.putText(frame, label, (int(x1), int(y1)-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                    
                    # Calculer la taille de l'objet détecté
                    area = (x2 - x1) * (y2 - y1)
                    
                    # Si l'objet prend trop de place dans le champ de vision → il est proche
                    if area > self.THRESHOLD:
                        obstacle_detected = True
                        obstacle_name = name
                        cv2.putText(frame, "🚨 Obstacle détecté !", (50, 50),
                                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
                
                # Envoyer une alerte à la Raspberry Pi si un obstacle est détecté
                if obstacle_detected:
                    message = f"Obstacle ({obstacle_name}) trop proche!"
                    self.send_obstacle_alert(True, message)
                else:
                    # Envoyer périodiquement un signal "pas d'obstacle"
                    if int(time.time()) % 5 == 0:  # Toutes les 5 secondes environ
                        self.send_obstacle_alert(False, "Aucun obstacle détecté")
                
                # Afficher l'image traitée
                cv2.imshow(window_name, frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                
        except Exception as e:
            print(f"Erreur lors du traitement du flux de {addr}: {e}")
        finally:
            client_socket.close()
            cv2.destroyWindow(window_name)
            print(f"Connexion fermée avec {addr}")
    
    def stop(self):
        """Arrête le serveur et libère les ressources"""
        self.running = False
        
        if hasattr(self, 'server_socket'):
            self.server_socket.close()
            
        if self.pi_connection:
            self.pi_connection.close()
            
        cv2.destroyAllWindows()
        print("Serveur arrêté")

if __name__ == "__main__":
    # Créer et démarrer le serveur
    server = ObstacleDetectionServer(
        host='0.0.0.0',  # Écoute sur toutes les interfaces
        port=8000,  # Port d'écoute pour les connexions entrantes
        raspberry_ip='192.168.200.100',  # IP de la Raspberry Pi
        raspberry_port=8001  # Port sur lequel la Raspberry Pi attend les alertes
    )
    
    try:
        server.start()
    except KeyboardInterrupt:
        print("Arrêt du serveur...")
        server.stop()
    except Exception as e:
        print(f"Erreur: {e}")
        server.stop()