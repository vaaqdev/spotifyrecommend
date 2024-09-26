from flask import Flask, render_template, redirect, url_for, request, session, send_from_directory
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import re

app = Flask(__name__)


client_id = "6fb438f4fb194723a12a41c90cdcf26b"
client_secret = "a12ed5e42e3240cbae7a400d64c280b6"
redirect_uri = "http://de1.bot-hosting.net:22425/callback"

print('started ' + client_id + ' ID ' + client_secret + ' client secret ' )

# Configura la autorización de Spotify
scopes = "user-read-private user-read-email playlist-read-private playlist-modify-public user-library-modify"
sp_oauth = SpotifyOAuth(
    client_id=client_id,
    client_secret=client_secret,
    redirect_uri=redirect_uri,
    scope=scopes
)

@app.route("/favicon.ico")
def favicon():
  return redirect("https://res.cloudinary.com/https-296fps-cf/image/upload/v1727255538/m9odssnobuyxzxknqnit.png")

@app.route("/robots.txt")
def robots():
  return send_from_directory('static', 'robots.txt')

@app.route("/sitemap.xml")
def sitemap():
    return send_from_directory('static', 'sitemap.xml')

# Define la ruta para el inicio de sesión
@app.route("/")
def index():
    # Verifica si el usuario ya ha iniciado sesión
    if "spotify_token" in session:
        return render_template("index.html")
    else:
        auth_url = sp_oauth.get_authorize_url()
        return render_template("login.html", auth_url=auth_url)

# Define la ruta para el callback de la autenticación
@app.route("/callback")
def callback():
    code = request.args.get("code")
    token_info = sp_oauth.get_access_token(code)
    session["spotify_token"] = token_info['access_token']
    return redirect(url_for("index"))

# Define la ruta para obtener recomendaciones
@app.route("/recomendaciones", methods=["POST"])
def recomendaciones():
    # Obtén el token de acceso del usuario
    token = session.get("spotify_token")
    if token:
        sp = spotipy.Spotify(auth=token)
        spotify_link = request.form.get("spotify_link")
        if spotify_link:
            # Extrae el ID de la canción del enlace de Spotify
            match = re.search(r'track/([a-zA-Z0-9]+)', spotify_link)
            if match:
                track_id = match.group(1)
                recomendaciones = sp.recommendations(seed_tracks=[track_id], limit=5)
                recommendations_list = recomendaciones["tracks"]
                print("Recomendaciones:", recommendations_list)  # Imprime la lista en la consola
                return render_template("recomendaciones.html", recomendaciones=recommendations_list)
            else:
                return "Enlace de Spotify inválido"
        else:
            return "Falta enlace de Spotify"
    else:
        return "Debes iniciar sesión"

# Función para guardar/eliminar "Me gusta"
@app.route('/like', methods=['POST'])
def like_track():
    token = session.get("spotify_token")
    if token:
        sp = spotipy.Spotify(auth=token)
        track_id = request.form.get("track_id")
        is_liked = request.form.get("liked") == 'true'

        if is_liked:
            # Eliminar de "Me gusta"
            sp.current_user_saved_tracks_delete(tracks=[track_id])
            return "Eliminado de 'Me gusta'"
        else:
            # Guardar en "Me gusta"
            sp.current_user_saved_tracks_add(tracks=[track_id])
            return "Agregado a 'Me gusta'"
    else:
        return "Debes iniciar sesión"

# Configura la aplicación para que use sesiones
app.secret_key = "secretkeylol"

if __name__ == "__main__":
    app.run(host='0.0.0.0',port=8080, debug=True)
    print('funciona')