import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col } from 'react-bootstrap';
import api from '../../config/api';

const Announcement = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const response = await api.get('/api/announcements');
                setAnnouncements(response.data.content); // Modificado aquí
                setLoading(false);
            } catch (err) {
                setError('Error fetching announcements');
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, []);

    if (loading) return <div>Loading announcements...</div>;
    if (error) return <div>{error}</div>;

    return (
        <Container className="mt-4">
            <h2>Announcements</h2>
            <Row>
                {announcements.map((announcement) => (
                    <Col key={announcement.id} md={6} className="mb-4">
                        <Card>
                            <Card.Body>
                                <Card.Title>{announcement.title}</Card.Title>
                                <Card.Text>{announcement.content}</Card.Text>
                                <Card.Footer className="text-muted">
                                    {new Date(announcement.createdAt).toLocaleDateString()}
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
