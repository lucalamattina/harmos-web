import "./AnnouncementBoard.css";
import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Container, Card } from "react-bootstrap";
import api from '../../api/api';

// Componente interno para un anuncio individual
const Announcement = ({ title, content, date, author }) => (
    <Card className="mb-3">
        <Card.Body>
            <Card.Title>{title}</Card.Title>
            <Card.Text>{content}</Card.Text>
            <Card.Footer className="text-muted">
                Fecha: {new Date(date).toLocaleDateString()}
                {author && ` - Autor: ${author}`}
            </Card.Footer>
        </Card.Body>
    </Card>
);

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
    const pageSize = 5;
    const [specialtiesList, setSpecialtiesList] = useState([]);

    useEffect(() => {
        fetchAnnouncements();
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

    if (loading) return <div>Cargando anuncios...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <Container>
            {Array.isArray(paginatedAnnouncements) && paginatedAnnouncements.length > 0 ? (
                paginatedAnnouncements.map(announcement => (
                    <Announcement
                        key={announcement.id}
                        title={announcement.title}
                        content={announcement.content}
                        date={announcement.date}
                        author={announcement.createdByUserId}
                    />
                ))
            ) : (
                <p>No hay anuncios disponibles</p>
            )}

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
                            <Form.Label>Especialidades (opcional)</Form.Label>
                            <Form.Select
                                multiple
                                value={newAnnouncement.specialties || []}
                                onChange={e => {
                                    const options = Array.from(e.target.selectedOptions, opt => Number(opt.value));
                                    setNewAnnouncement(prev => ({
                                        ...prev,
                                        specialties: options
                                    }));
                                }}
                            >
                                {specialtiesList.map(spec => (
                                    <option key={spec.id} value={spec.id}>{spec.name}</option>
                                ))}
                            </Form.Select>
                            <Form.Text muted>Deja vacío para aplicar a todas las especialidades.</Form.Text>
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