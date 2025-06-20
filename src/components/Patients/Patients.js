import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Button, Form, Modal, Container, Table, InputGroup, Row, Col, Spinner, Card, Badge } from "react-bootstrap";
import api from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import './Patients.css';

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
    const [allDoctors, setAllDoctors] = useState([]); // Para el filtro dropdown
    const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
    const [doctorSpecialty, setDoctorSpecialty] = useState('');
    const [specialties, setSpecialties] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(''); // Cambio de doctorFilterTerm a selectedDoctor
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

    // Función para cargar todos los doctores para el filtro dropdown
    const fetchAllDoctors = useCallback(async () => {
        try {
            const response = await api.get('/api/users?page=0&size=1000'); // Cargar muchos doctores
            const doctorsData = response.data.content || response.data || [];
            setAllDoctors(doctorsData);
        } catch (err) {
            setAllDoctors([]);
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
            if (selectedDoctor) {
                params.append('doctorId', selectedDoctor); // Cambio a doctorId para ser más específico
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
    }, [currentPage, pageSize, searchTerm, selectedDoctor, selectedStatus, selectedSpecialty]);

    useEffect(() => {
        fetchPatients();
        fetchStatuses();
        fetchSpecialties();
        fetchAllDoctors(); // Cargar todos los doctores para el filtro
    }, [fetchPatients, fetchStatuses, fetchSpecialties, fetchAllDoctors]);

    const handleDoctorFilterChange = (e) => {
        setSelectedDoctor(e.target.value);
    };

    const handleStatusFilterChange = (e) => {
        setSelectedStatus(e.target.value);
    };

    const handleSpecialtyChange = (e) => {
        setSelectedSpecialty(e.target.value);
    };

    const fetchDoctors = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            params.append('page', '0');
            params.append('size', '1000'); // Cargar muchos doctores
            
            if (doctorSearchTerm) {
                params.append('name', doctorSearchTerm);
            }
            if (doctorSpecialty) {
                params.append('specialties', doctorSpecialty);
            }

            const response = await api.get(`/api/users?${params.toString()}`);
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
        <Container className="patients-container">
            {/* Filtros */}
            <Card className="mb-4">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="filter-title mb-0"><i className="bi bi-funnel me-2"></i>Filtros</h5>
                        <div className="d-flex gap-2">
                            <Button 
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedDoctor('');
                                    setSelectedSpecialty('');
                                    setSelectedStatus('');
                                    setCurrentPage(0);
                                }}
                            >
                                Limpiar Filtros
                            </Button>
                            {isAdmin && (
                                <Button 
                                    className="create-button"
                                    onClick={() => setShowNew(true)}
                                >
                                    <i className="bi bi-plus me-2"></i>
                                    Nuevo Paciente
                                </Button>
                            )}
                        </div>
                    </div>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Buscar por nombre</Form.Label>
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
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Doctor</Form.Label>
                                <Form.Select
                                    value={selectedDoctor}
                                    onChange={handleDoctorFilterChange}
                                >
                                    <option value="">Todos los doctores</option>
                                    {allDoctors.map(doctor => (
                                        <option key={doctor.id} value={doctor.id}>
                                            {doctor.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Especialidad</Form.Label>
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
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Estado</Form.Label>
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
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Tabla de pacientes */}
            <Card className="patients-table-container">
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <span>Pacientes</span>
                    <div className="d-flex align-items-center gap-3">
                        <Badge bg="secondary">
                            Página {currentPage + 1} de {totalPages || 1}
                        </Badge>
                        <Badge bg="info">
                            {filteredPatients.length} pacientes en total
                        </Badge>
                    </div>
                </Card.Header>
                <Card.Body style={{position: 'relative', minHeight: '200px'}}>
                    <Table responsive hover className="patients-table">
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
                </Card.Body>
            </Card>

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