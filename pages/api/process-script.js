// pages/api/process-script.js
import { Configuration, OpenAIApi } from 'openai';
import axios from 'axios';
import formidable from 'formidable';
import fs from 'fs';
import pdf from 'pdf-parse';

// Configuramos para permitir análisis de form-data (para el PDF)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Configuración de OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Cliente de Pexels
const pexelsClient = axios.create({
  baseURL: 'https://api.pexels.com',
  headers: {
    Authorization: process.env.PEXELS_API_KEY
  }
});

// Función para parsear el formulario con el archivo PDF
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

// Función para extraer texto de un PDF
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw new Error('No se pudo extraer el texto del PDF');
  }
};

// Función para dividir el guion en secciones manejables
const splitScriptIntoChunks = (script, maxChunkSize = 4000) => {
  const paragraphs = script.split('\n\n');
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

// Función para analizar un fragmento de guion
const analyzeScriptChunk = async (chunk) => {
  try {
    const completion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `Analiza el siguiente fragmento de guion y divídelo en escenas. Para cada escena, identifica: 
        1. Lugar o ubicación
        2. Hora del día
        3. Elementos visuales clave
        4. Acción principal
        5. Palabras clave para búsqueda de stock
        
        Fragmento de guion:
        ${chunk}
        
        Formatea la respuesta como JSON con arrays de escenas.`,
      max_tokens: 1000,
      temperature: 0.3,
    });
    
    const jsonStr = completion.data.choices[0].text.trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error al analizar fragmento:', error);
    return { scenes: [] };
  }
};

// Función para buscar videos cortos (10s o menos)
const searchShortVideos = async (query) => {
  try {
    // Primero hacemos una búsqueda normal
    const response = await pexelsClient.get(`/videos/search?query=${encodeURIComponent(query)}&per_page=30`);
    const allVideos = response.data.videos;
    
    // Filtramos para obtener videos cortos (10s o menos)
    const shortVideos = allVideos.filter(video => {
      // Buscamos el archivo de video más corto para cada video
      const shortestFile = video.video_files.reduce((shortest, file) => {
        return (file.duration <= shortest.duration) ? file : shortest;
      }, { duration: 999 }); // Empezamos con un valor alto
      
      // Consideramos cortos a los videos de 10s o menos
      return shortestFile.duration <= 10;
    });
    
    // Ordenamos los videos por duración (más cortos primero)
    shortVideos.sort((a, b) => {
      const aDuration = Math.min(...a.video_files.map(file => file.duration));
      const bDuration = Math.min(...b.video_files.map(file => file.duration));
      return aDuration - bDuration;
    });
    
    // Si no hay suficientes videos cortos, complementamos con los más cortos disponibles
    if (shortVideos.length < 4) {
      const remainingVideos = allVideos
        .filter(video => !shortVideos.some(shortVideo => shortVideo.id === video.id))
        .sort((a, b) => {
          const aDuration = Math.min(...a.video_files.map(file => file.duration));
          const bDuration = Math.min(...b.video_files.map(file => file.duration));
          return aDuration - bDuration;
        });
      
      shortVideos.push(...remainingVideos.slice(0, 4 - shortVideos.length));
    }
    
    return shortVideos.slice(0, 8); // Devolvemos hasta 8 videos
  } catch (error) {
    console.error(`Error buscando videos para "${query}":`, error);
    return [];
  }
};

// Función para encontrar el archivo de video más corto
const getShortestVideoFile = (video) => {
  return video.video_files.reduce((shortest, file) => {
    return (file.duration < shortest.duration) ? file : shortest;
  }, video.video_files[0]);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let scriptText = '';
    
    // Determinar si es un formulario con PDF o un JSON con texto
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Procesar el formulario con el archivo PDF
      const { files } = await parseForm(req);
      
      if (!files.pdfFile) {
        return res.status(400).json({ error: 'No se proporcionó un archivo PDF' });
      }
      
      // Extraer el texto del PDF
      scriptText = await extractTextFromPDF(files.pdfFile.filepath);
    } else {
      // Intentar leer el cuerpo como JSON
      try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        scriptText = body.script;
      } catch (e) {
        return res.status(400).json({ error: 'Formato de solicitud no válido' });
      }
    }
    
    if (!scriptText) {
      return res.status(400).json({ error: 'No se proporcionó un guion' });
    }
    
    // Dividir el guion en fragmentos manejables
    const scriptChunks = splitScriptIntoChunks(scriptText);
    
    // Analizar cada fragmento por separado
    const allScenes = [];
    for (const chunk of scriptChunks) {
      const chunkAnalysis = await analyzeScriptChunk(chunk);
      if (chunkAnalysis.scenes && Array.isArray(chunkAnalysis.scenes)) {
        allScenes.push(...chunkAnalysis.scenes);
      }
    }
    
    // Para cada escena, buscar contenido relevante con énfasis en videos cortos
    const results = [];
    
    for (const scene of allScenes) {
      // Crear query de búsqueda
      let searchQuery = `${scene.location || ''} ${scene.timeOfDay || ''} ${scene.action || ''}`.trim();
      if (!searchQuery) {
        searchQuery = scene.visualElements || 'landscape';
      }
      
      // Buscar videos cortos
      const videos = await searchShortVideos(searchQuery);
      
      // Preparar videos con información sobre su duración
      const processedVideos = videos.map(video => {
        const shortestFile = getShortestVideoFile(video);
        return {
          ...video,
          shortestFile,
          shortestDuration: shortestFile.duration
        };
      });
      
      // Buscar fotos
      const photosResponse = await pexelsClient.get(`/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=10`);
      const photos = photosResponse.data.photos;
      
      results.push({
        scene,
        stockContent: {
          videos: processedVideos,
          photos
        }
      });
    }
    
    res.json({ results });
    
  } catch (error) {
    console.error('Error al procesar el guion:', error);
    res.status(500).json({ error: 'Error al procesar el guion', details: error.message });
  }
}
