// Archivo API simplificado
export default function handler(req, res) {
  // Datos de ejemplo muy básicos
  const exampleData = {
    results: [
      {
        scene: {
          location: "Cafetería",
          timeOfDay: "Día"
        },
        stockContent: {
          videos: [
            {
              id: 1,
              image: "https://images.pexels.com/videos/1526909/free-video-1526909.jpg",
              video_files: [
                {
                  link: "https://player.vimeo.com/external/291648067.hd.mp4?s=94998971f3c3de9e4e7d2f3155094cfd7cb7fac8&profile_id=175&oauth2_token_id=57447761",
                  duration: 8
                }
              ]
            }
          ],
          photos: [
            {
              id: 101,
              src: {
                medium: "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&h=350",
                original: "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg"
              },
              alt: "Café"
            }
          ]
        }
      }
    ]
  };
  
  // Simplemente devolvemos los datos de ejemplo
  res.status(200).json(exampleData);
}
