import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Button, Form, Modal, Container, Table, InputGroup, Row, Col, Spinner } from "react-bootstrap";
import api from '../../api/api';
import { AuthContext } from '../../context/AuthContext';

const Patients = () => {
    const { isAdmin } = useContext(AuthContext);
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
    const [doctorSpecialty, setDoctorSpecialty] = useState('');
    const [specialties, setSpecialties] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('');
    const [doctorFilterTerm, setDoctorFilterTerm] = useState('');
    const [statuses, setStatuses] = useState([]);
    const [newPatient, setNewPatient] = useState({
        name: "",
        phone: "",
        status: "unknown",
        doctors: [],
        doctorSpecialties: []
    });
    const [showAddDoctor, setShowAddDoctor] = useState(false);
    const [selectedDoctors, setSelectedDoctors] = useState([]);
    
    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    // Estado para el modal de confirmación
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [onConfirm, setOnConfirm] = useState(() => () => {});

    const fetchStatuses = useCallback(async () => {
        try {
            const response = await api.get('/api/patients/statuses');
            if (Array.isArray(response.data)) {
                setStatuses(response.data);
            } else {
                setStatuses([]);
            }
        } catch (err) {
            setStatuses([]);
        }
    }, []);

    const fetchSpecialties = useCallback(async () => {
        try {
            const response = await api.get('/api/specialties');
            setSpecialties(response.data || []);
        } catch (err) {
            setSpecialties([]);
        }
    }, []);

    const fetchPatients = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.append('page', currentPage);
            params.append('size', pageSize);
            
            if (searchTerm) {
                params.append('name', searchTerm);
            }
            if (doctorFilterTerm) {
                params.append('doctor', doctorFilterTerm);
            }
            if (selectedStatus) {
                params.append('status', selectedStatus);
            }
            if (selectedSpecialty) {
                params.append('specialty', selectedSpecialty);
            }

            const response = await api.get(`/api/patients?${params.toString()}`);
            const patientsData = response.data.content || [];
            setPatients(patientsData);
            setFilteredPatients(patientsData);
            setTotalPages(response.data.totalPages);
            setLoading(false);
        } catch (err) {
            setError('Error al cargar los pacientes');
            setLoading(false);
        }
    }, [currentPage, pageSize, searchTerm, doctorFilterTerm, selectedStatus, selectedSpecialty]);

    useEffect(() => {
        fetchPatients();
        fetchStatuses();
        fetchSpecialties();
    }, [fetchPatients, fetchStatuses, fetchSpecialties]);

    const handleDoctorFilterChange = (e) => {
        setDoctorFilterTerm(e.target.value);
    };

    const handleStatusFilterChange = (e) => {
        setSelectedStatus(e.target.value);
    };

    const handleSpecialtyChange = (e) => {
        setSelectedSpecialty(e.target.value);
    };

    const fetchDoctors = useCallback(async () => {
        try {
            let url = '/api/users';
            const params = new URLSearchParams();
            
            if (doctorSearchTerm) {
                params.append('name', doctorSearchTerm);
            }
            if (doctorSpecialty) {
                params.append('specialties', doctorSpecialty);
            }

            const queryString = params.toString();
            if (queryString) {
                url += `?${queryString}`;
            }

            const response = await api.get(url);
            const allDoctors = response.data.content || response.data || [];
            setDoctors(allDoctors);
        } catch (err) {
            setDoctors([]);
        }
    }, [doctorSearchTerm, doctorSpecialty]);

    // Cargar doctores y especialidades cuando se abre el modal
    useEffect(() => {
        if (showNew || showDetails) {
            // Cargar especialidades
            api.get('/api/specialties')
                .then(res => setSpecialties(res.data))
                .catch(() => setSpecialties([]));

            // Cargar doctores iniciales
            fetchDoctors();
        }
    }, [showNew, showDetails, fetchDoctors]);

    // Actualizar doctores cuando cambie el término de búsqueda o la especialidad
    useEffect(() => {
        if (showNew || showDetails) {
            fetchDoctors();
        }
    }, [fetchDoctors, showNew, showDetails]);

    // Función de búsqueda con debounce
    const debouncedSearch = useCallback(
        (term) => {
            if (term.trim() === '') {
                setFilteredPatients(patients);
            } else {
                const filtered = patients.filter(patient => 
                    patient.name.toLowerCase().includes(term.toLowerCase())
                );
                setFilteredPatients(filtered);
            }
        },
        [patients]
    );

    // Actualizar el useEffect para usar el debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            debouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, debouncedSearch]);

    const handleCloseNew = () => {
        setShowNew(false);
        setDoctorSearchTerm('');
        setDoctorSpecialty('');
    };

    const handleSave = async () => {
        if (newPatient.name && newPatient.phone) {
            try {
                await api.post('/api/patients', newPatient);
                await fetchPatients();
                setShowNew(false);
                setNewPatient({
                    name: "",
                    phone: "",
                    status: "unknown",
                    doctors: [],
                    doctorSpecialties: []
                });
            } catch (err) {
                setError('Error al guardar el paciente');
            }
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const fetchPatientDetails = async (patientId) => {
        try {
            const response = await api.get(`/api/patients/${patientId}`);
            setSelectedPatient(response.data);
            setShowDetails(true);
        } catch (err) {
            setError('Error al cargar los detalles del paciente');
        }
    };

    const handleAddDoctors = async () => {
        if (selectedDoctors.length > 0 && selectedPatient) {
            try {
                const promises = selectedDoctors.map(doctorId => 
                    api.post(`/api/patients/${selectedPatient.id}/doctors/${doctorId}`)
                );
                
                await Promise.all(promises);
                await fetchPatients();
                
                const updatedPatientResponse = await api.get(`/api/patients/${selectedPatient.id}`);
                setSelectedPatient(updatedPatientResponse.data);
                
                setShowAddDoctor(false);
                setSelectedDoctors([]);
            } catch (err) {
                setError('Error al agregar doctores al paciente');
            }
        }
    };

    // Función para mostrar el modal de confirmación
    const showConfirmation = (message, onConfirmAction) => {
        setConfirmMessage(message);
        setOnConfirm(() => onConfirmAction);
        setShowConfirmModal(true);
    };

    // Eliminar paciente
    const handleDeletePatient = (patient) => {
        showConfirmation('¿Estás seguro de que deseas eliminar este paciente?', async () => {
            try {
                await api.delete(`/api/patients/${patient.id}`);
                await fetchPatients();
            } catch (err) {
                setError('Error al eliminar el paciente');
            }
        });
    };

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
        <Container>
            <Form className="mb-4">
                <Row>
                    <Col md={3}>
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
                    </Col>
                    <Col md={3}>
                        <InputGroup>
                            <InputGroup.Text>
                                <i className="bi bi-search"></i>
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Buscar por doctor..."
                                value={doctorFilterTerm}
                                onChange={handleDoctorFilterChange}
                            />
                        </InputGroup>
                    </Col>
                    <Col md={3}>
                        <Form.Select
                            value={selectedSpecialty}
                            onChange={handleSpecialtyChange}
                        >
                            <option value="">Todas las especialidades</option>
                            {specialties.map(specialty => (
                                <option key={specialty.id} value={specialty.name}>
                                    {specialty.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                    <Col md={3}>
                        <Form.Select
                            value={selectedStatus}
                            onChange={handleStatusFilterChange}
                        >
                            <option value="">Todos los estados</option>
                            {statuses.map(status => (
                                <option key={status} value={status}>
                                    {status === 'ACTIVE' ? 'Activo' : 
                                     status === 'INACTIVE' ? 'Inactivo' : 
                                     status === 'DISCHARGED' ? 'Dado de alta' :
                                     status === 'PENDING' ? 'Pendiente' :
                                     status === 'REFERRED' ? 'Derivado' : status}
                                </option>
                            ))}
                        </Form.Select>
                    </Col>
                </Row>
            </Form>

            <Table striped bordered hover>
                <thead>
                    <tr>
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
                                <td>{patient.name}</td>
                                <td>
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-telephone me-2"></i>
                                        {patient.phone}
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
                                         patient.status === 'REFERRED' ? 'Derivado' : patient.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="d-flex gap-2">
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={() => fetchPatientDetails(patient.id)}
                                        >
                                            <i className="bi bi-eye me-1"></i>
                                            Ver
                                        </Button>
                                        {isAdmin && (
                                            <Button 
                                                variant="outline-danger" 
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePatient(patient);
                                                }}
                                            >
                                                <i className="bi bi-trash me-1"></i>
                                                Eliminar
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" className="text-center">
                                No se encontraron pacientes con ese nombre
                            </td>
                        </tr>
                    )}
                </tbody>
            </Table>

            {/* Controles de paginación */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-center align-items-center my-4 gap-2">
                    <Button 
                        variant="outline-secondary" 
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                    >
                        Anterior
                    </Button>
                    
                    {/* Primera página */}
                    <Button
                        variant={currentPage === 0 ? 'primary' : 'outline-primary'}
                        onClick={() => setCurrentPage(0)}
                    >
                        1
                    </Button>

                    {/* Puntos suspensivos iniciales si es necesario */}
                    {currentPage > 2 && (
                        <span className="mx-2">...</span>
                    )}

                    {/* Páginas alrededor de la actual */}
                    {Array.from({ length: totalPages }, (_, i) => {
                        if (i === 0 || i === totalPages - 1) return null; // Excluir primera y última página
                        if (Math.abs(currentPage - i) <= 1) { // Mostrar solo páginas adyacentes
                            return (
                                <Button
                                    key={i}
                                    variant={currentPage === i ? 'primary' : 'outline-primary'}
                                    onClick={() => setCurrentPage(i)}
                                >
                                    {i + 1}
                                </Button>
                            );
                        }
                        return null;
                    })}

                    {/* Puntos suspensivos finales si es necesario */}
                    {currentPage < totalPages - 3 && (
                        <span className="mx-2">...</span>
                    )}

                    {/* Última página */}
                    {totalPages > 1 && (
                        <Button
                            variant={currentPage === totalPages - 1 ? 'primary' : 'outline-primary'}
                            onClick={() => setCurrentPage(totalPages - 1)}
                        >
                            {totalPages}
                        </Button>
                    )}

                    <Button 
                        variant="outline-secondary" 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                        disabled={currentPage === totalPages - 1}
                    >
                        Siguiente
                    </Button>
                </div>
            )}

            {isAdmin && (
                <div className="d-grid gap-2 mt-4">
                    <Button variant="primary" size="lg" onClick={() => setShowNew(true)}>
                        Nuevo Paciente
                    </Button>
                </div>
            )}

            {/* Modal de Detalles del Paciente */}
            <Modal show={showDetails} onHide={() => setShowDetails(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Detalles del Paciente</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPatient && (
                        <div className="patient-details">
                            <div className="mb-4">
                                <h4 className="text-primary mb-3">{selectedPatient.name}</h4>
                                <div className="d-flex align-items-center mb-2">
                                    <i className="bi bi-telephone me-2"></i>
                                    <span>{selectedPatient.phone}</span>
                                </div>
                                <div className="d-flex align-items-center mb-2">
                                    <i className="bi bi-info-circle me-2"></i>
                                    <span>Estado: {selectedPatient.status}</span>
                                </div>
                            </div>

                            <div className="doctors-section">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Doctores Asignados</h5>
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm"
                                        onClick={() => {
                                            setShowAddDoctor(true);
                                            fetchDoctors(); // Asegurarnos de cargar los doctores al abrir el modal
                                        }}
                                    >
                                        <i className="bi bi-plus-circle me-1"></i>
                                        Agregar Doctor
                                    </Button>
                                </div>
                                {selectedPatient.doctors && selectedPatient.doctors.length > 0 ? (
                                    <div className="doctors-list">
                                        {selectedPatient.doctors.map((doctor, index) => (
                                            <div key={index} className="doctor-item p-2 mb-2 border rounded">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span>{doctor.name}</span>
                                                    <div>
                                                        {doctor.specialties && doctor.specialties.length > 0 && (
                                                            doctor.specialties.map((specialty, specIndex) => (
                                                                <span key={specIndex} className="badge bg-info me-1">
                                                                    {specialty}
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-muted">
                                        No hay doctores asignados
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetails(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal para Agregar Doctores */}
            <Modal show={showAddDoctor} onHide={() => setShowAddDoctor(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Agregar Doctores</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row className="mb-2">
                            <Col md={6}>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar doctor por nombre..."
                                        value={doctorSearchTerm}
                                        onChange={e => setDoctorSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col md={6}>
                                <Form.Select
                                    value={doctorSpecialty}
                                    onChange={e => setDoctorSpecialty(e.target.value)}
                                >
                                    <option value="">Todas las especialidades</option>
                                    {specialties.map(specialty => (
                                        <option key={specialty.id} value={specialty.name}>
                                            {specialty.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Col>
                        </Row>
                        <div className="doctors-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <Table striped bordered hover size="sm">
                                <thead>
                                    <tr>
                                        <th>Seleccionar</th>
                                        <th>Nombre</th>
                                        <th>Especialidades</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doctors.map(doctor => (
                                        <tr key={doctor.id} 
                                            className={selectedDoctors.includes(doctor.id) ? 'table-primary' : ''}
                                            onClick={() => {
                                                if (selectedDoctors.includes(doctor.id)) {
                                                    setSelectedDoctors(prev => prev.filter(id => id !== doctor.id));
                                                } else {
                                                    setSelectedDoctors(prev => [...prev, doctor.id]);
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={selectedDoctors.includes(doctor.id)}
                                                    onChange={() => {}}
                                                />
                                            </td>
                                            <td>{doctor.name}</td>
                                            <td>{doctor.specialties?.join(', ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddDoctor(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleAddDoctors}>
                        Agregar Doctores Seleccionados
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showNew} onHide={handleCloseNew} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Crear Paciente</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row className="mb-4">
                            <Col md={6}>
                                <Form.Group>
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
                            </Col>
                            <Col md={6}>
                                <Form.Group>
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
                            </Col>
                        </Row>

                        <Form.Group>
                            <Form.Label>Seleccionar Doctor</Form.Label>
                            <Row className="mb-2">
                                <Col md={6}>
                                    <InputGroup>
                                        <InputGroup.Text>
                                            <i className="bi bi-search"></i>
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            placeholder="Buscar doctor por nombre..."
                                            value={doctorSearchTerm}
                                            onChange={e => setDoctorSearchTerm(e.target.value)}
                                        />
                                    </InputGroup>
                                </Col>
                                <Col md={6}>
                                    <Form.Select
                                        value={doctorSpecialty}
                                        onChange={e => setDoctorSpecialty(e.target.value)}
                                    >
                                        <option value="">Todas las especialidades</option>
                                        {specialties.map(specialty => (
                                            <option key={specialty.id} value={specialty.name}>
                                                {specialty.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Col>
                            </Row>
                            <div className="doctors-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <Table striped bordered hover size="sm">
                                    <thead>
                                        <tr>
                                            <th>Seleccionar</th>
                                            <th>Nombre</th>
                                            <th>Especialidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {doctors.map(doctor => (
                                            <tr key={doctor.id} 
                                                className={newPatient.doctors.includes(doctor.id) ? 'table-primary' : ''}
                                                onClick={() => {
                                                    if (newPatient.doctors.includes(doctor.id)) {
                                                        setNewPatient(prev => ({
                                                            ...prev,
                                                            doctors: prev.doctors.filter((id) => id !== doctor.id)
                                                        }));
                                                    } else {
                                                        setNewPatient(prev => ({
                                                            ...prev,
                                                            doctors: [...prev.doctors, doctor.id]
                                                        }));
                                                    }
                                                }}
                                            >
                                                <td>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={newPatient.doctors.includes(doctor.id)}
                                                        onChange={() => {}}
                                                    />
                                                </td>
                                                <td>{doctor.name}</td>
                                                <td>{doctor.specialties?.join(', ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
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

            {/* Modal de confirmación */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar acción</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>{confirmMessage}</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={async () => {
                        setShowConfirmModal(false);
                        await onConfirm();
                    }}>
                        Confirmar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default Patients;