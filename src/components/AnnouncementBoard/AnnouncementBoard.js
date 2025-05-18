import "./AnnouncementBoard.css";
import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Container, Card, InputGroup, Spinner } from "react-bootstrap";
import api from '../../api/api';

// Componente interno para un anuncio individual
const Announcement = ({ title, content, date, authorId }) => {
    const [authorName, setAuthorName] = useState('Cargando...');

    useEffect(() => {
        const fetchAuthor = async () => {
            try {
                const response = await api.get(`/api/users/${authorId}`);
                setAuthorName(response.data.name);
            } catch (err) {
                console.error('Error fetching author:', err);
                setAuthorName('Autor desconocido');
            }
        };

        fetchAuthor();
    }, [authorId]);

    return (
        <Card className="mb-3">
            <Card.Body>
                <Card.Title>{title}</Card.Title>
                <Card.Text>{content}</Card.Text>
                <Card.Footer className="text-muted">
                    <div className="d-flex justify-content-between align-items-center">
                        <small>{new Date(date).toLocaleDateString()}</small>
                        <small>Autor: {authorName}</small>
                    </div>
                </Card.Footer>
            </Card.Body>
        </Card>
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
    // Estado para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(3); // Default value
    const [specialtiesList, setSpecialtiesList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false);
    const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
    const [doctorSpecialty, setDoctorSpecialty] = useState('');
    const [specialties, setSpecialties] = useState([]);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

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

    const fetchAnnouncements = async () => {
        try {
            const response = await api.get('/api/announcements');
            setAnnouncements(response.data.content || []);
            setLoading(false);
        } catch (err) {
            console.error('Error detallado:', err);
            setError('Error al cargar los anuncios');
            setLoading(false);
        }
    };

    const handleCloseNew = () => setShowNew(false);

    const handleSave = async () => {
        if (newAnnouncement.title && newAnnouncement.content) {
            try {
                const createdByUserId = 2;
                const now = new Date();
                const pad = n => n.toString().padStart(2, '0');
                const formattedDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

                // Mapear los IDs seleccionados a nombres
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
                console.error('Error al guardar:', err);
                setError('Error al guardar el anuncio');
            }
        }
    };

    // Paginación
    const totalPages = Math.ceil(announcements.length / pageSize);
    const paginatedAnnouncements = announcements.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
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
            {Array.isArray(paginatedAnnouncements) && paginatedAnnouncements.map(announcement => (
                <Announcement
                    key={announcement.id}
                    title={announcement.title}
                    content={announcement.content}
                    date={announcement.date}
                    authorId={announcement.createdByUserId}
                />
            ))}

            {/* Controles de paginación */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-center align-items-center my-4 gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
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
                    <button className="btn btn-outline-secondary" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
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
                                onChange={e => setNewAnnouncement(prev => ({
                                    ...prev,
                                    title: e.target.value
                                }))}
                            />
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
                                            <div 
                                                className={`specialty-item ${(!newAnnouncement.specialties || newAnnouncement.specialties.length === 0) ? 'selected' : ''}`}
                                                onClick={() => handleSpecialtyToggle(-1)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={!newAnnouncement.specialties || newAnnouncement.specialties.length === 0}
                                                    onChange={() => {}}
                                                />
                                                <span>Todas las especialidades</span>
                                            </div>
                                            
                                            {filteredSpecialties.map(spec => (
                                                <div 
                                                    key={spec.id}
                                                    className={`specialty-item ${newAnnouncement.specialties?.includes(spec.id) ? 'selected' : ''}`}
                                                    onClick={() => handleSpecialtyToggle(spec.id)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={newAnnouncement.specialties?.includes(spec.id)}
                                                        onChange={() => {}}
                                                    />
                                                    <span>{spec.name}</span>
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