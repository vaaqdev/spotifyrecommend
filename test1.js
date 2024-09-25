const SpotifyWebApi = require('spotify-web-api-node');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

// Credenciales de la API de Spotify
const spotifyApi = new SpotifyWebApi({
  clientId: '84a3895b12b5431da7c325c75d7cebbe',
  clientSecret: '09be01d08b7c4952bf539ff356f7d48f'
});

// Función para solicitar el token de acceso
async function getAccessToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body.access_token);
    console.log('Token de acceso obtenido correctamente.');
  } catch (error) {
    console.error('Error al obtener el token de acceso:', error);
  }
}

// Función para buscar canciones similares
async function buscarCancionesSimilares(idCancion) {
  try {
    const respuesta = await spotifyApi.getRecommendations({
      seed_tracks: [idCancion],
      limit: 10 
    });

    const cancionesSimilares = respuesta.body.tracks;
    console.log('Canciones similares encontradas:');
    cancionesSimilares.forEach((cancion) => {
      console.log(`- ${cancion.name} (${cancion.artists[0].name})`);
    });
  } catch (error) {
    console.error('Error al buscar canciones similares:', error);
  }
}

// Función para obtener el ID de una canción
async function obtenerIdCancion(nombreCancion, artista) {
  try {
    await getAccessToken(); // Obtiene el token solo cuando se necesita
    const respuesta = await spotifyApi.searchTracks(nombreCancion + ' ' + artista);
    const cancion = respuesta.body.tracks.items[0];
    return cancion.id;
  } catch (error) {
    console.error('Error al obtener el ID de la canción:', error);
    return null;
  }
}

// Inicialización del script
readline.question('Ingresa el nombre de la canción: ', async (nombreCancion) => {
  readline.question('Ingresa el nombre del artista: ', async (artista) => {
    const idCancion = await obtenerIdCancion(nombreCancion, artista);
    if (idCancion) {
      await buscarCancionesSimilares(idCancion);
    } else {
      console.log('No se encontró la canción. Por favor, verifica la información ingresada.');
    }
    readline.close();
  });
});