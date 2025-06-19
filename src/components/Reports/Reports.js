import React, { useState, useEffect, useContext } from 'react';
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
    Badge
} from "react-bootstrap";
import { FaEye, FaDownload, FaPlus, FaEdit, FaTrash, FaFile, FaFilter } from 'react-icons/fa';
import api from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import FileViewer from '../FileViewer/FileViewer';
import './Reports.css';

const Reports = () => {
    const { isAdmin, user } = useContext(AuthContext);
    
    // Estados principales
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estados para filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('');
    const [patients, setPatients] = useState([]);
    const [specialties, setSpecialties] = useState([]);
    
    // Estados para modales
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    
    // Estados para FileViewer
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [selectedFileData, setSelectedFileData] = useState(null);
    const [fileViewerLoading, setFileViewerLoading] = useState(false);
    const [fileViewerError, setFileViewerError] = useState(null);
    
    // Estados para formularios
    const [newReport, setNewReport] = useState({
        title: '',
        patientId: '',
        specialtyId: '',
        file: null
    });
    const [editReport, setEditReport] = useState({
        title: '',
        patientId: '',
        specialtyId: ''
    });

    // Cargar datos iniciales
    useEffect(() => {
        fetchReports();
        fetchPatients();
        fetchSpecialties();
    }, [selectedPatient, selectedSpecialty]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedPatient) params.append('patientId', selectedPatient);
            if (selectedSpecialty) params.append('specialtyId', selectedSpecialty);
            
            const response = await api.get(`/api/reports?${params.toString()}`);
            setReports(response.data || []);
        } catch (err) {
            console.error('Error al cargar reportes:', err);
            setError('Error al cargar los reportes');
        } finally {
            setLoading(false);
        }
    };

    const fetchPatients = async () => {
        try {
            const response = await api.get('/api/patients');
            setPatients(response.data.content || response.data || []);
        } catch (err) {
            console.error('Error al cargar pacientes:', err);
        }
    };

    const fetchSpecialties = async () => {
        try {
            const response = await api.get('/api/specialties');
            setSpecialties(response.data || []);
        } catch (err) {
            console.error('Error al cargar especialidades:', err);
        }
    };

    // Filtrar reportes por término de búsqueda
    const filteredReports = reports.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.patient?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.specialty?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Funciones para manejar el archivo
    const handleFilePreview = async (reportId) => {
        try {
            setFileViewerLoading(true);
            setFileViewerError(null);
            
            const response = await api.get(`/api/reports/${reportId}/file`);
            const fileData = response.data;
            
            // Adaptar la estructura para el FileViewer
            const adaptedFileData = {
                filename: fileData.filename || 'Documento',
                document_type: fileData.document_type || 'pdf',
                viewer_type: fileData.document_type || 'pdf',
                download_url: fileData.download_url,
                direct_url: fileData.direct_url,
                embed_url: fileData.url,
                url: fileData.url,
                preview_url: fileData.preview_url,
                thumbnail_url: fileData.thumbnail_url,
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

    const handleFileDownload = async (reportId) => {
        try {
            const response = await api.get(`/api/reports/${reportId}/file`);
            const fileData = response.data;
            
            if (fileData.download_url) {
                const link = document.createElement('a');
                link.href = fileData.download_url;
                link.download = fileData.filename || 'reporte';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
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
            fetchReports();
            setError(null);
        } catch (error) {
            console.error('Error al crear reporte:', error);
            setError(error.response?.data?.error || 'Error al crear el reporte');
        }
    };

    const handleEditReport = async (e) => {
        e.preventDefault();
        
        if (!editReport.title) {
            setError('El título es obligatorio');
            return;
        }

        try {
            await api.put(`/api/reports/${selectedReport.id}`, {
                title: editReport.title,
                patientId: editReport.patientId,
                specialtyId: editReport.specialtyId
            });

            setShowEditModal(false);
            setSelectedReport(null);
            fetchReports();
            setError(null);
        } catch (error) {
            console.error('Error al editar reporte:', error);
            setError(error.response?.data?.error || 'Error al editar el reporte');
        }
    };

    const handleDeleteReport = async () => {
        try {
            await api.delete(`/api/reports/${selectedReport.id}`);
            setShowDeleteModal(false);
            setSelectedReport(null);
            fetchReports();
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

    const openEditModal = (report) => {
        setSelectedReport(report);
        setEditReport({
            title: report.title,
            patientId: report.patient?.id || '',
            specialtyId: report.specialty?.id || ''
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (report) => {
        setSelectedReport(report);
        setShowDeleteModal(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

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

            {/* Filtros */}
            <Card className="mb-4">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="filter-title mb-0"><FaFilter className="me-2" />Filtros</h5>
                        <Button 
                            className="create-button"
                            onClick={() => setShowCreateModal(true)}
                            disabled={!isAdmin}
                        >
                            <FaPlus className="me-2" />
                            Nuevo Informe
                        </Button>
                    </div>
                    <Row>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Buscar</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por título, paciente..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
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
                        <Col md={4}>
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
                    </Row>
                </Card.Body>
            </Card>

            {/* Tabla de reportes */}
            <Card className="reports-table-container">
                <Card.Body>
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
                                        <td className="date-text">{formatDate(report.createdAt)}</td>
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
                                                    onClick={() => handleFilePreview(report.id)}
                                                    title="Ver archivo"
                                                >
                                                    <FaFile />
                                                </Button>
                                                <Button
                                                    variant="outline-success"
                                                    size="sm"
                                                    onClick={() => handleFileDownload(report.id)}
                                                    title="Descargar archivo"
                                                >
                                                    <FaDownload />
                                                </Button>
                                                {(isAdmin || report.doctor?.id === user?.id) && (
                                                    <>
                                                        <Button
                                                            variant="outline-warning"
                                                            size="sm"
                                                            onClick={() => openEditModal(report)}
                                                            title="Editar"
                                                        >
                                                            <FaEdit />
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => openDeleteModal(report)}
                                                            title="Eliminar"
                                                        >
                                                            <FaTrash />
                                                        </Button>
                                                    </>
                                                )}
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

            {/* Modal Editar Reporte */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Editar Informe</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleEditReport}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Título *</Form.Label>
                            <Form.Control
                                type="text"
                                value={editReport.title}
                                onChange={(e) => setEditReport({...editReport, title: e.target.value})}
                                required
                            />
                        </Form.Group>
                        <Alert variant="info">
                            <small>Nota: Solo se puede modificar el título del informe. Para cambiar el paciente, especialidad o archivo, elimine este informe y cree uno nuevo.</small>
                        </Alert>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit">
                            Guardar Cambios
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
                                <p><strong>Fecha de creación:</strong> {formatDate(selectedReport.createdAt)}</p>
                            </Col>
                            <Col md={12} className="mt-3">
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="primary"
                                        onClick={() => handleFilePreview(selectedReport.id)}
                                    >
                                        <FaEye className="me-2" />
                                        Ver Archivo
                                    </Button>
                                    <Button
                                        variant="outline-primary"
                                        onClick={() => handleFileDownload(selectedReport.id)}
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