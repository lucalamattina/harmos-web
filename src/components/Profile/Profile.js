import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Badge } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaEdit, FaSave, FaTimes, FaGraduationCap } from 'react-icons/fa';
import api from '../../api/api';
import { getTokenUserId } from '../../utils/auth';
import './Profile.css';

const Profile = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone: '',
        institution: '',
        specialties: []
    });
    const [availableSpecialties, setAvailableSpecialties] = useState([]);

    useEffect(() => {
        fetchUserData();
        fetchSpecialties();
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

    const fetchSpecialties = async () => {
        try {
            const response = await api.get('/api/specialties');
            setAvailableSpecialties(response.data);
        } catch (err) {
            console.error('Error al cargar las especialidades:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSpecialtyChange = (specialty) => {
        setUserData(prev => {
            const specialties = prev.specialties || [];
            if (specialties.includes(specialty)) {
                return {
                    ...prev,
                    specialties: specialties.filter(s => s !== specialty)
                };
            } else {
                return {
                    ...prev,
                    specialties: [...specialties, specialty]
                };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const userId = getTokenUserId();
            if (!userId) {
                setError('No se pudo obtener el usuario actual');
                return;
            }
            await api.put(`/api/users/${userId}`, userData);
            setSuccess('Perfil actualizado exitosamente');
            setIsEditing(false);
        } catch (err) {
            setError('Error al actualizar el perfil');
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
                            {!isEditing ? (
                                <Button 
                                    variant="outline-primary" 
                                    onClick={() => setIsEditing(true)}
                                    className="edit-button"
                                >
                                    <FaEdit className="me-2" /> Editar
                                </Button>
                            ) : (
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={() => setIsEditing(false)}
                                    className="edit-button"
                                >
                                    <FaTimes className="me-2" /> Cancelar
                                </Button>
                            )}
                        </Card.Header>
                        <Card.Body>
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}
                            
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FaUser className="me-2" /> Nombre
                                    </Form.Label>
                                    {isEditing ? (
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            value={userData.name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    ) : (
                                        <p className="profile-info">{userData.name}</p>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FaEnvelope className="me-2" /> Correo Electrónico
                                    </Form.Label>
                                    {isEditing ? (
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            value={userData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    ) : (
                                        <p className="profile-info">{userData.email}</p>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FaPhone className="me-2" /> Teléfono
                                    </Form.Label>
                                    {isEditing ? (
                                        <Form.Control
                                            type="tel"
                                            name="phone"
                                            value={userData.phone}
                                            onChange={handleInputChange}
                                        />
                                    ) : (
                                        <p className="profile-info">{userData.phone || 'No especificado'}</p>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FaBuilding className="me-2" /> Institución
                                    </Form.Label>
                                    {isEditing ? (
                                        <Form.Control
                                            type="text"
                                            name="institution"
                                            value={userData.institution}
                                            onChange={handleInputChange}
                                        />
                                    ) : (
                                        <p className="profile-info">{userData.institution || 'No especificada'}</p>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>
                                        <FaGraduationCap className="me-2" /> Especialidades
                                    </Form.Label>
                                    {isEditing ? (
                                        <div className="specialties-container">
                                            {availableSpecialties.map((specialty) => (
                                                <Form.Check
                                                    key={specialty}
                                                    type="checkbox"
                                                    id={`specialty-${specialty}`}
                                                    label={specialty}
                                                    checked={userData.specialties?.includes(specialty)}
                                                    onChange={() => handleSpecialtyChange(specialty)}
                                                    className="specialty-checkbox"
                                                />
                                            ))}
                                        </div>
                                    ) : (
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
                                    )}
                                </Form.Group>

                                {isEditing && (
                                    <div className="text-end mt-4">
                                        <Button type="submit" variant="primary">
                                            <FaSave className="me-2" /> Guardar Cambios
                                        </Button>
                                    </div>
                                )}
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Profile; 