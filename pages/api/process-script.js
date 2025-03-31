// pages/api/process-script.js
import { Configuration, OpenAIApi } from 'openai';
import axios from 'axios';
import formidable from 'formidable';
import fs from 'fs';

// Configuramos para permitir análisis de form-data (para el PDF)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Función para imprimir y depurar variables de entorno (sin mostrar las claves completas)
const debugEnvVars = () => {
  const openaiKey = process.env.OPENAI_API_KEY || 'no configurada';
  const pexelsKey = process.env.PEXELS_API_KEY || 'no configurada';
  
  console.log(`OpenAI API Key: ${openaiKey.substring(0, 4)}...${openaiKey.length > 8 ? openaiKey.substring(openaiKey.length - 4) : ''}`);
  console.log(`Pexels API Key: ${pexelsKey.substring(0, 4)}...${pexelsKey.length > 8 ? pexelsKey.substring(pexelsKey.length - 4) : ''}`);
  
  return {
    openaiConfigured: openaiKey !== 'no configurada',
    pexelsConfigured: pexelsKey !== 'no configurada'
  };
};

// Función para parsear el formulario con el archivo PDF
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    try {
      const form = new formidable.IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Error al parsear el formulario:', err);
          reject(err);
        }
        resolve({ fields, files });
      });
    } catch (error) {
      console.error('Error inesperado al parsear formulario:', error);
      reject(error);
    }
  });
};

// Función para extraer texto plano del cuerpo de la solicitud
const extractTextFromRequest = async (req) => {
  try {
    // Verificar si es un formulario con PDF
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('Detectada solicitud multipart/form-data. Procesando formulario...');
      try {
        const { files } = await parseForm(req);
        console.log('Formulario parseado:', files ? 'Contiene archivos' : 'Sin archivos');
        
        if (!files || !files.pdfFile) {
          throw new Error('No se proporcionó un archivo PDF');
        }
        
        // En este punto simplemente devolvemos texto ficticio para probar
        // En una versión real, usaríamos pdf-parse
        return "INT. CAFETERÍA - DÍA\n\nUn hombre bebe café mientras lee el periódico.\n\nEXT. PARQUE - TARDE\n\nNiños juegan con un perro.";
      } catch (error) {
        console.error('Error procesando el PDF:', error);
        throw error;
      }
    } else {
      console.log('Detectada solicitud JSON. Extrayendo texto del cuerpo...');
      try {
        // Para solicitudes JSON normales
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        console.log('Cuerpo de la solicitud parseado:', body ? 'Contiene datos' : 'Sin datos');
        
        if (!body || !body.script) {
          throw new Error('No se proporcionó un script en el cuerpo de la solicitud');
        }
        
        return body.script;
      } catch (e) {
        console.error('Error extrayendo texto del JSON:', e);
        throw new Error('Formato de solicitud no válido');
      }
    }
  } catch (error) {
    console.error('Error extraccr texto de la solicitud:', error);
    throw error;
  }
};

// Función simple para dividir el guion en escenas básicas
const simpleSceneExtraction = (script) => {
  try {
    // Dividir por líneas que parecen encabezados de escena (INT./EXT.)
    const sceneRegex = /(INT\.|EXT\.)(.+?)(?=\n\n|$)/gs;
    const matches = [...script.matchAll(sceneRegex)];
    
    if (matches.length === 0) {
      // Si no encontramos escenas con el formato estándar, dividimos por párrafos
      const paragraphs = script.split('\n\n').filter(p => p.trim());
      return paragraphs.map((paragraph, index) => ({
        location: `Escena ${index + 1}`,
        timeOfDay: 'No especificado',
        visualElements: paragraph.substring(0, 100),
        action: paragraph.substring(0, 100),
        keywords: paragraph.split(' ').slice(0, 5).join(' ')
      }));
    }
    
    return matches.map((match, index) => {
      const headerParts = match[2].split('-');
      const location = headerParts[0].trim();
      const timeOfDay = headerParts.length > 1 ? headerParts[1].trim() : 'DÍA';
      
      // Obtener el contenido de la escena
      const startPos = match.index;
      const endPos = index < matches.length - 1 ? matches[index + 1].index : script.length;
      const sceneContent = script.substring(startPos, endPos).trim();
      
      return {
        location,
        timeOfDay,
        visualElements: sceneContent.substring(0, 100),
        action: sceneContent.substring(0, 100),
        keywords: `${location} ${timeOfDay}`
      };
    });
  } catch (error) {
    console.error('Error en extracción simple de escenas:', error);
    // Fallback extremadamente básico
    return [{
      location: 'Escena genérica',
      timeOfDay: 'DÍA',
      visualElements: script.substring(0, 100),
      action: script.substring(0, 100),
      keywords: 'escena genérica'
    }];
  }
};

// Función para buscar videos en Pexels (versión simplificada)
const searchPexelsVideos = async (query, apiKey) => {
  try {
    console.log(`Buscando videos para: "${query}"`);
    
    const response = await axios.get(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5`, {
      headers: {
        Authorization: apiKey
      }
    });
    
    console.log(`Encontrados ${response.data.videos?.length || 0} videos`);
    return response.data.videos || [];
  } catch (error) {
    console.error(`Error buscando videos:`, error.message);
    return [];
  }
};

// Función para buscar fotos en Pexels (versión simplificada)
const searchPexelsPhotos = async (query, apiKey) => {
  try {
    console.log(`Buscando fotos para: "${query}"`);
    
    const response = await axios.get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5`, {
      headers: {
        Authorization: apiKey
      }
    });
    
    console.log(`Encontradas ${response.data.photos?.length || 0} fotos`);
    return response.data.photos || [];
  } catch (error) {
    console.error(`Error buscando fotos:`, error.message);
    return [];
  }
};

export default async function handler(req, res) {
  console.log('Recibida solicitud a /api/process-script');
  console.log('Método:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  
  if (req.method !== 'POST') {
    console.log('Método no permitido:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Verificar variables de entorno
    const envStatus = debugEnvVars();
    if (!envStatus.openaiConfigured || !envStatus.pexelsConfigured) {
      console.error('Error: Variables de entorno no configuradas correctamente');
      return res.status(500).json({ 
        error: 'Configuración del servidor incompleta',
        details: 'Las claves API necesarias no están configuradas. Contacte al administrador.'
      });
    }
    
    console.log('Extrayendo texto del guion...');
    let scriptText = '';
    
    try {
      scriptText = await extractTextFromRequest(req);
      console.log('Texto extraído (primeros 100 caracteres):', scriptText.substring(0, 100));
    } catch (error) {
      console.error('Error extrayendo texto:', error);
      return res.status(400).json({ 
        error: 'Error procesando la entrada', 
        details: error.message 
      });
    }
    
    if (!scriptText || scriptText.trim().length < 10) {
      console.error('Guion demasiado corto o vacío');
      return res.status(400).json({ error: 'Guion demasiado corto o vacío' });
    }
    
    console.log('Analizando escenas del guion...');
    // Usamos extracción simple en lugar de OpenAI para depurar
    const scenes = simpleSceneExtraction(scriptText);
    console.log(`Identificadas ${scenes.length} escenas`);
    
    const results = [];
    
    console.log('Procesando escenas y buscando contenido...');
    for (const scene of scenes) {
      const searchQuery = `${scene.location} ${scene.timeOfDay}`.trim();
      console.log(`Buscando contenido para escena: ${searchQuery}`);
      
      try {
        // Buscar videos y fotos
        const videos = await searchPexelsVideos(searchQuery, process.env.PEXELS_API_KEY);
        const photos = await searchPexelsPhotos(searchQuery, process.env.PEXELS_API_KEY);
        
        // Preparar videos procesados
        const processedVideos = videos.map(video => {
          // Encontrar el archivo más corto
          const shortestFile = video.video_files.reduce((shortest, file) => {
            return (file.duration < shortest.duration) ? file : shortest;
          }, { duration: 999, ...video.video_files[0] });
          
          return {
            ...video,
            shortestFile,
            shortestDuration: shortestFile.duration
          };
        });
        
        results.push({
          scene,
          stockContent: {
            videos: processedVideos,
            photos
          }
        });
      } catch (error) {
        console.error(`Error procesando escena ${scene.location}:`, error);
        // Continuamos con la siguiente escena
        results.push({
          scene,
          stockContent: {
            videos: [],
            photos: [],
            error: error.message
          }
        });
      }
    }
    
    console.log('Procesamiento completado, enviando respuesta');
    res.json({ results });
    
  } catch (error) {
    console.error('Error general al procesar el guion:', error);
    res.status(500).json({ 
      error: 'Error al procesar el guion', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
