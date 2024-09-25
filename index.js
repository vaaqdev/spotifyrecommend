import { GoogleGenerativeAI } from '@google/generative-ai';
import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
import { createInterface } from 'readline';

dotenv.config();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Inicializar el modelo de Google Gemini
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Obtener un token de acceso
spotifyApi.clientCredentialsGrant()
  .then(data => spotifyApi.setAccessToken(data.body['access_token']))
  .catch(error => console.error('Error al obtener token:', error));

async function buscarCancion(nombreCancion, artista) {
  try {
    const resultados = await spotifyApi.search({
      q: `track:${nombreCancion} artist:${artista}`,
      type: 'track',
    });
    return resultados.body.tracks.items[0]; 
  } catch (error) {
    console.error('Error al buscar la canción:', error);
  }
}

async function recomendarMusica(cancionObjetivo) {
  let prompt = `Esta canción: ${cancionObjetivo.name} por ${cancionObjetivo.artists[0].name}`;
  if (cancionObjetivo.genres && cancionObjetivo.genres.length > 0) {
    prompt += ` es: ${cancionObjetivo.genres.join(', ')}.`;
  } else {
    prompt += ` parece ser del género: ${obtenerGeneroPorArtista(cancionObjetivo)}`;
  }

  prompt += ` Recomienda 5 canciones similares, incluyendo el género y estilo musical, y proporciona una puntuación (de 1 a 5) de cuán similares son a la canción original.`;

  try {
    const result = await model.generateContent([prompt]);
    const recomendaciones = result.response.text();
    const artistas = extraerArtistas(recomendaciones);
    const puntuaciones = extraerPuntuaciones(recomendaciones);

    if (artistas.length > 0) {
      const resultados = await spotifyApi.searchArtists({
        query: artistas.join(', '),
        limit: 5,
      });
      const artistasSpotify = resultados.body.artists.items;

      return artistasSpotify.map((artista, i) => ({
        nombre: artista.name,
        uri: artista.uri,
        imagen: artista.images[0].url,
        puntuacion: puntuaciones[i] || 0,
      }));
    } else {
      return "No se encontraron artistas en la respuesta.";
    }
  } catch (error) {
    console.error('Error al obtener recomendaciones:', error);
  }
}

function obtenerGeneroPorArtista(cancionObjetivo) {
  const artistaId = cancionObjetivo.artists[0].id;
  if (artistaId) {
    spotifyApi.getArtist(artistaId)
      .then(artista => {
        if (artista.body.genres.length > 0) {
          return artista.body.genres.join(', ');
        }
      })
      .catch(error => {
        console.error('Error al obtener géneros del artista:', error);
      });
  }
  return "Desconocido"; 
}

function extraerArtistas(texto) {
  const regex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g;
  const coincidencias = texto.match(regex);
  return coincidencias ? coincidencias : [];
}

function extraerPuntuaciones(texto) {
  const regex = /\d\/5/g; 
  const coincidencias = texto.match(regex);
  return coincidencias ? coincidencias.map(puntuacion => parseInt(puntuacion.split('/')[0])) : []; 
}

async function main() {
  const nombreCancion = await prompt("Introduce el nombre de la canción: ");
  console.log(nombreCancion)
  const artista = await prompt("Introduce el nombre del artista: ");
  console.log(artista)
  const cancionObjetivo = await buscarCancion(nombreCancion, artista);

  if (cancionObjetivo) {
    const recomendaciones = await recomendarMusica(cancionObjetivo);
    console.log("Recomendaciones:", recomendaciones);
  } else {
    console.log('Canción no encontrada.');
  }
}

async function prompt(mensaje) {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    readline.question(mensaje, answer => {
      readline.close();
      resolve(answer);
    });
  });
}

main();