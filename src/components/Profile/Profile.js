import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Alert, Badge } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaGraduationCap } from 'react-icons/fa';
import api from '../../api/api';
import { getTokenUserId } from '../../utils/auth';
import './Profile.css';

const Profile = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone: '',
        institution: '',
        specialties: []
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const userId = getTokenUserId();
            if (!userId) {
                setError('No se pudo obtener el usuario actual');
                setLoading(false);
                return;
            }
            const response = await api.get(`/api/users/${userId}`);
            setUserData(response.data);
            setLoading(false);
        } catch (err) {
            setError('Error al cargar los datos del usuario');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className="profile-container">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            </Container>
        );
    }

    return (
        <Container className="profile-container">
            <Row className="justify-content-center">
                <Col md={8}>
                    <Card className="profile-card">
                        <Card.Header className="profile-header">
                            <h2>Mi Perfil</h2>
                        </Card.Header>
                        <Card.Body>
                            {error && <Alert variant="danger">{error}</Alert>}
                            
                            <div className="profile-info-container">
                                <div className="mb-4">
                                    <div className="profile-label">
                                        <FaUser className="me-2" /> Nombre
                                    </div>
                                    <p className="profile-info">{userData.name}</p>
                                </div>

                                <div className="mb-4">
                                    <div className="profile-label">
                                        <FaEnvelope className="me-2" /> Correo Electrónico
                                    </div>
                                    <p className="profile-info">{userData.email}</p>
                                </div>

                                <div className="mb-4">
                                    <div className="profile-label">
                                        <FaPhone className="me-2" /> Teléfono
                                    </div>
                                    <p className="profile-info">{userData.phone || 'No especificado'}</p>
                                </div>

                                <div className="mb-4">
                                    <div className="profile-label">
                                        <FaBuilding className="me-2" /> Institución
                                    </div>
                                    <p className="profile-info">{userData.institution || 'No especificada'}</p>
                                </div>

                                <div className="mb-4">
                                    <div className="profile-label">
                                        <FaGraduationCap className="me-2" /> Especialidades
                                    </div>
                                    <div className="specialties-display">
                                        {userData.specialties?.length > 0 ? (
                                            userData.specialties.map((specialty) => (
                                                <Badge 
                                                    key={specialty} 
                                                    bg="primary" 
                                                    className="specialty-badge"
                                                >
                                                    {specialty}
                                                </Badge>
                                            ))
                                        ) : (
                                            <p className="profile-info">No hay especialidades seleccionadas</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Profile; 