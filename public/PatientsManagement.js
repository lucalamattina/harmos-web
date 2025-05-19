import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Container, Table } from "react-bootstrap";
import api from '../../api/api';

const Patients = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [newPatient, setNewPatient] = useState({
        firstName: "",
        lastName: "",
        dni: "",
        email: "",
        phoneNumber: ""
    });

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const response = await api.get('/api/patients');
            setPatients(response.data.content || []);
            setLoading(false);
        } catch (err) {
            setError('Error al cargar los pacientes');
            setLoading(false);
        }
    };

    const handleCloseNew = () => setShowNew(false);

    const handleSave = async () => {
        if (newPatient.firstName && newPatient.lastName && newPatient.dni) {
            try {
                await api.post('/api/patients', newPatient);
                await fetchPatients();
                setShowNew(false);
                setNewPatient({
                    firstName: "",
                    lastName: "",
                    dni: "",
                    email: "",
                    phoneNumber: ""
                });
            } catch (err) {
                setError('Error al guardar el paciente');
            }
        }
    };

    if (loading) return <div>Cargando pacientes...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <Container>
            <div className="border-bottom border-2 border-dark mb-4">
                <h1>Pacientes</h1>
            </div>

            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>DNI</th>
                        <th>Nombre</th>
                        <th>Apellido</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {patients.map(patient => (
                        <tr key={patient.id}>
                            <td>{patient.dni}</td>
                            <td>{patient.firstName}</td>
                            <td>{patient.lastName}</td>
                            <td>{patient.email}</td>
                            <td>{patient.phoneNumber}</td>
                            <td>
                                <Button variant="info" size="sm" className="me-2">
                                    Editar
                                </Button>
                                <Button variant="danger" size="sm">
                                    Eliminar
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <div className="d-grid gap-2 mt-4">
                <Button variant="primary" size="lg" onClick={() => setShowNew(true)}>
                    Nuevo Paciente
                </Button>
            </div>

            <Modal show={showNew} onHide={handleCloseNew}>
                <Modal.Header closeButton>
                    <Modal.Title>Crear Paciente</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>DNI</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="DNI"
                                value={newPatient.dni}
                                onChange={e => setNewPatient(prev => ({
                                    ...prev,
                                    dni: e.target.value
                                }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nombre"
                                value={newPatient.firstName}
                                onChange={e => setNewPatient(prev => ({
                                    ...prev,
                                    firstName: e.target.value
                                }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Apellido</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Apellido"
                                value={newPatient.lastName}
                                onChange={e => setNewPatient(prev => ({
                                    ...prev,
                                    lastName: e.target.value
                                }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="Email"
                                value={newPatient.email}
                                onChange={e => setNewPatient(prev => ({
                                    ...prev,
                                    email: e.target.value
                                }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Teléfono</Form.Label>
                            <Form.Control
                                type="tel"
                                placeholder="Teléfono"
                                value={newPatient.phoneNumber}
                                onChange={e => setNewPatient(prev => ({
                                    ...prev,
                                    phoneNumber: e.target.value
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

export default Patients;