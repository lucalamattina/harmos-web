import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Spinner } from 'react-bootstrap';
import api from '../../api/api';
import { useNavigate } from 'react-router-dom';

const Announcement = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const response = await api.get('/api/announcements');
                const announcementsData = response.data.content;
                console.log('Announcements data:', announcementsData);
                
                // Obtener los nombres de los autores
                const announcementsWithAuthors = await Promise.all(
                    announcementsData.map(async (announcement) => {
                        try {
                            console.log('Fetching user:', announcement.createdByUserId);
                            const userResponse = await api.get(`/api/users/${announcement.createdByUserId}`);
                            console.log('User response:', userResponse.data);
                            return {
                                ...announcement,
                                authorName: userResponse.data.name || 'Autor desconocido'
                            };
                        } catch (err) {
                            console.error('Error fetching user:', err);
                            return {
                                ...announcement,
                                authorName: 'Autor desconocido'
                            };
                        }
                    })
                );
                
                console.log('Final announcements with authors:', announcementsWithAuthors);
                setAnnouncements(announcementsWithAuthors);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching announcements:', err);
                if (err.response?.status === 401) {
                    // Si el error es de autenticación, redirigir al login
                    navigate('/login');
                } else {
                    setError('Error al cargar los anuncios. Por favor, intenta de nuevo.');
                }
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, [navigate]);

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
        <Container className="mt-4">
            <h2>Anuncios</h2>
            <Row>
                {announcements.map((announcement) => (
                    <Col key={announcement.id} md={6} className="mb-4">
                        <Card>
                            <Card.Body>
                                <Card.Title>{announcement.title}</Card.Title>
                                <Card.Text>{announcement.content}</Card.Text>
                                <Card.Footer className="text-muted">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <small>Por: {announcement.authorName || 'Autor desconocido'}</small>
                                        <small>{new Date(announcement.createdAt).toLocaleDateString()}</small>
                                    </div>
                                </Card.Footer>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
};

export default Announcement;