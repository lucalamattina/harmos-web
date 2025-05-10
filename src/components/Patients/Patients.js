import React, { useState, useEffect } from 'react';
import { Button, Form, Modal, Container, Table, InputGroup } from "react-bootstrap";
import api from '../../api/api';

const Patients = () => {
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [newPatient, setNewPatient] = useState({
        name: "",
        phone: "",
        status: "unknown"
    });

    useEffect(() => {
        fetchPatients();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredPatients(patients);
        } else {
            const filtered = patients.filter(patient => 
                patient.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredPatients(filtered);
        }
    }, [searchTerm, patients]);

    const fetchPatients = async () => {
        try {
            const response = await api.get('/api/patients');
            const patientsData = response.data.content || [];
            setPatients(patientsData);
            setFilteredPatients(patientsData);
            setLoading(false);
        } catch (err) {
            console.error('Error detallado:', err);
            setError('Error al cargar los pacientes');
            setLoading(false);
        }
    };

    const handleCloseNew = () => setShowNew(false);

    const handleSave = async () => {
        if (newPatient.name && newPatient.phone) {
            try {
                await api.post('/api/patients', newPatient);
                await fetchPatients();
                setShowNew(false);
                setNewPatient({
                    name: "",
                    phone: "",
                    status: "unknown"
                });
            } catch (err) {
                console.error('Error al guardar:', err);
                setError('Error al guardar el paciente');
            }
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    if (loading) return <div>Cargando pacientes...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <Container>
            <Form className="mb-4">
                <InputGroup>
                    <InputGroup.Text>
                        <i className="bi bi-search"></i>
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Buscar paciente por nombre..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </InputGroup>
            </Form>

            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Teléfono</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPatients.length > 0 ? (
                        filteredPatients.map(patient => (
                            <tr key={patient.id}>
                                <td>{patient.id}</td>
                                <td>{patient.name}</td>
                                <td>{patient.phone}</td>
                                <td>{patient.status}</td>
                                <td>
                                    <Button variant="info" size="sm" className="me-2">
                                        Editar
                                    </Button>
                                    <Button variant="danger" size="sm">
                                        Eliminar
                                    </Button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" className="text-center">
                                No se encontraron pacientes con ese nombre
                            </td>
                        </tr>
                    )}
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
                            <Form.Label>Nombre</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nombre completo"
                                value={newPatient.name}
                                onChange={e => setNewPatient(prev => ({
                                    ...prev,
                                    name: e.target.value
                                }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Teléfono</Form.Label>
                            <Form.Control
                                type="tel"
                                placeholder="Teléfono"
                                value={newPatient.phone}
                                onChange={e => setNewPatient(prev => ({
                                    ...prev,
                                    phone: e.target.value
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