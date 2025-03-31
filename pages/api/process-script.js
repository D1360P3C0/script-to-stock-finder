// pages/api/process-script.js
export default function handler(req, res) {
  // Datos de ejemplo pre-definidos con estructura mínima
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
              video_files: [
                {
                  link: "https://player.vimeo.com/external/372167359.hd.mp4?s=158696d441f48b2694957285f1a07b24dc7a5c6f&profile_id=175&oauth2_token_id=57447761",
                  duration: 8.4
                }
