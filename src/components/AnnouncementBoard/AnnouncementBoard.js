import "./AnnouncementBoard.css";
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Button, Form, Modal, Container, Card, InputGroup, Spinner, Alert } from "react-bootstrap";
import api from '../../api/api';
import { getTokenUserId } from '../../utils/auth';
import { AuthContext } from '../../context/AuthContext';
import { FaEdit, FaTrash, FaEye, FaDownload, FaTimes, FaChevronLeft, FaChevronRight, FaExclamationCircle } from 'react-icons/fa';
import { formatDate } from '../../utils/dateUtils';
import FileViewer from '../FileViewer/FileViewer';

// Componente para popup de imagen
const ImageModal = ({ show, onHide, image, imageIndex, totalImages, onPrevious, onNext }) => {
    const getImageUrl = (img) => {
        if (typeof img === 'string') return img;
        if (typeof img === 'object' && img !== null) {
            // Usar la variante 'original' si está disponible, sino la URL original
            return img.variants?.original || img.url;
        }
        return '';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft' && onPrevious) {
            onPrevious();
        } else if (e.key === 'ArrowRight' && onNext) {
            onNext();
        } else if (e.key === 'Escape') {
            onHide();
        }
    };

    useEffect(() => {
        if (show) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [show, onPrevious, onNext]);

    if (!image) return null;

    return (
        <Modal 
            show={show} 
            onHide={onHide} 
            size="xl"
            centered
            dialogClassName="image-modal"
        >
            <Modal.Body className="p-0 position-relative" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
                {/* Botón cerrar */}
                <Button
                    variant="link"
                    className="position-absolute text-white"
                    style={{ 
                        top: '10px', 
                        right: '10px', 
                        zIndex: 1050,
                        fontSize: '1.5rem'
                    }}
                    onClick={onHide}
                >
                    <FaTimes />
                </Button>
                
                {/* Navegación anterior */}
                {totalImages > 1 && onPrevious && (
                    <Button
                        variant="link"
                        className="position-absolute text-white"
                        style={{ 
                            top: '50%', 
                            left: '10px', 
                            transform: 'translateY(-50%)',
                            zIndex: 1050,
                            fontSize: '1.5rem'
                        }}
                        onClick={onPrevious}
                    >
                        <FaChevronLeft />
                    </Button>
                )}
                
                {/* Navegación siguiente */}
                {totalImages > 1 && onNext && (
                    <Button
                        variant="link"
                        className="position-absolute text-white"
                        style={{ 
                            top: '50%', 
                            right: '10px', 
                            transform: 'translateY(-50%)',
                            zIndex: 1050,
                            fontSize: '1.5rem'
                        }}
                        onClick={onNext}
                    >
                        <FaChevronRight />
                    </Button>
                )}

                {/* Imagen */}
                <div className="text-center p-3">
                    <img 
                        src={getImageUrl(image)}
                        alt={`Imagen ${imageIndex + 1}`}
                        style={{ 
                            maxWidth: '100%',
                            maxHeight: '80vh',
                            objectFit: 'contain'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'block';
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4=';
                        }}
                    />
                </div>

                {/* Contador de imágenes */}
                {totalImages > 1 && (
                    <div 
                        className="position-absolute text-white text-center"
                        style={{ 
                            bottom: '10px', 
                            left: '50%', 
                            transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            padding: '5px 10px',
                            borderRadius: '15px',
                            fontSize: '0.9rem'
                        }}
                    >
                        {imageIndex + 1} de {totalImages}
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};



// Componente interno para un anuncio individual
const Announcement = ({ id, title, content, date, authorId, specialties, images, files, isAdmin, onEdit, onDelete }) => {
    const [authorName, setAuthorName] = useState('Cargando...');
    const [showFull, setShowFull] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [announcementFiles, setAnnouncementFiles] = useState([]);
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [selectedFileData, setSelectedFileData] = useState(null);
    const [fileViewerLoading, setFileViewerLoading] = useState(false);
    const [fileViewerError, setFileViewerError] = useState(null);
    const MAX_TITLE_LENGTH = 50;
    const MAX_CONTENT_LENGTH = 150;

    useEffect(() => {
        const fetchAuthor = async () => {
            try {
                const response = await api.get(`/api/users/${authorId}`);
                setAuthorName(response.data.name);
            } catch (err) {
                setAuthorName('Autor desconocido');
            }
        };

        fetchAuthor();
    }, [authorId]);

    // Función para cargar archivos detallados del anuncio
    const fetchAnnouncementFiles = async () => {
        try {
            const response = await api.get(`/api/announcements/${id}/files`);
            setAnnouncementFiles(response.data);
        } catch (err) {
            console.error('Error al cargar archivos del anuncio:', err);
            setAnnouncementFiles({ images: [], files: [], total: 0 });
        }
    };

    const truncateText = (text, maxLength) => {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    const formatSpecialties = (specialties) => {
        if (!specialties || specialties.length === 0) return 'Todas las especialidades';
        return specialties.map(spec => typeof spec === 'object' ? spec.name : spec).join(', ');
    };

    // Funciones para manejar modales
    const handleImageClick = async (imageIndex) => {
        await fetchAnnouncementFiles(); // Cargar archivos detallados si no están cargados
        const detailedImages = announcementFiles.images || images || [];
        if (detailedImages.length > 0) {
            setSelectedImage(detailedImages[imageIndex]);
            setSelectedImageIndex(imageIndex);
            setShowImageModal(true);
        }
    };

    const handlePreviousImage = () => {
        const detailedImages = announcementFiles.images || images || [];
        const newIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : detailedImages.length - 1;
        setSelectedImage(detailedImages[newIndex]);
        setSelectedImageIndex(newIndex);
    };

    const handleNextImage = () => {
        const detailedImages = announcementFiles.images || images || [];
        const newIndex = selectedImageIndex < detailedImages.length - 1 ? selectedImageIndex + 1 : 0;
        setSelectedImage(detailedImages[newIndex]);
        setSelectedImageIndex(newIndex);
    };

    const handleFilePreview = async (fileIndex) => {
        try {
            setFileViewerLoading(true);
            setFileViewerError(null);
            setShowFileViewer(true);
            
            // Cargar archivos detallados y esperar la respuesta
            const response = await api.get(`/api/announcements/${id}/files`);
            const detailedFiles = response.data.files || [];
            
            if (detailedFiles.length > fileIndex) {
                const file = detailedFiles[fileIndex];
                
                // Preparar los datos según la estructura esperada por FileViewer
                const fileData = {
                    filename: file.filename || 'Documento',
                    document_type: file.document_type || 'pdf',
                    viewer_type: file.document_type || 'pdf',
                    download_url: file.download_url || file.url,
                    direct_url: file.direct_url || file.url,
                    embed_url: file.embed_url || file.url,
                    url: file.url,
                    page_previews: file.pages || [],
                    preview_url: file.preview_url
                };
                
                setSelectedFileData(fileData);
            } else {
                setFileViewerError('Archivo no encontrado');
            }
        } catch (error) {
            console.error('Error al cargar archivo:', error);
            setFileViewerError('Error al cargar el archivo');
        } finally {
            setFileViewerLoading(false);
        }
    };

    const handleFileDownload = async (fileIndex) => {
        await fetchAnnouncementFiles(); // Cargar archivos detallados
        const detailedFiles = announcementFiles.files || [];
        if (detailedFiles.length > fileIndex) {
            const file = detailedFiles[fileIndex];
            const downloadUrl = file.download_url || file.url;
            if (downloadUrl) {
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = file.filename || 'documento';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };

    // Función para renderizar múltiples imágenes
    const renderImages = (images) => {
        // Validación más robusta: verificar que sea un array válido con elementos
        if (!Array.isArray(images) || images.length === 0) return null;
        
        // Filtrar imágenes válidas (pueden ser objetos o strings para retrocompatibilidad)
        const validImages = images.filter(img => {
            if (typeof img === 'string') return img.trim() !== '';
            if (typeof img === 'object' && img !== null) {
                return img.url;
            }
            return false;
        });
        
        if (validImages.length === 0) return null;
        
        // Función helper para obtener la URL de la imagen
        const getImageUrl = (img) => typeof img === 'string' ? img : img.url;
        
        return (
            <div className="announcement-images mb-3">
                <small className="text-muted d-block mb-2">
                    <i className="bi bi-images me-1"></i>
                    {validImages.length} imagen{validImages.length > 1 ? 'es' : ''}
                </small>
                <div className="d-flex flex-wrap gap-2">
                    {validImages.slice(0, 6).map((image, index) => (
                        <div key={index} className="position-relative">
                            <img 
                                src={getImageUrl(image)} 
                                alt={`Imagen ${index + 1}`} 
                                className="rounded"
                                style={{ 
                                    width: '60px',
                                    height: '60px',
                                    objectFit: 'cover',
                                    cursor: 'pointer',
                                    border: '1px solid #dee2e6'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleImageClick(index);
                                }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                                title="Click para ver imagen completa"
                            />
                        </div>
                    ))}
                    {validImages.length > 6 && (
                        <div 
                            className="d-flex align-items-center justify-content-center rounded"
                            style={{ 
                                width: '60px',
                                height: '60px',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                fontSize: '0.8rem'
                            }}
                        >
                            <small className="text-muted">+{validImages.length - 6}</small>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Función para renderizar archivos adjuntos
    const renderFiles = (files) => {
        // Validación más robusta: verificar que sea un array válido con elementos
        if (!Array.isArray(files) || files.length === 0) return null;
        
        // Filtrar archivos válidos (ahora pueden ser objetos o strings para retrocompatibilidad)
        const validFiles = files.filter(file => {
            if (typeof file === 'string') return file.trim() !== '';
            if (typeof file === 'object' && file !== null) {
                return file.url || file.filename;
            }
            return false;
        });
        
        if (validFiles.length === 0) return null;
        
        return (
            <div className="announcement-files mb-3">
                <small className="text-muted d-block mb-2">
                    <i className="bi bi-paperclip me-1"></i>
                    {validFiles.length} archivo{validFiles.length > 1 ? 's' : ''} adjunto{validFiles.length > 1 ? 's' : ''}
                </small>
                <div className="d-flex flex-wrap gap-1">
                    {validFiles.slice(0, 3).map((file, index) => {
                        const fileName = typeof file === 'object' ? 
                            file.filename || `Archivo ${index + 1}` : 
                            file.split('/').pop() || `Archivo ${index + 1}`;
                        
                        return (
                            <div key={index} className="d-flex align-items-center gap-1">
                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    <i className="bi bi-file-earmark me-1"></i>
                                    {fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName}
                                </small>
                                <div className="d-flex gap-1">
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0"
                                        style={{ fontSize: '0.7rem', color: '#6c757d' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFilePreview(index);
                                        }}
                                        title="Ver archivo"
                                    >
                                        <FaEye />
                                    </Button>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0"
                                        style={{ fontSize: '0.7rem', color: '#6c757d' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFileDownload(index);
                                        }}
                                        title="Descargar archivo"
                                    >
                                        <FaDownload />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                    {validFiles.length > 3 && (
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                            +{validFiles.length - 3} más
                        </small>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <Card className="mb-3 announcement-card" onClick={() => setShowFull(true)}>
                {isAdmin && (
                    <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 2, display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                        <Button variant="link" size="sm" onClick={onEdit} style={{ color: '#6c757d', padding: 0 }} title="Editar">
                            <FaEdit size={18} />
                        </Button>
                        <Button variant="link" size="sm" onClick={onDelete} style={{ color: '#6c757d', padding: 0 }} title="Eliminar">
                            <FaTrash size={18} />
                        </Button>
                    </div>
                )}
                {renderImages(images)}
                <Card.Body>
                    <Card.Title>{truncateText(title, MAX_TITLE_LENGTH)}</Card.Title>
                    <Card.Text>{truncateText(content, MAX_CONTENT_LENGTH)}</Card.Text>
                    {renderFiles(files)}
                    <Card.Footer className="text-muted">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <small>{formatDate(date)}</small>
                                <small className="ms-2">Autor: {authorName}</small>
                            </div>
                            <div>
                                <small>
                                    Especialidades: {formatSpecialties(specialties)}
                                </small>
                            </div>
                        </div>
                    </Card.Footer>
                </Card.Body>
            </Card>

            <AnnouncementModal
                show={showFull}
                onHide={() => setShowFull(false)}
                announcement={{
                    id,
                    title,
                    content,
                    date,
                    specialties,
                    images,
                    files
                }}
                authorName={authorName}
            />

            {/* Modal para imagen */}
            <ImageModal
                show={showImageModal}
                onHide={() => setShowImageModal(false)}
                image={selectedImage}
                imageIndex={selectedImageIndex}
                totalImages={(announcementFiles.images || images || []).length}
                onPrevious={handlePreviousImage}
                onNext={handleNextImage}
            />

            {/* Visualizador de archivos */}
            <FileViewer
                show={showFileViewer}
                onHide={() => {
                    setShowFileViewer(false);
                    setSelectedFileData(null);
                    setFileViewerError(null);
                }}
                fileData={selectedFileData}
                isLoading={fileViewerLoading}
                error={fileViewerError}
            />
        </>
    );
};

// Componente reutilizable para el modal de anuncio
export const AnnouncementModal = ({ 
    show, 
    onHide, 
    announcement, 
    authorName = 'Cargando...' 
}) => {
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [announcementFiles, setAnnouncementFiles] = useState([]);
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [selectedFileData, setSelectedFileData] = useState(null);
    const [fileViewerLoading, setFileViewerLoading] = useState(false);
    const [fileViewerError, setFileViewerError] = useState(null);

    const formatSpecialties = (specialties) => {
        if (!specialties || specialties.length === 0) return 'Todas las especialidades';
        return specialties.map(spec => typeof spec === 'object' ? spec.name : spec).join(', ');
    };

    // Función para cargar archivos detallados del anuncio
    const fetchAnnouncementFiles = async () => {
        if (!announcement?.id) return;
        try {
            const response = await api.get(`/api/announcements/${announcement.id}/files`);
            setAnnouncementFiles(response.data);
        } catch (err) {
            console.error('Error al cargar archivos del anuncio:', err);
            setAnnouncementFiles({ images: [], files: [], total: 0 });
        }
    };

    // Funciones para manejar modales
    const handleImageClick = async (imageIndex) => {
        await fetchAnnouncementFiles();
        const detailedImages = announcementFiles.images || announcement.images || [];
        if (detailedImages.length > 0) {
            setSelectedImage(detailedImages[imageIndex]);
            setSelectedImageIndex(imageIndex);
            setShowImageModal(true);
        }
    };

    const handlePreviousImage = () => {
        const detailedImages = announcementFiles.images || announcement.images || [];
        const newIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : detailedImages.length - 1;
        setSelectedImage(detailedImages[newIndex]);
        setSelectedImageIndex(newIndex);
    };

    const handleNextImage = () => {
        const detailedImages = announcementFiles.images || announcement.images || [];
        const newIndex = selectedImageIndex < detailedImages.length - 1 ? selectedImageIndex + 1 : 0;
        setSelectedImage(detailedImages[newIndex]);
        setSelectedImageIndex(newIndex);
    };

    const handleFilePreview = async (fileIndex) => {
        try {
            setFileViewerLoading(true);
            setFileViewerError(null);
            setShowFileViewer(true);
            
            // Cargar archivos detallados y esperar la respuesta
            const response = await api.get(`/api/announcements/${announcement.id}/files`);
            const detailedFiles = response.data.files || [];
            
            if (detailedFiles.length > fileIndex) {
                const file = detailedFiles[fileIndex];
                
                // Preparar los datos según la estructura esperada por FileViewer
                const fileData = {
                    filename: file.filename || 'Documento',
                    document_type: file.document_type || 'pdf',
                    viewer_type: file.document_type || 'pdf',
                    download_url: file.download_url || file.url,
                    direct_url: file.direct_url || file.url,
                    embed_url: file.embed_url || file.url,
                    url: file.url,
                    page_previews: file.pages || [],
                    preview_url: file.preview_url
                };
                
                setSelectedFileData(fileData);
            } else {
                setFileViewerError('Archivo no encontrado');
            }
        } catch (error) {
            console.error('Error al cargar archivo:', error);
            setFileViewerError('Error al cargar el archivo');
        } finally {
            setFileViewerLoading(false);
        }
    };

    const handleFileDownload = async (fileIndex) => {
        await fetchAnnouncementFiles();
        const detailedFiles = announcementFiles.files || [];
        if (detailedFiles.length > fileIndex) {
            const file = detailedFiles[fileIndex];
            const downloadUrl = file.download_url || file.url;
            if (downloadUrl) {
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = file.filename || 'documento';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    };

    // Función helper para obtener la URL de la imagen
    const getImageUrl = (img) => typeof img === 'string' ? img : img.url;

    if (!announcement) return null;

    return (
        <Modal 
            show={show} 
            onHide={onHide} 
            size="lg"
            dialogClassName="modal-dialog-responsive"
            centered
        >
            <Modal.Header className="border-bottom-0 sticky-top bg-white" style={{ zIndex: 1031 }}>
                <Modal.Title>{announcement.title}</Modal.Title>
            </Modal.Header>
            <div className="announcement-metadata sticky-top bg-light mb-0 p-3" style={{ top: '56px', zIndex: 1030, borderRadius: 0 }}>
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <small className="text-muted">
                            <i className="bi bi-calendar me-1"></i>
                            {formatDate(announcement.date)}
                        </small>
                        <small className="text-muted ms-3">
                            <i className="bi bi-person me-1"></i>
                            {authorName}
                        </small>
                    </div>
                    <div>
                        <small className="text-muted">
                            <i className="bi bi-tags me-1"></i>
                            {formatSpecialties(announcement.specialties)}
                        </small>
                    </div>
                </div>
            </div>
            <Modal.Body>
                {/* Imágenes en el modal - maneja tanto formato nuevo como viejo */}
                {(() => {
                    // Manejar tanto formato nuevo (images array) como viejo (imageUrl string)
                    let imagesToShow = [];
                    if (Array.isArray(announcement.images) && announcement.images.length > 0) {
                        imagesToShow = announcement.images;
                    } else if (announcement.imageUrl) {
                        imagesToShow = [announcement.imageUrl];
                    }

                    return imagesToShow.length > 0 && (
                        <div className="mb-4">
                            <h6 className="mb-3">
                                <i className="bi bi-image me-2"></i>
                                Imágenes ({imagesToShow.length})
                            </h6>
                            <div className="d-flex flex-wrap gap-3">
                                {imagesToShow
                                    .filter(img => {
                                        if (typeof img === 'string') return img.trim() !== '';
                                        if (typeof img === 'object' && img !== null) {
                                            return img.url;
                                        }
                                        return false;
                                    })
                                    .map((image, index) => {
                                        const imageUrl = getImageUrl(image);
                                        return (
                                            <div key={index} className="position-relative">
                                                <img 
                                                    src={imageUrl} 
                                                    alt={`Imagen ${index + 1}`} 
                                                    className="rounded shadow-sm"
                                                    style={{ 
                                                        width: '120px',
                                                        height: '120px',
                                                        objectFit: 'cover',
                                                        cursor: 'pointer',
                                                        border: '2px solid #e9ecef',
                                                        transition: 'transform 0.2s ease, border-color 0.2s ease'
                                                    }}
                                                    onClick={() => handleImageClick(index)}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.transform = 'scale(1.05)';
                                                        e.target.style.borderColor = '#009A9E';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.transform = 'scale(1)';
                                                        e.target.style.borderColor = '#e9ecef';
                                                    }}
                                                    title="Click para ver imagen completa"
                                                />
                                                <div className="position-absolute top-0 end-0 p-1">
                                                    <button 
                                                        className="btn btn-sm btn-light"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleImageClick(index);
                                                        }}
                                                        title="Ver imagen completa"
                                                        style={{ 
                                                            opacity: 0.9,
                                                            fontSize: '0.7rem',
                                                            padding: '2px 6px'
                                                        }}
                                                    >
                                                        <i className="bi bi-arrows-fullscreen"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    );
                })()}
                
                {/* Archivos adjuntos en el modal */}
                {Array.isArray(announcement.files) && announcement.files.length > 0 && (
                    <div className="mb-4">
                        <h6 className="mb-3">
                            <i className="bi bi-paperclip me-2"></i>
                            Archivos adjuntos
                        </h6>
                        <div className="list-group">
                            {announcement.files
                                .filter(file => {
                                    if (typeof file === 'string') return file.trim() !== '';
                                    if (typeof file === 'object' && file !== null) {
                                        return file.url || file.filename;
                                    }
                                    return false;
                                })
                                .map((file, index) => {
                                // Manejar tanto objetos como strings (retrocompatibilidad)
                                const viewUrl = typeof file === 'string' ? file : file.url;
                                const downloadUrl = typeof file === 'object' && file.download_url ? file.download_url : (typeof file === 'string' ? file : file.url);
                                const fileName = typeof file === 'object' ? 
                                    file.filename || `Archivo ${index + 1}` : 
                                    file.split('/').pop() || `Archivo ${index + 1}`;
                                
                                // Debug para verificar URLs
                                console.log(`📄 Archivo "${fileName}":`, {
                                    viewUrl: viewUrl,
                                    downloadUrl: downloadUrl,
                                    hasDownloadUrl: typeof file === 'object' && !!file.download_url,
                                    sameUrl: viewUrl === downloadUrl
                                });
                                
                                const handleDownload = (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleFileDownload(index);
                                };
                                
                                const handleView = (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleFilePreview(index);
                                };
                                
                                return (
                                    <div 
                                        key={index}
                                        className="list-group-item d-flex align-items-center"
                                    >
                                        <i className="bi bi-file-earmark me-2"></i>
                                        <span className="flex-grow-1">{fileName}</span>
                                        <div className="d-flex gap-2">
                                            <button 
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={handleView}
                                                title="Ver documento"
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                            <button 
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={handleDownload}
                                                title="Descargar archivo"
                                            >
                                                <i className="bi bi-download"></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                <div className="announcement-content" style={{ paddingTop: '8px' }}>
                    <h6 className="mb-3">
                        <i className="bi bi-card-text me-2"></i>
                        Contenido
                    </h6>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                        {announcement.content}
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer className="border-0 d-flex justify-content-center">
                <Button 
                    variant="primary" 
                    onClick={onHide}
                    className="px-5"
                >
                    Cerrar
                </Button>
            </Modal.Footer>

            {/* Modal para imagen */}
            <ImageModal
                show={showImageModal}
                onHide={() => setShowImageModal(false)}
                image={selectedImage}
                imageIndex={selectedImageIndex}
                totalImages={(announcementFiles.images || announcement.images || []).length}
                onPrevious={handlePreviousImage}
                onNext={handleNextImage}
            />

            {/* Visualizador de archivos */}
            <FileViewer
                show={showFileViewer}
                onHide={() => {
                    setShowFileViewer(false);
                    setSelectedFileData(null);
                    setFileViewerError(null);
                }}
                fileData={selectedFileData}
                isLoading={fileViewerLoading}
                error={fileViewerError}
            />

        </Modal>
    );
};

const AnnouncementBoard = () => {
    const { isAdmin, currentUser } = useContext(AuthContext);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
        date: new Date().toISOString(),
        specialties: undefined,
        images: [],
        files: []
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(3);
    const [totalPages, setTotalPages] = useState(1);
    const [specialtiesList, setSpecialtiesList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false);
    const [userSpecialties, setUserSpecialties] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [onConfirm, setOnConfirm] = useState(() => () => {});
    const [editAnnouncement, setEditAnnouncement] = useState(null);

    // Estados de validación de formulario
    const [titleError, setTitleError] = useState('');
    const [contentError, setContentError] = useState('');
    const [titleTouched, setTitleTouched] = useState(false);
    const [contentTouched, setContentTouched] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchUserSpecialties = useCallback(async () => {
        try {
            const userId = getTokenUserId();
            if (!userId) {
                setUserSpecialties([]);
                return;
            }

            const response = await api.get(`/api/users/${userId}`);
            setUserSpecialties(response.data.specialties || []);
        } catch (err) {
            setUserSpecialties([]);
        }
    }, []);

    const fetchAnnouncements = useCallback(async () => {
        try {
            let url = `/api/announcements?page=${currentPage - 1}&size=${pageSize}`;
            
            if (Array.isArray(userSpecialties) && userSpecialties.length > 0) {
                const specialtiesParam = userSpecialties.join(',');
                url += `&specialties=${encodeURIComponent(specialtiesParam)}`;
            }

            console.log('🔍 Obteniendo anuncios desde:', url);
            const response = await api.get(url);
            const announcements = response.data.content || [];
            
            // Log detallado de los anuncios y sus archivos
            console.log(`📋 ${announcements.length} anuncios obtenidos`);
            announcements.forEach((announcement, index) => {
                const imagesCount = Array.isArray(announcement.images) ? announcement.images.length : 0;
                const filesCount = Array.isArray(announcement.files) ? announcement.files.length : 0;
                if (imagesCount > 0 || filesCount > 0) {
                    console.log(`📄 Anuncio ${index + 1} "${announcement.title}": ${imagesCount} imágenes, ${filesCount} archivos`);
                    if (imagesCount > 0) {
                        console.log('  📸 Imágenes:', announcement.images);
                    }
                    if (filesCount > 0) {
                        console.log('  📎 Archivos:', announcement.files);
                        // Log adicional para mostrar la estructura de archivos
                        announcement.files.forEach((file, fileIndex) => {
                            if (typeof file === 'object') {
                                console.log(`    📄 Archivo ${fileIndex + 1}:`, {
                                    filename: file.filename,
                                    hasDownloadUrl: !!file.download_url,
                                    url: file.url
                                });
                            }
                        });
                    }
                }
            });
            
            setAnnouncements(announcements);
            setTotalPages(response.data.totalPages || 1);
            setLoading(false);
        } catch (err) {
            console.error('❌ Error al cargar anuncios:', err);
            setError('Error al cargar los anuncios');
            setLoading(false);
        }
    }, [currentPage, pageSize, userSpecialties]);

    useEffect(() => {
        fetchUserSpecialties();
    }, [fetchUserSpecialties]);

    useEffect(() => {
        // Ejecuta siempre que userSpecialties cambie, aunque esté vacío
        fetchAnnouncements();
    }, [userSpecialties, fetchAnnouncements]);

    useEffect(() => {
        const handleResize = () => {
            const height = window.innerHeight;
            if (height < 600) {
                setPageSize(2);
            } else if (height > 900) {
                setPageSize(5);
            } else {
                setPageSize(3);
            }
        };

        // Initial call
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Cargar especialidades desde la API al abrir el modal
    useEffect(() => {
        if (showNew) {
            api.get('/api/specialties')
                .then(res => setSpecialtiesList(res.data))
                .catch(() => setSpecialtiesList([]));
        }
    }, [showNew]);

    const handleCloseNew = () => {
        setShowNew(false);
        // Limpiar errores cuando se cierra el modal
        setTitleError('');
        setContentError('');
        setFormError('');
        setTitleTouched(false);
        setContentTouched(false);
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setNewAnnouncement(prev => ({
            ...prev,
            images: files
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        console.log('📎 Archivos seleccionados:', files);
        console.log('📎 Cantidad de archivos:', files.length);
        files.forEach((file, index) => {
            console.log(`📄 Archivo ${index + 1}:`, {
                name: file.name,
                size: file.size,
                type: file.type
            });
        });
        setNewAnnouncement(prev => ({
            ...prev,
            files: files
        }));
    };

    // Funciones de validación
    const validateTitle = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El título es obligatorio.';
        }
        if (value.trim().length < 3) {
            return 'El título debe tener al menos 3 caracteres.';
        }
        if (value.length > 255) {
            return 'El título no puede exceder 255 caracteres.';
        }
        return '';
    };

    const validateContent = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El contenido es obligatorio.';
        }
        if (value.trim().length < 10) {
            return 'El contenido debe tener al menos 10 caracteres.';
        }
        if (value.length > 5000) {
            return 'El contenido no puede exceder 5000 caracteres.';
        }
        return '';
    };

    // Manejadores de cambio con validación en tiempo real
    const handleTitleChange = (e) => {
        const value = e.target.value;
        setNewAnnouncement(prev => ({
            ...prev,
            title: value
        }));
        if (titleTouched) {
            setTitleError(validateTitle(value));
        }
        // Limpiar error general si existe
        if (formError) {
            setFormError('');
        }
    };

    const handleContentChange = (e) => {
        const value = e.target.value;
        setNewAnnouncement(prev => ({
            ...prev,
            content: value
        }));
        if (contentTouched) {
            setContentError(validateContent(value));
        }
        // Limpiar error general si existe
        if (formError) {
            setFormError('');
        }
    };

    // Manejadores de blur
    const handleTitleBlur = () => {
        setTitleTouched(true);
        setTitleError(validateTitle(newAnnouncement.title));
    };

    const handleContentBlur = () => {
        setContentTouched(true);
        setContentError(validateContent(newAnnouncement.content));
    };

    const showConfirmation = (message, onConfirmAction) => {
        setConfirmMessage(message);
        setOnConfirm(() => onConfirmAction);
        setShowConfirmModal(true);
    };

    const handleDeleteAnnouncement = (id) => {
        showConfirmation('¿Estás seguro de que deseas eliminar este anuncio?', async () => {
            try {
                await api.delete(`/api/announcements/${id}`);
                await fetchAnnouncements();
            } catch (err) {
                setError('Error al eliminar el anuncio');
            }
        });
    };

    const handleEditAnnouncement = (announcement) => {
        setEditAnnouncement(announcement);
        setShowNew(true);
        setNewAnnouncement({
            title: announcement.title,
            content: announcement.content,
            date: announcement.date,
            specialties: announcement.specialties,
            images: [],
            files: []
        });
        
        // Limpiar errores al abrir para editar
        setTitleError('');
        setContentError('');
        setFormError('');
        setTitleTouched(false);
        setContentTouched(false);
    };

    const handleSave = async () => {
        // Limpiar errores previos
        setFormError('');
        
        // Marcar todos los campos como touched
        setTitleTouched(true);
        setContentTouched(true);
        
        // Validar todos los campos
        const titleErr = validateTitle(newAnnouncement.title);
        const contentErr = validateContent(newAnnouncement.content);
        
        setTitleError(titleErr);
        setContentError(contentErr);
        
        // Si hay errores de validación, no continuar
        if (titleErr || contentErr) {
            setFormError('Por favor, corrige los errores antes de continuar.');
            return;
        }

        setSaving(true);
        try {
            const createdByUserId = getTokenUserId();
            if (!createdByUserId) {
                throw new Error('No se pudo obtener el ID del usuario');
            }
            
            // Preparar especialidades
            let specialtiesNames = [];
            if (Array.isArray(newAnnouncement.specialties) && newAnnouncement.specialties.length > 0) {
                specialtiesNames = specialtiesList
                    .filter(spec => newAnnouncement.specialties.includes(spec.id))
                    .map(spec => spec.name);
            }

            // FLUJO 1: Crear/editar anuncio básico (JSON)
            const announcementData = {
                title: newAnnouncement.title,
                content: newAnnouncement.content,
                specialties: specialtiesNames
            };

            let announcementId;
            if (editAnnouncement) {
                // Editar anuncio existente
                await api.put(`/api/announcements/${editAnnouncement.id}`, announcementData);
                announcementId = editAnnouncement.id;
            } else {
                // Crear nuevo anuncio
                const response = await api.post('/api/announcements', announcementData);
                announcementId = response.data.id;
            }

            // FLUJO 2: Subir archivos si existen
            console.log('🔍 Estado antes de subir archivos:', {
                announcementId,
                imagesCount: newAnnouncement.images.length,
                filesCount: newAnnouncement.files.length,
                images: newAnnouncement.images,
                files: newAnnouncement.files
            });
            
            if (announcementId && (newAnnouncement.images.length > 0 || newAnnouncement.files.length > 0)) {
                const formData = new FormData();
                let hasFilesToUpload = false;
                
                // Agregar imágenes SOLO si hay imágenes
                if (newAnnouncement.images.length > 0) {
                    console.log('📸 Agregando imágenes al FormData:', newAnnouncement.images.length);
                    newAnnouncement.images.forEach(image => {
                        console.log('📸 Agregando imagen:', image.name);
                        formData.append('images', image);
                        hasFilesToUpload = true;
                    });
                }
                
                // Agregar archivos SOLO si hay archivos
                if (newAnnouncement.files.length > 0) {
                    console.log('📎 Agregando archivos al FormData:', newAnnouncement.files.length);
                    newAnnouncement.files.forEach(file => {
                        console.log('📎 Agregando archivo:', file.name);
                        formData.append('files', file);
                        hasFilesToUpload = true;
                    });
                }
                
                console.log('🔍 hasFilesToUpload:', hasFilesToUpload);
                
                // Solo hacer la petición si realmente hay archivos que subir
                if (hasFilesToUpload) {
                    // Debug: verificar contenido del FormData
                    console.log('📤 Enviando FormData con archivos...');
                    for (let [key, value] of formData.entries()) {
                        console.log(`📤 ${key}:`, value instanceof File ? value.name : value);
                    }
                    
                    console.log('🔗 URL del endpoint:', `/api/announcements/${announcementId}/files`);
                    
                    // Eliminar el Content-Type por defecto para que axios maneje FormData automáticamente
                    const uploadResponse = await api.post(`/api/announcements/${announcementId}/files`, formData, {
                        headers: {
                            'Content-Type': undefined, // Esto permite que axios establezca automáticamente multipart/form-data
                        },
                    });
                    
                    // Debug completo de la respuesta del backend
                    console.log('🔍 Respuesta completa del backend:', uploadResponse);
                    console.log('🔍 Datos de respuesta:', uploadResponse.data);
                    console.log('🔍 Status de respuesta:', uploadResponse.status);
                    
                    // Manejar respuesta del backend con información detallada
                    if (uploadResponse.data) {
                        const { images: uploadedImages, files: uploadedFiles, uploaded, errors } = uploadResponse.data;
                        
                        console.log(`✅ Archivos subidos exitosamente: ${uploaded} de ${newAnnouncement.images.length + newAnnouncement.files.length}`);
                        
                        if (uploadedImages) {
                            console.log(`📸 Imágenes subidas: ${uploadedImages.length}`);
                            console.log('📸 Detalles de imágenes:', uploadedImages);
                        }
                        
                        if (uploadedFiles) {
                            console.log(`📎 Archivos subidos: ${uploadedFiles.length}`);
                            console.log('📎 Detalles de archivos:', uploadedFiles);
                        }
                        
                        // Si hay errores parciales, mostrarlos como warning pero no fallar completamente
                        if (errors && errors.length > 0) {
                            console.warn('⚠️ Algunos archivos tuvieron problemas:', errors);
                            console.warn('⚠️ Detalles de errores:', JSON.stringify(errors, null, 2));
                            const warningMessage = `Anuncio guardado correctamente, pero hubo problemas con algunos archivos:\n${errors.join('\n')}`;
                            setFormError(warningMessage);
                            // No hacer throw para que el anuncio se guarde
                        }
                        
                        // Si no se subió ningún archivo, mostrar información adicional
                        if (uploaded === 0) {
                            console.error('❌ No se subió ningún archivo. Posibles causas:');
                            console.error('- El backend no está procesando los archivos correctamente');
                            console.error('- Problema con el formato del FormData');
                            console.error('- Error en la validación del backend');
                            console.error('- Problema con el servicio de almacenamiento (Cloudinary)');
                        }
                    }
                }
            }

            await fetchAnnouncements();
            console.log('🔄 Anuncios recargados después de subir archivos');
            setShowNew(false);
            setEditAnnouncement(null);
            setNewAnnouncement({ title: "", content: "", date: new Date().toISOString(), specialties: undefined, images: [], files: [] });
            
            // Limpiar errores cuando se guarda exitosamente
            setTitleError('');
            setContentError('');
            setFormError('');
            setTitleTouched(false);
            setContentTouched(false);
        } catch (err) {
            let errorMessage = 'Error al guardar el anuncio';
            if (err.response?.data?.message) {
                errorMessage += `: ${err.response.data.message}`;
            } else if (err.response?.data?.error) {
                errorMessage += `: ${err.response.data.error}`;
            } else if (err.message) {
                errorMessage += `: ${err.message}`;
            }
            setFormError(errorMessage);
            console.error('Error details:', err.response?.data);
        } finally {
            setSaving(false);
        }
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const filteredSpecialties = specialtiesList.filter(spec =>
        spec.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSpecialtyToggle = (specialtyId) => {
        if (specialtyId === -1) {
            // Si se selecciona "Todas", limpiar las demás selecciones
            setNewAnnouncement(prev => ({
                ...prev,
                specialties: []
            }));
        } else {
            setNewAnnouncement(prev => {
                const currentSpecialties = prev.specialties || [];
                if (currentSpecialties.includes(specialtyId)) {
                    return {
                        ...prev,
                        specialties: currentSpecialties.filter(id => id !== specialtyId)
                    };
                } else {
                    return {
                        ...prev,
                        specialties: [...currentSpecialties, specialtyId]
                    };
                }
            });
        }
    };

    const getSelectedSpecialtiesText = () => {
        if (!newAnnouncement.specialties || newAnnouncement.specialties.length === 0) {
            return "Todas las especialidades";
        }
        return newAnnouncement.specialties
            .map(id => specialtiesList.find(spec => spec.id === id)?.name)
            .filter(Boolean)
            .join(", ");
    };

    if (loading) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <div className="text-center">
                <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Cargando...</span>
                </Spinner>
            </div>
        </Container>
    );
    if (error) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <div className="text-center text-danger">
                <i className="bi bi-exclamation-triangle-fill fs-1"></i>
                <p className="mt-2">{error}</p>
            </div>
        </Container>
    );

    return (
        <Container>
            {announcements.map(announcement => (
                <Announcement
                    key={announcement.id}
                    id={announcement.id}
                    title={announcement.title}
                    content={announcement.content}
                    date={announcement.date}
                    authorId={announcement.createdByUserId}
                    specialties={announcement.specialties}
                    images={announcement.images || []}
                    files={announcement.files || []}
                    isAdmin={isAdmin}
                    onEdit={() => handleEditAnnouncement(announcement)}
                    onDelete={() => handleDeleteAnnouncement(announcement.id)}
                />
            ))}

            {/* Controles de paginación */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-center align-items-center my-4 gap-2">
                    <Button 
                        variant="outline-secondary" 
                        onClick={() => goToPage(currentPage - 1)} 
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </Button>
                    
                    {/* Primera página */}
                    <Button
                        variant={currentPage === 1 ? 'primary' : 'outline-primary'}
                        onClick={() => goToPage(1)}
                    >
                        1
                    </Button>

                    {/* Puntos suspensivos iniciales si hay más de 3 páginas y estamos lejos del inicio */}
                    {currentPage > 3 && totalPages > 4 && (
                        <span className="mx-2">...</span>
                    )}

                    {/* Páginas alrededor de la actual */}
                    {Array.from({ length: totalPages }, (_, i) => {
                        const page = i + 1;
                        // Excluir primera y última página (ya se muestran por separado)
                        if (page === 1 || page === totalPages) return null;
                        
                        // Mostrar páginas cerca de la actual
                        if (totalPages <= 4) {
                            // Si hay 4 o menos páginas, mostrar todas
                            return (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? 'primary' : 'outline-primary'}
                                    onClick={() => goToPage(page)}
                                >
                                    {page}
                                </Button>
                            );
                        } else {
                            // Solo mostrar páginas adyacentes a la actual
                            if (Math.abs(currentPage - page) <= 1) {
                                return (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? 'primary' : 'outline-primary'}
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </Button>
                                );
                            }
                        }
                        return null;
                    })}

                    {/* Puntos suspensivos finales si hay más de 3 páginas y estamos lejos del final */}
                    {currentPage < totalPages - 2 && totalPages > 4 && (
                        <span className="mx-2">...</span>
                    )}

                    {/* Última página (solo si hay más de 1 página) */}
                    {totalPages > 1 && (
                        <Button
                            variant={currentPage === totalPages ? 'primary' : 'outline-primary'}
                            onClick={() => goToPage(totalPages)}
                        >
                            {totalPages}
                        </Button>
                    )}

                    <Button 
                        variant="outline-secondary" 
                        onClick={() => goToPage(currentPage + 1)} 
                        disabled={currentPage === totalPages}
                    >
                        Siguiente
                    </Button>
                </div>
            )}

            {isAdmin && (
                <div className="d-grid gap-2 mt-4">
                    <Button variant="primary" size="lg" onClick={() => setShowNew(true)}>
                        Nuevo Anuncio
                    </Button>
                </div>
            )}

            <Modal show={showNew} onHide={handleCloseNew}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editAnnouncement ? 'Editar anuncio' : 'Crear anuncio'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Título</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Título del anuncio"
                                value={newAnnouncement.title}
                                maxLength={255}
                                onChange={handleTitleChange}
                                onBlur={handleTitleBlur}
                                style={titleTouched && titleError ? { 
                                    border: '2px solid #d00', 
                                    background: '#fff6f6' 
                                } : {}}
                                className={titleTouched && titleError ? 'error-input' : ''}
                            />
                            <div className="d-flex justify-content-between">
                                <div>
                                    {titleTouched && titleError && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {titleError}
                                        </div>
                                    )}
                                </div>
                                <Form.Text className="text-muted">
                                    {newAnnouncement.title.length}/255 caracteres
                                </Form.Text>
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Contenido</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Escribe el contenido del anuncio..."
                                value={newAnnouncement.content}
                                maxLength={5000}
                                onChange={handleContentChange}
                                onBlur={handleContentBlur}
                                style={contentTouched && contentError ? { 
                                    border: '2px solid #d00', 
                                    background: '#fff6f6' 
                                } : {}}
                                className={contentTouched && contentError ? 'error-input' : ''}
                            />
                            <div className="d-flex justify-content-between">
                                <div>
                                    {contentTouched && contentError && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {contentError}
                                        </div>
                                    )}
                                </div>
                                <Form.Text className="text-muted">
                                    {newAnnouncement.content.length}/5000 caracteres
                                </Form.Text>
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label data-optional>Especialidades</Form.Label>
                            <div className="specialties-select-container">
                                <div 
                                    className="specialties-select-trigger"
                                    onClick={() => setShowSpecialtiesDropdown(!showSpecialtiesDropdown)}
                                >
                                    <div className="selected-specialties">
                                        {getSelectedSpecialtiesText()}
                                    </div>
                                    <div className="specialties-arrow">
                                        {showSpecialtiesDropdown ? '▲' : '▼'}
                                    </div>
                                </div>
                                
                                {showSpecialtiesDropdown && (
                                    <div className="specialties-dropdown">
                                        <InputGroup className="mb-2">
                                            <Form.Control
                                                type="text"
                                                placeholder="Buscar especialidad..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </InputGroup>
                                        
                                        <div className="specialties-list">
                                            {filteredSpecialties.map(spec => (
                                                <div 
                                                    key={spec.id}
                                                    className={`specialty-item ${(!newAnnouncement.specialties || newAnnouncement.specialties.length === 0) ? 'selected' : ''}`}
                                                    onClick={() => handleSpecialtyToggle(spec.id)}
                                                >
                                                    {spec.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label data-optional>Imágenes</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                            />
                            <Form.Text className="text-muted">
                                Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 5MB por imagen. Puedes seleccionar múltiples imágenes.
                            </Form.Text>
                            {newAnnouncement.images.length > 0 && (
                                <div className="mt-2">
                                    <small className="text-info">
                                        {newAnnouncement.images.length} imagen{newAnnouncement.images.length > 1 ? 'es' : ''} seleccionada{newAnnouncement.images.length > 1 ? 's' : ''}
                                    </small>
                                </div>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label data-optional>Archivos adjuntos</Form.Label>
                            <Form.Control
                                type="file"
                                multiple
                                onChange={handleFileChange}
                            />
                            <Form.Text className="text-muted">
                                Puedes adjuntar documentos, PDFs, etc. Tamaño máximo: 10MB por archivo.
                            </Form.Text>
                            {newAnnouncement.files.length > 0 && (
                                <div className="mt-2">
                                    <small className="text-info">
                                        {newAnnouncement.files.length} archivo{newAnnouncement.files.length > 1 ? 's' : ''} seleccionado{newAnnouncement.files.length > 1 ? 's' : ''}
                                    </small>
                                </div>
                            )}
                        </Form.Group>
                        
                        {/* Mensaje de error general */}
                        {formError && (
                            <Alert variant="danger" className="d-flex align-items-center">
                                <FaExclamationCircle className="me-2" />
                                <div style={{ whiteSpace: 'pre-line' }}>{formError}</div>
                            </Alert>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={handleCloseNew}
                        disabled={saving}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSave}
                        disabled={saving || (titleTouched && titleError) || (contentTouched && contentError)}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Guardando...
                            </>
                        ) : (
                            editAnnouncement ? 'Actualizar' : 'Crear Anuncio'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar acción</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>{confirmMessage}</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={async () => {
                        setShowConfirmModal(false);
                        await onConfirm();
                    }}>
                        Confirmar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AnnouncementBoard;