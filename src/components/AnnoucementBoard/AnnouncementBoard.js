import "./AnnouncementBoard.css";
import Announcement from "../../containers/Announcement/Announcement";
import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Container } from "react-bootstrap";
import api from '../../config/api';

const AnnouncementBoard = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
        date: new Date().toISOString()
    });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const response = await api.get('/api/announcements');
            console.log('API Response:', response.data); // Para debugging
            setAnnouncements(response.data.content || []);
            setLoading(false);
        } catch (err) {
            console.error('Error detallado:', err);
            setError('Error al cargar los anuncios');
            setLoading(false);
        }
    };

    const handleCloseNew = () => {
        setShowNew(false);
    };

    const handleSave = async () => {
        if (newAnnouncement.title && newAnnouncement.content) {
            try {
                await api.post('/api/announcements', newAnnouncement);
                await fetchAnnouncements(); // Recargar los anuncios
                setShowNew(false);
                setNewAnnouncement({ title: "", content: "", date: new Date().toISOString() });
            } catch (err) {
                console.error('Error al guardar:', err);
                setError('Error al guardar el anuncio');
            }
        }
    };

    const handleShowNew = () => setShowNew(true);

    if (loading) return <div>Cargando anuncios...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <Container>
            <div className="border-bottom border-2 border-dark announcement mb-4">
                <h1 className="announcement-title">Anuncios</h1>
            </div>

            {Array.isArray(announcements) && announcements.length > 0 ? (
                announcements.map((announcement) => (
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

            <div className="d-grid gap-2 mt-4">
                <Button variant="primary" size="lg" onClick={handleShowNew}>
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