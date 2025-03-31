// pages/api/process-script.js
export default function handler(req, res) {
  // Respuesta básica para pruebas
  res.status(200).json({ 
    results: [
      {
        scene: {
          location: "Cafetería",
          timeOfDay: "Día"
        },
        stockContent: {
          videos: [],
          photos: []
        }
      }
    ] 
  });
}
