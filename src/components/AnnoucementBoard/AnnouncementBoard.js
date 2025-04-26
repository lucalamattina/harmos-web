import "./AnnouncementBoard.css";
import Announcement from "../../containers/Announcement/Announcement";
import React, { useState, useEffect } from 'react';
import { Button, Form, Modal } from "react-bootstrap";
import api from '../../config/api';

const AnnouncementBoard = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const response = await api.get('/api/announcements');
                setAnnouncements(response.data);
                setLoading(false);
            } catch (err) {
                setError('Error fetching announcements');
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, []);

    const [showNew, setShowNew] = useState(false);
    const handleCloseNew = () => {
        if (newAnnouncement.title !== "" && newAnnouncement.content !== "") {
            setAnnouncements((prev) => [...prev, newAnnouncement]);
        }
        setShowNew(false);
    };
    const handleShowNew = () => setShowNew(true);

    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
        date: new Date().toISOString().split('T')[0],
        author: "Juan Carlos Fernandez"
    });

    if (loading) return <div>Loading announcements...</div>;
    if (error) return <div>{error}</div>;

    return (
        <>
            <div className="border-bottom border-2 border-dark announcement">
                <h1 className="announcement-title">Anuncios:</h1>
            </div>
            <ul className="list-unstyled" style={{ margin: "50px" }}>
                <li>
                    {announcements.map((announcement) => (
                        <Announcement
                            key={announcement.id}
                            title={announcement.title}
                            content={announcement.content}
                            date={announcement.date}
                            author={announcement.author}
                        />
                    ))}
                </li>
            </ul>
            <div className="d-grid gap-2" style={{ margin: "50px" }}>
                <Button variant="primary" size="lg" onClick={handleShowNew}>Nuevo Anuncio</Button>{' '}
            </div>
            <Modal show={showNew} onHide={handleCloseNew}>
                <Modal.Header closeButton>
                    <Modal.Title>Crear evento</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Título</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Título"
                                autoFocus
                                onChange={e => setNewAnnouncement((prev) => ({ ...prev, title: e.target.value }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Ubicación</Form.Label>
                            <Form.Control
                                as="textarea" rows={3}
                                placeholder="Mensaje"
                                onChange={e => setNewAnnouncement((prev) => ({ ...prev, content: e.target.value }))}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseNew}>
                        Cerrar
                    </Button>
                    <Button variant="primary" onClick={handleCloseNew}>
                        Guardar
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default AnnouncementBoard;

