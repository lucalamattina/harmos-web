import "./AnnouncementBoard.css";
import Announcement from "../../containers/Announcement/Announcement";
import React, {useState} from 'react'
import {Button, Form, Modal} from "react-bootstrap";

const AnnouncementBoard = () => {

    const fixedAnnouncements = [
        {
            id: 2,
            title: 'Nuevo calendario',
            content: 'Les informamos que quedo disponible el calendario semanal para que puedan ver los turnos de la semana.',
            date: '2023-06-02',
            author: 'Juana Gonzalez',
        },
        {
            id: 1,
            title: 'Bienvenidos',
            content: 'Les presentamos la nueva plataforma de Harmos, en la cual van a poder ver anuncios, calendario semanal, informacion de los pacientes e informes.',
            date: '2023-06-01',
            author: 'Juan Carlos Fernandez',
        }
    ];

    const [announcements, setAnnouncements] = useState(fixedAnnouncements);

    const [showNew, setShowNew] = useState(false);
    const handleCloseNew = () => {
        if (newAnnouncement.title !== "" && newAnnouncement.content !== "") {
            setAnnouncements((prev) => [...prev, newAnnouncement])
        }
        setShowNew(false);
    }
    const handleShowNew = () => setShowNew(true);

    const [newAnnouncement, setNewAnnouncement] = useState({
        title: "",
        content: "",
        date: "2023-06-07",
        author: "Juan Carlos Fernandez"
    });

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

