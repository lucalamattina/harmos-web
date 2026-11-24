import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Row, Col, Alert, Badge, Table, Spinner } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaGraduationCap, FaUsers } from 'react-icons/fa';
import api from '../../api/api';
import { getTokenUserId } from '../../utils/auth';
import './Profile.css';

const Profile = () => {
    const [loading, setLoading] = useState(true);
    const [loadingPatients, setLoadingPatients] = useState(true);
    const [error, setError] = useState('');
    const [patientsError, setPatientsError] = useState('');
    const [userData, setUserData] = useState({
        name: '',
        email: '',
        phone: '',
        institution: '',
        specialty: ''
    });
    const [patients, setPatients] = useState([]);

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

    const fetchMyPatients = useCallback(async () => {
        try {
            // Limpiar errores previos
            setPatientsError('');
            setLoadingPatients(true);
            
            // El backend devuelve todos los pacientes a cualquier usuario, así que
            // hay que filtrar explícitamente por el id del usuario actual (claim `sub`).
            const userId = getTokenUserId();
            if (!userId) {
                setPatientsError('No se pudo obtener el usuario actual');
                setLoadingPatients(false);
                return;
            }

            const params = new URLSearchParams({ doctorId: userId, page: '0', size: '1000' });
            const response = await api.get(`/api/patients?${params.toString()}`);
            const patientsData = response.data;
            
            let patients = [];
            if (Array.isArray(patientsData)) {
                patients = patientsData;
            } else if (patientsData && Array.isArray(patientsData.content)) {
                patients = patientsData.content;
            } else if (patientsData && patientsData.content) {
                patients = patientsData.content;
            } else {
                patients = [];
            }
            
            setPatients(patients);
            setLoadingPatients(false);
        } catch (err) {
            console.error('Error al cargar pacientes:', err);
            setPatientsError('Error al cargar los pacientes');
            setPatients([]);
            setLoadingPatients(false);
        }
    }, []);

    useEffect(() => {
        fetchUserData();
        fetchMyPatients();
    }, [fetchMyPatients]);

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
                            
                            <Row>
                                <Col md={6}>
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
                                </Col>

                                <Col md={6}>
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
                                            {userData.specialty ? (
                                                <Badge bg="primary" className="specialty-badge">
                                                    {userData.specialty}
                                                </Badge>
                                            ) : (
                                                <p className="profile-info">No hay especialidad seleccionada</p>
                                            )}
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Sección de Mis Pacientes */}
                    <Card className="profile-card mt-4">
                        <Card.Header className="profile-header">
                            <h3><FaUsers className="me-2" />Mis Pacientes</h3>
                        </Card.Header>
                        <Card.Body>
                            {patientsError && <Alert variant="danger">{patientsError}</Alert>}
                            
                            {loadingPatients ? (
                                <div className="text-center py-4">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2 text-muted">Cargando pacientes...</p>
                                </div>
                            ) : patients.length > 0 ? (
                                <>
                                    <div className="mb-3">
                                        <Badge bg="info" className="me-2">
                                            {patients.length} paciente{patients.length !== 1 ? 's' : ''} registrado{patients.length !== 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <Table responsive hover className="patients-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Teléfono</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {patients.map(patient => (
                                                <tr key={patient.id}>
                                                    <td>
                                                        <strong>{`${patient.firstName} ${patient.lastName}`}</strong>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <i className="bi bi-telephone me-2"></i>
                                                            {patient.phone || 'No especificado'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge bg-${
                                                            patient.status === 'ACTIVE' ? 'success' : 
                                                            patient.status === 'INACTIVE' ? 'danger' : 
                                                            patient.status === 'DISCHARGED' ? 'info' :
                                                            patient.status === 'PENDING' ? 'warning' :
                                                            patient.status === 'REFERRED' ? 'primary' : 'secondary'
                                                        }`}>
                                                            {patient.status === 'ACTIVE' ? 'Activo' : 
                                                             patient.status === 'INACTIVE' ? 'Inactivo' : 
                                                             patient.status === 'DISCHARGED' ? 'Dado de alta' :
                                                             patient.status === 'PENDING' ? 'Pendiente' :
                                                             patient.status === 'REFERRED' ? 'Derivado' : (patient.status || 'Desconocido')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <FaUsers size={48} className="text-muted mb-3" />
                                    <h5 className="text-muted">No tienes pacientes asignados en este momento</h5>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Profile; 