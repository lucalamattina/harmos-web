import "./AnnouncementBoard.css";
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Form, Modal, Container, Card, InputGroup, Spinner } from "react-bootstrap";
import api from '../../api/api';

// Componente interno para un anuncio individual
const Announcement = ({ title, content, date, authorId, specialties }) => {
    const [authorName, setAuthorName] = useState('Cargando...');
    const [showFull, setShowFull] = useState(false);
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

    const truncateText = (text, maxLength) => {
        if (!text || text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    const formatSpecialties = (specialties) => {
        if (!specialties || specialties.length === 0) return 'Todas las especialidades';
        return specialties.map(spec => typeof spec === 'object' ? spec.name : spec).join(', ');
    };

    return (
        <>
            <Card className="mb-3 announcement-card" onClick={() => setShowFull(true)}>
                <Card.Body>
                    <Card.Title>{truncateText(title, MAX_TITLE_LENGTH)}</Card.Title>
                    <Card.Text>{truncateText(content, MAX_CONTENT_LENGTH)}</Card.Text>
                    <Card.Footer className="text-muted">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <small>
                                    {new Date(date).toLocaleDateString()} {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </small>
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

            <Modal 
                show={showFull} 
                onHide={() => setShowFull(false)} 
                size="lg"
                dialogClassName="modal-dialog-responsive"
                centered
            >
                <Modal.Header className="border-bottom-0 sticky-top bg-white" style={{ zIndex: 1031 }}>
                    <Modal.Title>{title}</Modal.Title>
                </Modal.Header>
                <div className="announcement-metadata sticky-top bg-light mb-0 p-3" style={{ top: '56px', zIndex: 1030, borderRadius: 0 }}>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <small className="text-muted">
                                <i className="bi bi-calendar me-1"></i>
                                {new Date(date).toLocaleDateString()} {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </small>
                            <small className="text-muted ms-3">
                                <i className="bi bi-person me-1"></i>
                                {authorName}
                            </small>
                        </div>
                        <div>
                            <small className="text-muted">
                                <i className="bi bi-tags me-1"></i>
                                {formatSpecialties(specialties)}
                            </small>
                        </div>
                    </div>
                </div>
                <Modal.Body>
                    <div className="announcement-content" style={{ paddingTop: '8px' }}>
                        {content}
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0 d-flex justify-content-center">
                    <Button 
                        variant="primary" 
                        onClick={() => setShowFull(false)}
                        className="px-5"
                    >
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

const AnnouncementBoard = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
        date: new Date().toISOString(),
        specialties: undefined
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(3);
    const [totalPages, setTotalPages] = useState(1);
    const [specialtiesList, setSpecialtiesList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false);
    const [userSpecialties, setUserSpecialties] = useState([]);

    const getTokenUserId = useCallback(() => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;

            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload).sub;
        } catch (error) {
            return null;
        }
    }, []);

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
    }, [getTokenUserId]);

    const fetchAnnouncements = useCallback(async () => {
        try {
            let url = `/api/announcements?page=${currentPage - 1}&size=${pageSize}`;
            
            if (Array.isArray(userSpecialties) && userSpecialties.length > 0) {
                const specialtiesParam = userSpecialties.join(',');
                url += `&specialties=${encodeURIComponent(specialtiesParam)}`;
            }

            const response = await api.get(url);
            setAnnouncements(response.data.content || []);
            setTotalPages(response.data.totalPages || 1);
            setLoading(false);
        } catch (err) {
            setError('Error al cargar los anuncios');
            setLoading(false);
        }
    }, [currentPage, pageSize, userSpecialties]);

    useEffect(() => {
        fetchUserSpecialties();
    }, [fetchUserSpecialties]);

    useEffect(() => {
        if (userSpecialties.length > 0) {
            fetchAnnouncements();
        }
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

    const handleCloseNew = () => setShowNew(false);

    const handleSave = async () => {
        if (newAnnouncement.title && newAnnouncement.content) {
            try {
                const createdByUserId = getTokenUserId();
                if (!createdByUserId) {
                    throw new Error('No se pudo obtener el ID del usuario');
                }

                const now = new Date();
                const pad = n => n.toString().padStart(2, '0');
                const formattedDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

                let specialtiesNames = [];
                if (Array.isArray(newAnnouncement.specialties) && newAnnouncement.specialties.length > 0) {
                    specialtiesNames = specialtiesList
                        .filter(spec => newAnnouncement.specialties.includes(spec.id))
                        .map(spec => spec.name);
                }

                const payload = {
                    title: newAnnouncement.title,
                    content: newAnnouncement.content,
                    date: formattedDate,
                    createdByUserId,
                    specialties: specialtiesNames
                };

                await api.post('/api/announcements', payload);
                await fetchAnnouncements();
                setShowNew(false);
                setNewAnnouncement({ title: "", content: "", date: new Date().toISOString(), specialties: undefined });
            } catch (err) {
                let errorMessage = 'Error al guardar el anuncio';
                if (err.response?.data?.message) {
                    errorMessage += `: ${err.response.data.message}`;
                } else if (err.response?.data?.error) {
                    errorMessage += `: ${err.response.data.error}`;
                } else if (err.message) {
                    errorMessage += `: ${err.message}`;
                }
                setError(errorMessage);
            }
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
                    title={announcement.title}
                    content={announcement.content}
                    date={announcement.date}
                    authorId={announcement.createdByUserId}
                    specialties={announcement.specialties}
                />
            ))}

            {/* Controles de paginación */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-center align-items-center my-4 gap-2">
                    <button 
                        className="btn btn-outline-secondary" 
                        onClick={() => goToPage(currentPage - 1)} 
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i + 1}
                            className={`btn ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => goToPage(i + 1)}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button 
                        className="btn btn-outline-secondary" 
                        onClick={() => goToPage(currentPage + 1)} 
                        disabled={currentPage === totalPages}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            <div className="d-grid gap-2 mt-4">
                <Button variant="primary" size="lg" onClick={() => setShowNew(true)}>
                    Nuevo Anuncio
                </Button>
            </div>

            <Modal show={showNew} onHide={handleCloseNew}>
                <Modal.Header closeButton>
                    <Modal.Title>Crear anuncio</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Título</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Título"
                                value={newAnnouncement.title}
                                maxLength={255}
                                onChange={e => setNewAnnouncement(prev => ({
                                    ...prev,
                                    title: e.target.value
                                }))}
                            />
                            <Form.Text className="text-muted">
                                {newAnnouncement.title.length}/255 caracteres
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Contenido</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Contenido del anuncio"
                                value={newAnnouncement.content}
                                onChange={e => setNewAnnouncement(prev => ({
                                    ...prev,
                                    content: e.target.value
                                }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Especialidades</Form.Label>
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
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseNew}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Guardar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AnnouncementBoard;