import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { FaArrowLeft, FaCalendarAlt, FaUser, FaTags } from 'react-icons/fa';
import api from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { AnnouncementModal } from './AnnouncementBoard';
import { formatDate } from '../../utils/dateUtils';
import './AnnouncementBoard.css';

const SingleAnnouncement = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAdmin } = useContext(AuthContext);
    const [announcement, setAnnouncement] = useState(null);
    const [authorName, setAuthorName] = useState('Cargando...');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchAnnouncement = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Obtener el anuncio específico
                const response = await api.get(`/api/announcements/${id}`);
                const announcementData = response.data;
                
                setAnnouncement(announcementData);
                
                // Obtener información del autor
                if (announcementData.createdByUserId) {
                    try {
                        const authorResponse = await api.get(`/api/users/${announcementData.createdByUserId}`);
                        setAuthorName(authorResponse.data.name);
                    } catch (err) {
                        setAuthorName('Autor desconocido');
                    }
                }
                
            } catch (err) {
                console.error('Error al cargar el anuncio:', err);
                if (err.response?.status === 404) {
                    setError('Anuncio no encontrado');
                } else if (err.response?.status === 401) {
                    setError('No tienes permisos para ver este anuncio');
                } else {
                    setError('Error al cargar el anuncio');
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchAnnouncement();
        }
    }, [id]);

    // La función formatDate ahora viene del utils/dateUtils.js

    const formatSpecialties = (specialties) => {
        if (!specialties || specialties.length === 0) return 'Todas las especialidades';
        return specialties.map(spec => typeof spec === 'object' ? spec.name : spec).join(', ');
    };

    const renderImages = (images) => {
        if (!images || images.length === 0) return null;
        
        return (
            <div className="mt-3">
                <h6 className="text-muted mb-2">Imágenes adjuntas:</h6>
                <div className="single-announcement-images">
                    {images.slice(0, 3).map((image, index) => {
                        const imageUrl = typeof image === 'string' ? image : image.url;
                        return (
                            <div key={index} className="position-relative">
                                <img 
                                    src={imageUrl}
                                    alt={`Imagen ${index + 1}`}
                                    className="single-announcement-image"
                                    onClick={() => setShowModal(true)}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>
                        );
                    })}
                    {images.length > 3 && (
                        <div 
                            className="d-flex align-items-center justify-content-center"
                            style={{
                                width: '100px',
                                height: '100px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                border: '2px dashed #dee2e6'
                            }}
                            onClick={() => setShowModal(true)}
                        >
                            <span className="text-muted">+{images.length - 3} más</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFiles = (files) => {
        if (!files || files.length === 0) return null;
        
        return (
            <div className="single-announcement-files">
                <h6 className="text-muted mb-2">Archivos adjuntos:</h6>
                <div>
                    {files.map((file, index) => {
                        const filename = typeof file === 'object' ? file.filename || file.name : file;
                        return (
                            <div key={index} className="single-announcement-file-item">
                                <span className="text-truncate flex-grow-1">{filename}</span>
                                <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={() => setShowModal(true)}
                                >
                                    Ver
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <Container className="announcement">
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </Spinner>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="announcement">
                <Alert variant="danger" className="text-center">
                    <h5>{error}</h5>
                    <Button 
                        variant="outline-primary" 
                        onClick={() => navigate('/')}
                        className="mt-2"
                    >
                        <FaArrowLeft className="me-2" />
                        Volver a Anuncios
                    </Button>
                </Alert>
            </Container>
        );
    }

    if (!announcement) {
        return (
            <Container className="announcement">
                <Alert variant="warning" className="text-center">
                    <h5>Anuncio no encontrado</h5>
                    <Button 
                        variant="outline-primary" 
                        onClick={() => navigate('/')}
                        className="mt-2"
                    >
                        <FaArrowLeft className="me-2" />
                        Volver a Anuncios
                    </Button>
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="announcement">
            <div className="d-flex align-items-center mb-4">
                <Button 
                    variant="outline-secondary" 
                    onClick={() => navigate('/')}
                    className="me-3"
                >
                    <FaArrowLeft className="me-2" />
                    Volver
                </Button>
            </div>

            <Card className="shadow-sm single-announcement-card">
                <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-start">
                        <div>
                            <h2 className="text-primary mb-2">{announcement.title}</h2>
                            <div className="d-flex flex-wrap gap-3 text-muted small">
                                <span>
                                    <FaUser className="me-1" />
                                    {authorName}
                                </span>
                                <span>
                                    <FaCalendarAlt className="me-1" />
                                    {formatDate(announcement.date)}
                                </span>
                                <span>
                                    <FaTags className="me-1" />
                                    {formatSpecialties(announcement.specialties)}
                                </span>
                            </div>
                        </div>
                        <Button 
                            variant="outline-primary" 
                            onClick={() => setShowModal(true)}
                        >
                            Ver Completo
                        </Button>
                    </div>
                </Card.Header>

                <Card.Body>
                    <div className="announcement-content">
                        {announcement.content}
                    </div>

                    {renderImages(announcement.images)}
                    {renderFiles(announcement.files)}
                </Card.Body>
            </Card>

            {/* Modal para vista completa */}
            {announcement && (
                <AnnouncementModal
                    show={showModal}
                    onHide={() => setShowModal(false)}
                    announcement={announcement}
                    authorName={authorName}
                />
            )}
        </Container>
    );
};

export default SingleAnnouncement; 