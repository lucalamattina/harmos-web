import "./AnnouncementBoard.css";
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Button, Form, Modal, Container, Card, InputGroup, Spinner } from "react-bootstrap";
import api from '../../api/api';
import { getTokenUserId } from '../../utils/auth';
import { AuthContext } from '../../context/AuthContext';
import { FaEdit, FaTrash } from 'react-icons/fa';

// Componente interno para un anuncio individual
const Announcement = ({ id, title, content, date, authorId, specialties, imageUrl, isAdmin, onEdit, onDelete }) => {
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
                {imageUrl && (
                    <div className="announcement-image-container mb-3">
                        <img 
                            src={imageUrl} 
                            alt={title} 
                            className="announcement-image"
                            style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover' }}
                        />
                    </div>
                )}
                <Card.Body>
                    <Card.Title>{truncateText(title, MAX_TITLE_LENGTH)}</Card.Title>
                    <Card.Text>{truncateText(content, MAX_CONTENT_LENGTH)}</Card.Text>
                    <Card.Footer className="text-muted">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <small>{new Date(date).toLocaleDateString()}</small>
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
                                {new Date(date).toLocaleDateString()}
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
    const { isAdmin, currentUser } = useContext(AuthContext);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
        date: new Date().toISOString(),
        specialties: undefined,
        image: null
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

    const handleCloseNew = () => setShowNew(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewAnnouncement(prev => ({
                ...prev,
                image: file
            }));
        }
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
            image: null
        });
    };

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
                const formData = new FormData();
                formData.append('title', newAnnouncement.title);
                formData.append('content', newAnnouncement.content);
                formData.append('date', formattedDate);
                formData.append('createdByUserId', createdByUserId);
                formData.append('specialties', JSON.stringify(specialtiesNames));
                if (newAnnouncement.image) {
                    formData.append('image', newAnnouncement.image);
                }
                if (editAnnouncement) {
                    await api.put(`/api/announcements/${editAnnouncement.id}`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                } else {
                    await api.post('/api/announcements', formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                }
                await fetchAnnouncements();
                setShowNew(false);
                setEditAnnouncement(null);
                setNewAnnouncement({ title: "", content: "", date: new Date().toISOString(), specialties: undefined, image: null });
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
                    id={announcement.id}
                    title={announcement.title}
                    content={announcement.content}
                    date={announcement.date}
                    authorId={announcement.createdByUserId}
                    specialties={announcement.specialties}
                    imageUrl={announcement.imageUrl}
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

                    {/* Puntos suspensivos iniciales si es necesario */}
                    {currentPage > 2 && (
                        <span className="mx-2">...</span>
                    )}

                    {/* Páginas alrededor de la actual */}
                    {Array.from({ length: totalPages }, (_, i) => {
                        if (i === 0 || i === totalPages - 1) return null; // Excluir primera y última página
                        if (Math.abs(currentPage - (i + 1)) <= 1) { // Mostrar solo páginas adyacentes
                            return (
                                <Button
                                    key={i + 1}
                                    variant={currentPage === i + 1 ? 'primary' : 'outline-primary'}
                                    onClick={() => goToPage(i + 1)}
                                >
                                    {i + 1}
                                </Button>
                            );
                        }
                        return null;
                    })}

                    {/* Puntos suspensivos finales si es necesario */}
                    {currentPage < totalPages - 3 && (
                        <span className="mx-2">...</span>
                    )}

                    {/* Última página */}
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
                        <Form.Group className="mb-3">
                            <Form.Label>Imagen</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                            <Form.Text className="text-muted">
                                Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 5MB
                            </Form.Text>
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