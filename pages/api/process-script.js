// pages/api/process-script.js
export default async function handler(req, res) {
  console.log('API llamada correctamente');
  
  // Datos de ejemplo pre-definidos
  const exampleResults = {
    results: [
      {
        scene: {
          location: "Cafetería",
          timeOfDay: "Día",
          visualElements: "Café, periódico, ventanas",
          action: "Un hombre bebe café mientras lee el periódico"
        },
        stockContent: {
          videos: [
            {
              id: 1,
              image: "https://images.pexels.com/videos/3256029/free-video-3256029.jpg",
              shortestFile: {
                link: "https://player.vimeo.com/external/372167359.hd.mp4?s=158696d441f48b2694957285f1a07b24dc7a5c6f&profile_id=175&oauth2_token_id=57447761",
                duration: 8.4
              },
              shortestDuration: 8.4,
              video_files: [{
                link: "https://player.vimeo.com/external/372167359.hd.mp4?s=158696d441f48b2694957285f1a07b24dc7a5c6f&profile_id=175&oauth2_token_id=57447761",
                duration: 8.4
              }]
            },
            {
              id: 2,
              image: "https://images.pexels.com/videos/3194277/free-video-3194277.jpg",
              shortestFile: {
                link: "https://player.vimeo.com/external/371908197.hd.mp4?s=16b34451622bc31f395b5cda6a59120c86a31e59&profile_id=175&oauth2_token_id=57447761",
                duration: 6.2
              },
              shortestDuration: 6.2,
