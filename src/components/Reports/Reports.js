import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { 
    Button, 
    Form, 
    Modal, 
    Container, 
    Table, 
    InputGroup, 
    Row, 
    Col, 
    Spinner, 
    Alert,
    Card,
    Badge,
    Pagination
} from "react-bootstrap";
import { FaEye, FaDownload, FaPlus, FaTrash, FaFile, FaFilter } from 'react-icons/fa';
import api from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import FileViewer from '../FileViewer/FileViewer';
import './Reports.css';

const Reports = () => {
    const { isAdmin, currentUser: user } = useContext(AuthContext);
    

    
    // Estados principales
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Estados para filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [patients, setPatients] = useState([]);
    const [specialties, setSpecialties] = useState([]);
    const [doctors, setDoctors] = useState([]);
    
    // Estados para modales
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    
    // Estados para FileViewer
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [selectedFileData, setSelectedFileData] = useState(null);
    const [fileViewerLoading, setFileViewerLoading] = useState(false);
    const [fileViewerError, setFileViewerError] = useState(null);
    
    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrevious, setHasPrevious] = useState(false);
    
    // Estados para formularios
    const [newReport, setNewReport] = useState({
        title: '',
        patientId: '',
        specialtyId: '',
        file: null
    });

    // Estado para evitar que se ejecuten ambos useEffect al mismo tiempo
    const [isFilterChange, setIsFilterChange] = useState(false);

    const fetchReports = useCallback(async (page = 0) => {
        try {
            // Si es la primera carga, usar loading completo, sino solo tabla
            if (loading) {
                setLoading(true);
            } else {
                setTableLoading(true);
            }
            
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('size', pageSize.toString());
            params.append('sortBy', 'date');
            params.append('sortDirection', 'desc');
            
            // Agregar filtros - todos los usuarios pueden usar estos filtros
            if (selectedPatient) params.append('patientId', selectedPatient);
            if (selectedSpecialty) params.append('specialtyId', selectedSpecialty);
            if (selectedDoctor) params.append('doctorId', selectedDoctor);
            if (searchTerm.trim()) params.append('title', searchTerm.trim());
            
            let response;
            if (isAdmin) {
                // Los administradores ven todos los reportes usando el endpoint /all con paginación
                response = await api.get(`/api/reports/all?${params.toString()}`);
            } else {
                // Los usuarios regulares ven solo sus reportes con paginación
                response = await api.get(`/api/reports?${params.toString()}`);
            }
            
            // Manejar la respuesta paginada
            const responseData = response.data;
            if (responseData && Array.isArray(responseData.reports)) {
                setReports(responseData.reports);
                setTotalPages(responseData.totalPages || 0);
                setTotalElements(responseData.totalElements || 0);
                setHasNext(responseData.hasNext || false);
                setHasPrevious(responseData.hasPrevious || false);
                setCurrentPage(responseData.currentPage || 0);
            } else {
                setReports([]);
                setTotalPages(0);
                setTotalElements(0);
                setHasNext(false);
                setHasPrevious(false);
            }
        } catch (err) {
            console.error('Error al cargar reportes:', err);
            setError('Error al cargar los reportes');
            setReports([]);
            setTotalPages(0);
            setTotalElements(0);
            setHasNext(false);
            setHasPrevious(false);
        } finally {
            setLoading(false);
            setTableLoading(false);
        }
    }, [pageSize, selectedPatient, selectedSpecialty, selectedDoctor, searchTerm, isAdmin, loading]);

    // Cargar datos iniciales
    useEffect(() => {
        fetchPatients();
        fetchSpecialties();
        fetchDoctors();
        // Cargar reportes en el primer render
        fetchReports(0);
    }, [fetchReports]);

    // Recargar reportes cuando cambien filtros (con debounce para searchTerm)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setIsFilterChange(true);
            setCurrentPage(0); // Reset a primera página cuando cambien filtros
            fetchReports(0);
            setIsFilterChange(false);
        }, searchTerm ? 500 : 0); // Debounce de 500ms para búsqueda de texto

        return () => clearTimeout(timeoutId);
    }, [selectedPatient, selectedSpecialty, selectedDoctor, searchTerm, isAdmin, fetchReports]); // Agregamos fetchReports como dependencia

    // Cargar reportes cuando cambie la página (pero no si es un cambio de filtro)
    useEffect(() => {
        if (!isFilterChange) {
            fetchReports(currentPage);
        }
    }, [currentPage, fetchReports, isFilterChange]);

    const fetchPatients = async () => {
        try {
            // Usar parámetros para obtener todos los pacientes
            const response = await api.get('/api/patients?page=0&size=1000');
            const patientsData = response.data;
            if (Array.isArray(patientsData)) {
                setPatients(patientsData);
            } else if (patientsData && Array.isArray(patientsData.content)) {
                setPatients(patientsData.content);
            } else if (patientsData && Array.isArray(patientsData.data)) {
                setPatients(patientsData.data);
            } else {
                setPatients([]);
            }
        } catch (err) {
            console.error('Error al cargar pacientes:', err);
            setPatients([]);
        }
    };

    const fetchSpecialties = async () => {
        try {
            const response = await api.get('/api/specialties');
            const specialtiesData = response.data;
            if (Array.isArray(specialtiesData)) {
                setSpecialties(specialtiesData);
            } else if (specialtiesData && Array.isArray(specialtiesData.content)) {
                setSpecialties(specialtiesData.content);
            } else if (specialtiesData && Array.isArray(specialtiesData.data)) {
                setSpecialties(specialtiesData.data);
            } else {
                setSpecialties([]);
            }
        } catch (err) {
            console.error('Error al cargar especialidades:', err);
            setSpecialties([]);
        }
    };

    const fetchDoctors = async () => {
        try {
            // Usar parámetros para obtener todos los doctores
            const response = await api.get('/api/users?page=0&size=1000');
            const doctorsData = response.data;
            if (Array.isArray(doctorsData)) {
                setDoctors(doctorsData);
            } else if (doctorsData && Array.isArray(doctorsData.content)) {
                setDoctors(doctorsData.content);
            } else if (doctorsData && Array.isArray(doctorsData.data)) {
                setDoctors(doctorsData.data);
            } else {
                setDoctors([]);
            }
        } catch (err) {
            console.error('Error al cargar doctores:', err);
            setDoctors([]);
        }
    };



    // Los reportes ya están filtrados por el servidor - usar useMemo para optimización
    const filteredReports = useMemo(() => reports || [], [reports]);

    // Funciones para manejar el archivo
    const handleFilePreview = async (report) => {
        try {
            setFileViewerLoading(true);
            setFileViewerError(null);
            
            // Usar directamente los datos del archivo desde el reporte
            const fileData = report.file;
            
            if (!fileData) {
                setFileViewerError('No se encontró archivo para este reporte');
                return;
            }
            
            // Construir la URL correcta para visualización (sin fl_attachment)
            const viewUrl = fileData.url ? fileData.url.replace('fl_attachment/', '') : null;
            
            // Adaptar la estructura para el FileViewer basado en la respuesta real
            const adaptedFileData = {
                filename: fileData.filename || 'Documento',
                document_type: fileData.filename?.split('.').pop()?.toLowerCase() || 'pdf',
                viewer_type: fileData.filename?.split('.').pop()?.toLowerCase() || 'pdf',
                download_url: fileData.downloadUrl,
                direct_url: viewUrl,
                embed_url: viewUrl,
                url: viewUrl,
                preview_url: viewUrl,
                thumbnail_url: viewUrl,
                page_previews: []
            };
            
            setSelectedFileData(adaptedFileData);
            setShowFileViewer(true);
        } catch (error) {
            console.error('Error al cargar archivo:', error);
            setFileViewerError('Error al cargar el archivo');
        } finally {
            setFileViewerLoading(false);
        }
    };

    const handleFileDownload = async (report) => {
        try {
            const fileData = report.file;
            
            if (!fileData) {
                setError('No se encontró archivo para este reporte');
                return;
            }
            
            if (fileData.downloadUrl) {
                const link = document.createElement('a');
                link.href = fileData.downloadUrl;
                link.download = fileData.filename || 'reporte';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                setError('URL de descarga no disponible');
            }
        } catch (error) {
            console.error('Error al descargar archivo:', error);
            setError('Error al descargar el archivo');
        }
    };

    // Funciones CRUD
    const handleCreateReport = async (e) => {
        e.preventDefault();
        
        if (!newReport.title || !newReport.patientId || !newReport.specialtyId || !newReport.file) {
            setError('Todos los campos son obligatorios');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('title', newReport.title);
            formData.append('patientId', newReport.patientId);
            formData.append('specialtyId', newReport.specialtyId);
            formData.append('file', newReport.file);

            await api.post('/api/reports', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setShowCreateModal(false);
            setNewReport({ title: '', patientId: '', specialtyId: '', file: null });
            fetchReports(0); // Volver a la primera página después de crear
            setCurrentPage(0);
            setError(null);
        } catch (error) {
            console.error('Error al crear reporte:', error);
            setError(error.response?.data?.error || 'Error al crear el reporte');
        }
    };



    const handleDeleteReport = async () => {
        try {
            await api.delete(`/api/reports/${selectedReport.id}`);
            setShowDeleteModal(false);
            setSelectedReport(null);
            fetchReports(currentPage); // Mantener la página actual después de eliminar
            setError(null);
        } catch (error) {
            console.error('Error al eliminar reporte:', error);
            setError(error.response?.data?.error || 'Error al eliminar el reporte');
        }
    };

    const openViewModal = async (reportId) => {
        try {
            const response = await api.get(`/api/reports/${reportId}`);
            setSelectedReport(response.data);
            setShowViewModal(true);
        } catch (error) {
            console.error('Error al cargar reporte:', error);
            setError('Error al cargar el reporte');
        }
    };



    const openDeleteModal = (report) => {
        setSelectedReport(report);
        setShowDeleteModal(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Fecha no disponible';
        
        try {
            const date = new Date(dateString);
            // Verificar si la fecha es válida
            if (isNaN(date.getTime())) {
                return 'Fecha inválida';
            }
            
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error al formatear fecha:', error);
            return 'Error en fecha';
        }
    };

    // Función optimizada para limpiar filtros
    const clearFilters = useCallback(() => {
        setSearchTerm('');
        setSelectedPatient('');
        setSelectedSpecialty('');
        setSelectedDoctor('');
        setCurrentPage(0);
    }, []);

    // Funciones de paginación
    const handlePageChange = useCallback((page) => {
        setCurrentPage(page);
    }, []);

    const handlePreviousPage = useCallback(() => {
        if (hasPrevious) {
            setCurrentPage(currentPage - 1);
        }
    }, [hasPrevious, currentPage]);

    const handleNextPage = useCallback(() => {
        if (hasNext) {
            setCurrentPage(currentPage + 1);
        }
    }, [hasNext, currentPage]);

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <Container className="reports-container">
            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

            {/* Indicador para administradores */}
            {isAdmin && (
                <Alert variant="info" className="mb-3">
                    <strong>Vista de Administrador:</strong> Está viendo todos los informes del sistema de todos los doctores.
                </Alert>
            )}

            {/* Filtros */}
            <Card className="mb-4">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="filter-title mb-0"><FaFilter className="me-2" />Filtros</h5>
                        <div className="d-flex gap-2">
                            <Button 
                                variant="outline-secondary"
                                size="sm"
                                onClick={clearFilters}
                            >
                                Limpiar Filtros
                            </Button>
                            <Button 
                                className="create-button"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <FaPlus className="me-2" />
                                Nuevo Informe
                            </Button>
                        </div>
                    </div>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Buscar por título</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por título del informe..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Paciente</Form.Label>
                                <Form.Select
                                    value={selectedPatient}
                                    onChange={(e) => setSelectedPatient(e.target.value)}
                                >
                                    <option value="">Todos los pacientes</option>
                                    {patients.map(patient => (
                                        <option key={patient.id} value={patient.id}>
                                            {patient.name}
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
                                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                                >
                                    <option value="">Todas las especialidades</option>
                                    {specialties.map(specialty => (
                                        <option key={specialty.id} value={specialty.id}>
                                            {specialty.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Doctor</Form.Label>
                                <Form.Select
                                    value={selectedDoctor}
                                    onChange={(e) => setSelectedDoctor(e.target.value)}
                                >
                                    <option value="">Todos los doctores</option>
                                    {doctors.map(doctor => (
                                        <option key={doctor.id} value={doctor.id}>
                                            {doctor.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Tabla de reportes */}
            <Card className="reports-table-container">
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <span>Informes Médicos</span>
                    <div className="d-flex align-items-center gap-3">
                        <Badge bg="secondary">
                            Página {currentPage + 1} de {totalPages || 1}
                        </Badge>
                        <Badge bg="info">
                            {totalElements} informes en total
                        </Badge>
                    </div>
                </Card.Header>
                <Card.Body style={{position: 'relative', minHeight: '200px'}}>
                    {tableLoading && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 10
                        }}>
                            <Spinner animation="border" variant="primary" />
                        </div>
                    )}
                    <Table responsive hover className="reports-table">
                        <thead>
                            <tr>
                                <th>Título</th>
                                <th>Paciente</th>
                                <th>Especialidad</th>
                                <th>Doctor</th>
                                <th>Fecha</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.length > 0 ? (
                                filteredReports.map(report => (
                                    <tr key={report.id}>
                                        <td>
                                            <strong className="report-title">{report.title}</strong>
                                        </td>
                                        <td>{report.patient?.name || 'N/A'}</td>
                                        <td>
                                            <Badge bg="info" className="specialty-badge">
                                                {report.specialty?.name || 'N/A'}
                                            </Badge>
                                        </td>
                                        <td>{report.doctor?.name || 'N/A'}</td>
                                        <td className="date-text">{formatDate(report.date)}</td>
                                        <td>
                                            <div className="report-actions">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => openViewModal(report.id)}
                                                    title="Ver detalles"
                                                >
                                                    <FaEye />
                                                </Button>
                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    onClick={() => handleFilePreview(report)}
                                                    title="Ver archivo"
                                                >
                                                    <FaFile />
                                                </Button>
                                                <Button
                                                    variant="outline-success"
                                                    size="sm"
                                                    onClick={() => handleFileDownload(report)}
                                                    title="Descargar archivo"
                                                >
                                                    <FaDownload />
                                                </Button>
                                                {(() => {
                                                    // Verificar si el usuario puede eliminar este reporte
                                                    const canDelete = isAdmin || (
                                                        report.doctor?.id && 
                                                        user?.id && 
                                                        Number(report.doctor.id) === Number(user.id)
                                                    );
                                                    

                                                    
                                                    return canDelete ? (
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => openDeleteModal(report)}
                                                            title="Eliminar"
                                                        >
                                                            <FaTrash />
                                                        </Button>
                                                    ) : null;
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center text-muted">
                                        No se encontraron informes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
                
                {/* Controles de paginación */}
                {totalPages > 1 && (
                    <Card.Footer>
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                                <span className="text-muted me-3">
                                    Mostrando {reports.length} de {totalElements} informes
                                </span>
                            </div>
                            <Pagination className="mb-0">
                                <Pagination.First 
                                    onClick={() => handlePageChange(0)}
                                    disabled={!hasPrevious}
                                />
                                <Pagination.Prev 
                                    onClick={handlePreviousPage}
                                    disabled={!hasPrevious}
                                />
                                
                                {/* Mostrar páginas alrededor de la actual */}
                                {[...Array(totalPages)].map((_, index) => {
                                    // Mostrar solo páginas cercanas a la actual
                                    if (
                                        index === 0 || // Primera página
                                        index === totalPages - 1 || // Última página
                                        Math.abs(index - currentPage) <= 2 // Páginas cercanas
                                    ) {
                                        return (
                                            <Pagination.Item
                                                key={index}
                                                active={index === currentPage}
                                                onClick={() => handlePageChange(index)}
                                            >
                                                {index + 1}
                                            </Pagination.Item>
                                        );
                                    } else if (
                                        index === currentPage - 3 || 
                                        index === currentPage + 3
                                    ) {
                                        return <Pagination.Ellipsis key={index} disabled />;
                                    }
                                    return null;
                                })}
                                
                                <Pagination.Next 
                                    onClick={handleNextPage}
                                    disabled={!hasNext}
                                />
                                <Pagination.Last 
                                    onClick={() => handlePageChange(totalPages - 1)}
                                    disabled={!hasNext}
                                />
                            </Pagination>
                        </div>
                    </Card.Footer>
                )}
            </Card>

            {/* Modal Crear Reporte */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Nuevo Informe</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateReport}>
                    <Modal.Body>
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Título *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={newReport.title}
                                        onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Paciente *</Form.Label>
                                    <Form.Select
                                        value={newReport.patientId}
                                        onChange={(e) => setNewReport({...newReport, patientId: e.target.value})}
                                        required
                                    >
                                        <option value="">Seleccionar paciente</option>
                                        {patients.map(patient => (
                                            <option key={patient.id} value={patient.id}>
                                                {patient.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Especialidad *</Form.Label>
                                    <Form.Select
                                        value={newReport.specialtyId}
                                        onChange={(e) => setNewReport({...newReport, specialtyId: e.target.value})}
                                        required
                                    >
                                        <option value="">Seleccionar especialidad</option>
                                        {specialties.map(specialty => (
                                            <option key={specialty.id} value={specialty.id}>
                                                {specialty.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Archivo *</Form.Label>
                                    <Form.Control
                                        type="file"
                                        onChange={(e) => setNewReport({...newReport, file: e.target.files[0]})}
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        Formatos permitidos: PDF, DOC, DOCX, JPG, PNG. Máximo 25MB.
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit">
                            Crear Informe
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>



            {/* Modal Ver Reporte */}
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Detalles del Informe</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedReport && (
                        <Row>
                            <Col md={12} className="mb-3">
                                <h4 className="text-primary">{selectedReport.title}</h4>
                            </Col>
                            <Col md={6}>
                                <p><strong>Paciente:</strong> {selectedReport.patient?.name || 'N/A'}</p>
                                <p><strong>Especialidad:</strong> {selectedReport.specialty?.name || 'N/A'}</p>
                            </Col>
                            <Col md={6}>
                                <p><strong>Doctor:</strong> {selectedReport.doctor?.name || 'N/A'}</p>
                                <p><strong>Fecha de creación:</strong> {formatDate(selectedReport.date)}</p>
                            </Col>
                            <Col md={12} className="mt-3">
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="primary"
                                        onClick={() => handleFilePreview(selectedReport)}
                                    >
                                        <FaEye className="me-2" />
                                        Ver Archivo
                                    </Button>
                                    <Button
                                        variant="outline-primary"
                                        onClick={() => handleFileDownload(selectedReport)}
                                    >
                                        <FaDownload className="me-2" />
                                        Descargar
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                    )}
                </Modal.Body>
            </Modal>

            {/* Modal Eliminar Reporte */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Eliminación</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>¿Está seguro que desea eliminar el informe "{selectedReport?.title}"?</p>
                    <Alert variant="warning">
                        <strong>Advertencia:</strong> Esta acción no se puede deshacer. El archivo asociado también será eliminado.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={handleDeleteReport}>
                        Eliminar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* FileViewer para mostrar archivos */}
            <FileViewer
                show={showFileViewer}
                onHide={() => setShowFileViewer(false)}
                fileData={selectedFileData}
                isLoading={fileViewerLoading}
                error={fileViewerError}
            />
        </Container>
    );
};

export default Reports; 