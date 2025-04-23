import http.server
import ssl
import os

# Se placer dans le dossier actuel (où se trouve index.html)
web_dir = os.path.dirname(__file__)
os.chdir(web_dir)

server_address = ('0.0.0.0', 5000)
httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)

httpd.socket = ssl.wrap_socket(
    httpd.socket,
    keyfile='certs/key.pem',
    certfile='certs/cert.pem',
    server_side=True
)

print("✅ Serveur HTTPS lancé sur https://0.0.0.0:5000")
httpd.serve_forever()
