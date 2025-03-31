import { useState } from 'react';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Home() {
  const [script, setScript] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [inputMethod, setInputMethod] = useState('text'); // 'text' o 'pdf'
  const [processingProgress, setProcessingProgress] = useState(0);

  const processScript = async () => {
    // Validación según el método de entrada
    if (inputMethod === 'text' && !script.trim()) {
      alert('Por favor, ingresa un guion para procesar');
      return;
    }
    
    if (inputMethod === 'pdf' && !pdfFile) {
      alert('Por favor, selecciona un archivo PDF para procesar');
      return;
    }
    
    setLoading(true);
    setProcessingProgress(10); // Iniciamos progreso
    
    try {
      let response;
      
      if (inputMethod === 'text') {
        // Procesar con texto pegado
        response = await fetch('/api/process-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ script }),
        });
      } else {
        // Procesar con archivo PDF
        const formData = new FormData();
        formData.append('pdfFile', pdfFile);
        
        response = await fetch('/api/process-script', {
          method: 'POST',
          body: formData,
        });
      }
      
      setProcessingProgress(50); // Actualizamos progreso
      
      if (!response.ok) {
        throw new Error('Error al procesar el guion');
      }
      
      const data = await response.json();
      setProcessingProgress(90); // Casi completado
      
      setResults(data.results);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Ha ocurrido un error al procesar el guion');
    } finally {
      setLoading(false);
      setProcessingProgress(100); // Completado
    }
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      alert('Por favor, selecciona un archivo PDF válido');
      e.target.value = null;
      setPdfFile(null);
    }
  };

  // Formatea la duración en segundos
  const formatDuration = (seconds) => {
    if (seconds <= 10) {
      return `${seconds.toFixed(1)}s`; // Muestra un decimal para duraciones cortas
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 
      ? `${mins}m ${secs}s` 
      : `${secs}s`;
  };

  const getDurationClass = (seconds) => {
    if (seconds <= 5) return 'bg-success'; // Verde para muy cortos (≤5s)
    if (seconds <= 10) return 'bg-info';   // Azul para cortos (≤10s)
    return 'bg-warning';                    // Amarillo para más largos
  };

  // Obtiene el archivo de video más corto
  const getShortestFile = (video) => {
    if (video.shortestFile) return video.shortestFile;
    
    return video.video_files.reduce((shortest, file) => {
      return (file.duration < shortest.duration) ? file : shortest;
    }, video.video_files[0]);
  };

  return (
    <div className="container py-5">
      <Head>
        <title>Script to Stock Finder - Clips Cortos</title>
      </Head>

      <h1 className="text-center mb-4">Script to Stock Finder</h1>
      <p className="text-center mb-1">Encuentra clips cortos (≤10s) para tu guion largo</p>
      <p className="text-center mb-5 text-muted small">Optimizado para videos de corta duración</p>
      
      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${inputMethod === 'text' ? 'active' : ''}`}
                onClick={() => setInputMethod('text')}
              >
                Pegar texto
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${inputMethod === 'pdf' ? 'active' : ''}`}
                onClick={() => setInputMethod('pdf')}
              >
                Subir PDF
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {inputMethod === 'text' ? (
            <div>
              <textarea 
                className="form-control mb-3"
                style={{ minHeight: '200px' }}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Pega aquí tu guion largo..."
              />
            </div>
          ) : (
            <div className="mb-3">
              <label htmlFor="pdfUpload" className="form-label">Selecciona un archivo PDF con tu guion</label>
              <input 
                type="file" 
                className="form-control" 
                id="pdfUpload" 
                accept=".pdf" 
                onChange={handlePdfChange} 
              />
              {pdfFile && (
                <div className="mt-2 text-success">
                  <i className="bi bi-check-circle"></i> Archivo seleccionado: {pdfFile.name}
                </div>
              )}
            </div>
          )}
          
          <button 
            className="btn btn-primary"
            onClick={processScript}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Procesar guion'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="progress mb-3">
            <div 
              className="progress-bar progress-bar-striped progress-bar-animated" 
              role="progressbar" 
              style={{ width: `${processingProgress}%` }}
              aria-valuenow={processingProgress} 
              aria-valuemin="0" 
              aria-valuemax="100"
            ></div>
          </div>
          <div className="spinner-border text-primary mb-2" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p>Analizando guion y buscando clips cortos...</p>
          <p className="text-muted small">Este proceso puede tardar varios minutos para guiones extensos</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="results">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Resultados ({results.length} escenas)</h2>
            <div>
              <span className="badge bg-success me-2">≤5s</span>
              <span className="badge bg-info me-2">≤10s</span>
              <span className="badge bg-warning">+10s</span>
            </div>
          </div>

          {results.map((result, index) => (
            <div key={index} className="card mb-4">
              <div className="card-header bg-primary text-white">
                <h5>Escena {index + 1}: {result.scene.location || 'Sin ubicación'}</h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-3"><strong>Ubicación:</strong></div>
                  <div className="col-md-9">{result.scene.location || 'N/A'}</div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-3"><strong>Hora del día:</strong></div>
                  <div className="col-md-9">{result.scene.timeOfDay || 'N/A'}</div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-3"><strong>Elementos clave:</strong></div>
                  <div className="col-md-9">{result.scene.visualElements || 'N/A'}</div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-3"><strong>Acción principal:</strong></div>
                  <div className="col-md-9">{result.scene.action || 'N/A'}</div>
                </div>
                
                <h6 className="mt-4 mb-3">Clips cortos relacionados (≤10s preferidos)</h6>
                <div className="row">
                  {result.stockContent.videos && result.stockContent.videos.length > 0 ? (
                    result.stockContent.videos.map((video) => {
                      const shortestFile = video.shortestFile || getShortestFile(video);
                      const duration = shortestFile.duration;
                      const durationClass = getDurationClass(duration);
                      
                      return (
                        <div key={video.id} className="col-md-3 mb-3">
                          <div className="card h-100">
                            <div className="position-relative">
                              <img 
                                src={video.image} 
                                alt="Thumbnail" 
                                className="card-img-top"
                                style={{ height: '150px', objectFit: 'cover' }}
                              />
                              <span className={`position-absolute top-0 end-0 badge ${durationClass} m-2`}>
                                {formatDuration(duration)}
                              </span>
                            </div>
                            <div className="card-body d-flex flex-column">
                              <button 
                                className="btn btn-sm btn-primary mt-auto"
                                onClick={() => {
                                  setCurrentVideo({
                                    ...video,
                                    shortestFile
                                  });
                                  setShowModal(true);
                                }}
                              >
                                Previsualizar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-12">
                      <p>No se encontraron videos para esta escena.</p>
                    </div>
                  )}
                </div>
                
                <h6 className="mt-4 mb-3">Imágenes relacionadas</h6>
                <div className="row">
                  {result.stockContent.photos && result.stockContent.photos.length > 0 ? (
                    result.stockContent.photos.slice(0, 4).map((photo) => (
                      <div key={photo.id} className="col-md-3 mb-3">
                        <div className="card h-100">
                          <img 
                            src={photo.src.medium} 
                            alt={photo.alt || 'Stock image'} 
                            className="card-img-top"
                            style={{ height: '150px', objectFit: 'cover' }}
                          />
                          <div className="card-body d-flex flex-column">
                            <a 
                              href={photo.src.original} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-success mt-auto"
                            >
                              Ver imagen
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-12">
                      <p>No se encontraron imágenes para esta escena.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && currentVideo && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Clip corto ({formatDuration(currentVideo.shortestFile.duration)})
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <video 
                  controls 
                  className="w-100" 
                  src={currentVideo.shortestFile.link}
                  autoPlay
                ></video>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </button>
                <a 
                  href={currentVideo.shortestFile.link}
                  download={`clip-corto-${currentVideo.id}.mp4`}
                  className="btn btn-primary"
                >
                  Descargar
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
