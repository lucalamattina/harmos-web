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
    Pagination,
    Collapse
} from "react-bootstrap";
import { FaEye, FaDownload, FaPlus, FaTrash, FaFile, FaFilter, FaExclamationCircle, FaChevronDown, FaChevronUp, FaChevronLeft, FaChevronRight, FaEdit } from 'react-icons/fa';
import api from '../../api/api';
import { AuthContext } from '../../context/AuthContext';
import { getTokenUserId } from '../../utils/auth';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { usePeriodicSync } from '../../hooks/usePeriodicSync'; // Importar el hook
import { formatDate } from '../../utils/dateUtils';
import { parseApiError } from '../../utils/apiErrors';
import { ALLOWED_DOCUMENT_TYPES, validateFile as validateFileAgainstAllowlist } from '../../utils/uploadValidation';
import FileViewer from '../FileViewer/FileViewer';
import './Reports.css';
import '../mobile-fix.css';

// Combined allowlist for reports: documents + a subset of images.
// Backend now requires extension AND MIME to match simultaneously.
const REPORT_FILE_ALLOWLIST = {
    ...ALLOWED_DOCUMENT_TYPES,
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
};
const REPORT_ACCEPT_ATTR = Object.keys(REPORT_FILE_ALLOWLIST).map(e => '.' + e).join(',');
const REPORT_MAX_SIZE_BYTES = 25 * 1024 * 1024;

const Reports = () => {
    const { isAdmin, currentUser: user } = useContext(AuthContext);
    const isMobile = useMobileDetection();
    
    // Hook para sincronización manual
    const { syncNow } = usePeriodicSync(() => {}); // El callback es opcional si solo queremos syncNow

    
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
    const [showEditModal, setShowEditModal] = useState(false);
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

    // Estados para formulario de edición
    const [editReport, setEditReport] = useState({
        id: null,
        title: '',
        patientId: '',
        specialtyId: '',
        file: null
    });

    // Estados de validación de formulario
    const [titleError, setTitleError] = useState('');
    const [patientError, setPatientError] = useState('');
    const [specialtyError, setSpecialtyError] = useState('');
    const [fileError, setFileError] = useState('');
    const [titleTouched, setTitleTouched] = useState(false);
    const [patientTouched, setPatientTouched] = useState(false);
    const [specialtyTouched, setSpecialtyTouched] = useState(false);
    const [fileTouched, setFileTouched] = useState(false);
    const [formError, setFormError] = useState('');

    // Estados de validación para formulario de edición
    const [editTitleError, setEditTitleError] = useState('');
    const [editPatientError, setEditPatientError] = useState('');
    const [editSpecialtyError, setEditSpecialtyError] = useState('');
    const [editFileError, setEditFileError] = useState('');
    const [editTitleTouched, setEditTitleTouched] = useState(false);
    const [editPatientTouched, setEditPatientTouched] = useState(false);
    const [editSpecialtyTouched, setEditSpecialtyTouched] = useState(false);
    const [editFileTouched, setEditFileTouched] = useState(false);
    const [editFormError, setEditFormError] = useState('');

    // Estado para evitar que se ejecuten ambos useEffect al mismo tiempo
    const [isFilterChange, setIsFilterChange] = useState(false);

    // Estados de guardado para evitar doble submit
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Estado para filtros colapsibles - inicializar como false y luego ajustar
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    // Estado para ordenamiento (default: date desc, mismo comportamiento previo)
    const [sortBy, setSortBy] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');

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
            params.append('sortBy', sortBy);
            params.append('sortDirection', sortDirection);
            
            // Agregar filtros - todos los usuarios pueden usar estos filtros
            if (selectedPatient) params.append('patientId', selectedPatient);
            if (selectedSpecialty) params.append('specialtyId', selectedSpecialty);
            if (selectedDoctor) params.append('doctorId', selectedDoctor);
            if (searchTerm.trim()) params.append('title', searchTerm.trim());
            
            // Todos los usuarios ven todos los reportes usando el endpoint /all con paginación
            const response = await api.get(`/api/reports/all?${params.toString()}`);
            
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
    }, [pageSize, selectedPatient, selectedSpecialty, selectedDoctor, searchTerm, sortBy, sortDirection, loading]);

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
    }, [selectedPatient, selectedSpecialty, selectedDoctor, searchTerm, sortBy, sortDirection, fetchReports]); // Agregamos fetchReports como dependencia

    // Cargar reportes cuando cambie la página (pero no si es un cambio de filtro)
    useEffect(() => {
        if (!isFilterChange) {
            fetchReports(currentPage);
        }
    }, [currentPage, fetchReports, isFilterChange]);

    // Configurar filtros según el dispositivo
    useEffect(() => {
        // En PC: expandidos, en móvil: minimizados
        setFiltersExpanded(!isMobile);
    }, [isMobile]);

    const fetchPatients = async () => {
        try {
            // Los admins ven todos los pacientes. Los terapeutas sólo los propios:
            // el backend ya no los filtra, así que se envía doctorId explícitamente.
            const params = new URLSearchParams({ page: '0', size: '1000' });
            if (!isAdmin) {
                const userId = getTokenUserId();
                if (!userId) {
                    setPatients([]);
                    return;
                }
                params.append('doctorId', userId);
            }
            const response = await api.get(`/api/patients?${params.toString()}`);
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

    // Funciones de validación
    const validateTitle = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El título es obligatorio.';
        }
        if (value.trim().length < 3) {
            return 'El título debe tener al menos 3 caracteres.';
        }
        if (value.length > 255) {
            return 'El título no puede exceder 255 caracteres.';
        }
        return '';
    };

    const validatePatient = (value) => {
        if (!value || value === '') {
            return 'Debe seleccionar un paciente.';
        }
        return '';
    };

    const validateSpecialty = (value) => {
        if (!value || value === '') {
            return 'Debe seleccionar una especialidad.';
        }
        return '';
    };

    const validateFile = (file) => {
        if (!file) {
            return 'Debe seleccionar un archivo.';
        }

        // Validar extensión + MIME contra el allowlist combinado (docs + imágenes)
        const mismatch = validateFileAgainstAllowlist(file, REPORT_FILE_ALLOWLIST);
        if (mismatch) {
            return mismatch;
        }

        // Validar tamaño (25MB)
        if (file.size > REPORT_MAX_SIZE_BYTES) {
            return 'El archivo no puede exceder 25MB.';
        }

        return '';
    };

    // Manejadores de cambio con validación en tiempo real
    const handleTitleChange = (e) => {
        const value = e.target.value;
        setNewReport(prev => ({ ...prev, title: value }));
        if (titleTouched) {
            setTitleError(validateTitle(value));
        }
        if (formError) setFormError('');
    };

    const handlePatientChange = (e) => {
        const value = e.target.value;
        setNewReport(prev => ({ ...prev, patientId: value }));
        if (patientTouched) {
            setPatientError(validatePatient(value));
        }
        if (formError) setFormError('');
    };

    const handleSpecialtyChange = (e) => {
        const value = e.target.value;
        setNewReport(prev => ({ ...prev, specialtyId: value }));
        if (specialtyTouched) {
            setSpecialtyError(validateSpecialty(value));
        }
        if (formError) setFormError('');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setNewReport(prev => ({ ...prev, file }));
        if (fileTouched) {
            setFileError(validateFile(file));
        }
        if (formError) setFormError('');
    };

    // Manejadores de blur
    const handleTitleBlur = () => {
        setTitleTouched(true);
        setTitleError(validateTitle(newReport.title));
    };

    const handlePatientBlur = () => {
        setPatientTouched(true);
        setPatientError(validatePatient(newReport.patientId));
    };

    const handleSpecialtyBlur = () => {
        setSpecialtyTouched(true);
        setSpecialtyError(validateSpecialty(newReport.specialtyId));
    };

    const handleFileBlur = () => {
        setFileTouched(true);
        setFileError(validateFile(newReport.file));
    };

    // Función para limpiar errores
    const clearFormErrors = () => {
        setTitleError('');
        setPatientError('');
        setSpecialtyError('');
        setFileError('');
        setFormError('');
        setTitleTouched(false);
        setPatientTouched(false);
        setSpecialtyTouched(false);
        setFileTouched(false);
    };

    // Funciones para cerrar modales con limpieza de errores
    const handleCloseCreateModal = () => {
        setShowCreateModal(false);
        setNewReport({ title: '', patientId: '', specialtyId: '', file: null });
        clearFormErrors();
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
        
        // Limpiar errores previos
        setFormError('');
        
        // Marcar todos los campos como touched
        setTitleTouched(true);
        setPatientTouched(true);
        setSpecialtyTouched(true);
        setFileTouched(true);
        
        // Validar todos los campos
        const titleErr = validateTitle(newReport.title);
        const patientErr = validatePatient(newReport.patientId);
        const specialtyErr = validateSpecialty(newReport.specialtyId);
        const fileErr = validateFile(newReport.file);
        
        setTitleError(titleErr);
        setPatientError(patientErr);
        setSpecialtyError(specialtyErr);
        setFileError(fileErr);
        
        // Si hay errores de validación, no continuar
        if (titleErr || patientErr || specialtyErr || fileErr) {
            setFormError('Por favor, corrige los errores antes de continuar.');
            return;
        }

        setCreating(true);
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
            clearFormErrors();
            fetchReports(0); // Volver a la primera página después de crear
            syncNow(); // Forzar actualización de notificaciones
            setCurrentPage(0);
            setError(null);
        } catch (error) {
            console.error('Error al crear reporte:', error);
            const { fieldErrors, message, status } = parseApiError(error, 'Error al crear el reporte');

            if (status === 403) {
                setFormError('No tienes permiso para realizar esta acción');
                return;
            }

            if (status === 400 && fieldErrors && Object.keys(fieldErrors).length > 0) {
                let mapped = false;
                if (fieldErrors.title) {
                    setTitleTouched(true);
                    setTitleError(fieldErrors.title);
                    mapped = true;
                }
                if (fieldErrors.patientId) {
                    setPatientTouched(true);
                    setPatientError(fieldErrors.patientId);
                    mapped = true;
                }
                if (fieldErrors.specialtyId) {
                    setSpecialtyTouched(true);
                    setSpecialtyError(fieldErrors.specialtyId);
                    mapped = true;
                }
                // doctorId is server-derived for POST, but surface it if present.
                if (fieldErrors.doctorId) {
                    mapped = true;
                }
                if (mapped) {
                    setFormError('Por favor, corrige los errores antes de continuar.');
                    return;
                }
                setFormError(message);
                return;
            }

            setFormError(message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteReport = async () => {
        setDeleting(true);
        try {
            await api.delete(`/api/reports/${selectedReport.id}`);
            setShowDeleteModal(false);
            setSelectedReport(null);
            fetchReports(currentPage); // Mantener la página actual después de eliminar
            setError(null);
        } catch (error) {
            console.error('Error al eliminar reporte:', error);
            const { message, status } = parseApiError(error, 'Error al eliminar el reporte');

            if (status === 403) {
                setError('No tienes permiso para realizar esta acción');
            } else if (status === 404) {
                setError('El informe ya no existe.');
                fetchReports(currentPage);
            } else {
                setError(message);
            }

            setShowDeleteModal(false);
            setSelectedReport(null);
        } finally {
            setDeleting(false);
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

    // Funciones para editar reportes
    const openEditModal = (report) => {
        setSelectedReport(report);
        setEditReport({
            id: report.id,
            title: report.title || '',
            patientId: report.patient?.id || '',
            specialtyId: report.specialty?.id || '',
            file: null // El archivo se maneja por separado
        });
        clearEditFormErrors();
        setShowEditModal(true);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setEditReport({ id: null, title: '', patientId: '', specialtyId: '', file: null });
        clearEditFormErrors();
    };

    // Funciones de validación para edición (reutilizamos las existentes)
    const validateEditTitle = (value) => validateTitle(value);
    const validateEditPatient = (value) => validatePatient(value);
    const validateEditSpecialty = (value) => validateSpecialty(value);
    const validateEditFile = (file) => {
        // Para edición, el archivo es opcional
        if (!file) return '';
        return validateFile(file);
    };

    // Manejadores de cambio para formulario de edición
    const handleEditTitleChange = (e) => {
        const value = e.target.value;
        setEditReport(prev => ({ ...prev, title: value }));
        if (editTitleTouched) {
            setEditTitleError(validateEditTitle(value));
        }
        if (editFormError) setEditFormError('');
    };

    const handleEditPatientChange = (e) => {
        const value = e.target.value;
        setEditReport(prev => ({ ...prev, patientId: value }));
        if (editPatientTouched) {
            setEditPatientError(validateEditPatient(value));
        }
        if (editFormError) setEditFormError('');
    };

    const handleEditSpecialtyChange = (e) => {
        const value = e.target.value;
        setEditReport(prev => ({ ...prev, specialtyId: value }));
        if (editSpecialtyTouched) {
            setEditSpecialtyError(validateEditSpecialty(value));
        }
        if (editFormError) setEditFormError('');
    };

    const handleEditFileChange = (e) => {
        const file = e.target.files[0];
        setEditReport(prev => ({ ...prev, file }));
        if (editFileTouched) {
            setEditFileError(validateEditFile(file));
        }
        if (editFormError) setEditFormError('');
    };

    // Manejadores de blur para formulario de edición
    const handleEditTitleBlur = () => {
        setEditTitleTouched(true);
        setEditTitleError(validateEditTitle(editReport.title));
    };

    const handleEditPatientBlur = () => {
        setEditPatientTouched(true);
        setEditPatientError(validateEditPatient(editReport.patientId));
    };

    const handleEditSpecialtyBlur = () => {
        setEditSpecialtyTouched(true);
        setEditSpecialtyError(validateEditSpecialty(editReport.specialtyId));
    };

    const handleEditFileBlur = () => {
        setEditFileTouched(true);
        setEditFileError(validateEditFile(editReport.file));
    };

    // Función para limpiar errores de edición
    const clearEditFormErrors = () => {
        setEditTitleError('');
        setEditPatientError('');
        setEditSpecialtyError('');
        setEditFileError('');
        setEditFormError('');
        setEditTitleTouched(false);
        setEditPatientTouched(false);
        setEditSpecialtyTouched(false);
        setEditFileTouched(false);
    };

    // Función para manejar la actualización del reporte
    const handleUpdateReport = async (e) => {
        e.preventDefault();
        
        // Limpiar errores previos
        setEditFormError('');
        
        // Marcar todos los campos como touched
        setEditTitleTouched(true);
        setEditPatientTouched(true);
        setEditSpecialtyTouched(true);
        setEditFileTouched(true);
        
        // Validar todos los campos
        const titleError = validateEditTitle(editReport.title);
        const patientError = validateEditPatient(editReport.patientId);
        const specialtyError = validateEditSpecialty(editReport.specialtyId);
        const fileError = validateEditFile(editReport.file);
        
        setEditTitleError(titleError);
        setEditPatientError(patientError);
        setEditSpecialtyError(specialtyError);
        setEditFileError(fileError);
        
        // Verificar si hay errores
        if (titleError || patientError || specialtyError || fileError) {
            setEditFormError('Por favor, corrige los errores antes de continuar.');
            return;
        }

        setUpdating(true);
        try {
            const formData = new FormData();

            // Solo agregar campos que han cambiado
            if (editReport.title !== selectedReport.title) {
                formData.append('title', editReport.title);
            }
            if (editReport.patientId !== selectedReport.patient?.id) {
                formData.append('patientId', editReport.patientId);
            }
            if (editReport.specialtyId !== selectedReport.specialty?.id) {
                formData.append('specialtyId', editReport.specialtyId);
            }
            if (editReport.file) {
                formData.append('file', editReport.file);
            }

            // Verificar que al menos un campo ha cambiado
            if (formData.entries().next().done) {
                setEditFormError('Debe modificar al menos un campo para actualizar el reporte.');
                return;
            }

            await api.put(`/api/reports/${editReport.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setShowEditModal(false);
            setEditReport({ id: null, title: '', patientId: '', specialtyId: '', file: null });
            clearEditFormErrors();
            fetchReports(currentPage); // Mantener la página actual después de editar
            syncNow(); // Forzar actualización de notificaciones
            setError(null);
        } catch (error) {
            console.error('Error al actualizar reporte:', error);
            const { fieldErrors, message, status } = parseApiError(error, 'Error al actualizar el reporte');

            if (status === 403) {
                setEditFormError('No tienes permiso para realizar esta acción');
                return;
            }

            if (status === 404) {
                setEditFormError('');
                setShowEditModal(false);
                setEditReport({ id: null, title: '', patientId: '', specialtyId: '', file: null });
                clearEditFormErrors();
                setError('El informe ya no existe.');
                fetchReports(currentPage);
                return;
            }

            if (status === 400 && fieldErrors && Object.keys(fieldErrors).length > 0) {
                let mapped = false;
                if (fieldErrors.title) {
                    setEditTitleTouched(true);
                    setEditTitleError(fieldErrors.title);
                    mapped = true;
                }
                if (fieldErrors.patientId) {
                    setEditPatientTouched(true);
                    setEditPatientError(fieldErrors.patientId);
                    mapped = true;
                }
                if (fieldErrors.specialtyId) {
                    setEditSpecialtyTouched(true);
                    setEditSpecialtyError(fieldErrors.specialtyId);
                    mapped = true;
                }
                if (fieldErrors.doctorId) {
                    mapped = true;
                }
                if (mapped) {
                    setEditFormError('Por favor, corrige los errores antes de continuar.');
                    return;
                }
                setEditFormError(message);
                return;
            }

            setEditFormError(message);
        } finally {
            setUpdating(false);
        }
    };

    // La función formatDate ahora viene del utils/dateUtils.js

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

            {/* Indicador informativo */}
            <Alert variant="info" className="mb-3">
                <strong>Informes del Sistema:</strong> Está viendo todos los informes de todos los doctores. 
                {isAdmin ? ' Como administrador, puede eliminar cualquier informe.' : ' Solo puede eliminar los informes que usted ha creado.'}
            </Alert>

            {/* Filtros Colapsibles */}
            <Card className="mb-4">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <Button
                            variant="link"
                            className="p-0 text-decoration-none d-flex align-items-center"
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            style={{ color: '#009A9E', fontWeight: 600 }}
                        >
                            <FaFilter className="me-2" />
                            Filtros
                            {filtersExpanded ? <FaChevronUp className="ms-2" /> : <FaChevronDown className="ms-2" />}
                        </Button>
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
                    <Collapse in={filtersExpanded}>
                        <div>
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
                                            {`${patient.firstName} ${patient.lastName}`}
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
                                <Form.Label>Terapeuta</Form.Label>
                                <Form.Select
                                    value={selectedDoctor}
                                    onChange={(e) => setSelectedDoctor(e.target.value)}
                                >
                                    <option value="">Todos los terapeutas</option>
                                    {doctors.map(doctor => (
                                        <option key={doctor.id} value={doctor.id}>
                                            {doctor.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                        </div>
                    </Collapse>
                </Card.Body>
            </Card>

            {/* Tabla de reportes */}
            <Card className="reports-table-container">
                <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <span>Informes Médicos</span>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Form.Group className="d-flex align-items-center gap-2 mb-0">
                            <Form.Label className="mb-0 small text-muted">Ordenar por</Form.Label>
                            <Form.Select
                                size="sm"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                style={{ width: 'auto' }}
                            >
                                <option value="date">Fecha</option>
                                <option value="title">Título</option>
                                <option value="id">Id</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="d-flex align-items-center gap-2 mb-0">
                            <Form.Label className="mb-0 small text-muted">Dirección</Form.Label>
                            <Form.Select
                                size="sm"
                                value={sortDirection}
                                onChange={(e) => setSortDirection(e.target.value)}
                                style={{ width: 'auto' }}
                            >
                                <option value="desc">Descendente</option>
                                <option value="asc">Ascendente</option>
                            </Form.Select>
                        </Form.Group>
                        <Badge bg="secondary">
                            Página {currentPage + 1} de {totalPages || 1}
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
                                <th>Terapeuta</th>
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
                                        <td>{`${report.patient?.firstName} ${report.patient?.lastName}` || 'N/A'}</td>
                                        <td>
                                            <Badge bg="info" className="specialty-badge">
                                                {report.specialty?.name || 'N/A'}
                                            </Badge>
                                        </td>
                                        <td>{report.doctor?.name || 'N/A'}</td>
                                        <td className="date-text">{formatDate(report.date)}</td>
                                        <td>
                                            <div className={`report-actions ${isMobile ? 'mobile-actions' : ''}`}>
                                                <Button
                                                    variant="outline-info"
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
                                                    // Verificar si el usuario puede editar este reporte
                                                    const canEdit = isAdmin || (
                                                        report.doctor?.id && 
                                                        user?.id && 
                                                        Number(report.doctor.id) === Number(user.id)
                                                    );
                                                    
                                                    return canEdit ? (
                                                        <Button
                                                            variant="outline-warning"
                                                            size="sm"
                                                            onClick={() => openEditModal(report)}
                                                            title="Editar reporte"
                                                        >
                                                            <FaEdit />
                                                        </Button>
                                                    ) : null;
                                                })()}
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
                
                {/* Controles de paginación CUSTOM con flechas para móvil */}
                {totalPages > 1 && (
                    <Card.Footer>
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                                <span className="text-muted me-3">
                                    Mostrando {reports.length} de {totalElements} informes
                                </span>
                            </div>
                            
                            <div className={`d-flex align-items-center gap-2 ${isMobile ? 'mobile-pagination' : ''}`}>
                                {/* Botón Anterior */}
                                <Button
                                    variant="outline-primary"
                                    size={isMobile ? "sm" : "md"}
                                    disabled={!hasPrevious}
                                    onClick={handlePreviousPage}
                                    style={{ minWidth: isMobile ? '40px' : 'auto' }}
                                >
                                    {isMobile ? <FaChevronLeft /> : 'Anterior'}
                                </Button>

                                {/* Indicador de página */}
                                <span className="text-muted px-2" style={{ fontSize: isMobile ? '0.8rem' : '1rem' }}>
                                    {currentPage + 1} de {totalPages}
                                </span>

                                {/* Botón Siguiente */}
                                <Button
                                    variant="outline-primary"
                                    size={isMobile ? "sm" : "md"}
                                    disabled={!hasNext}
                                    onClick={handleNextPage}
                                    style={{ minWidth: isMobile ? '40px' : 'auto' }}
                                >
                                    {isMobile ? <FaChevronRight /> : 'Siguiente'}
                                </Button>
                            </div>
                        </div>
                    </Card.Footer>
                )}
            </Card>

            {/* Modal Crear Reporte */}
            <Modal show={showCreateModal} onHide={handleCloseCreateModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Nuevo Informe</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateReport}>
                    <Modal.Body>
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Título</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Título del informe"
                                        value={newReport.title}
                                        maxLength={255}
                                        onChange={handleTitleChange}
                                        onBlur={handleTitleBlur}
                                        style={titleTouched && titleError ? { 
                                            border: '2px solid #d00', 
                                            background: '#fff6f6' 
                                        } : {}}
                                        className={titleTouched && titleError ? 'error-input' : ''}
                                    />
                                    <div className="d-flex justify-content-between">
                                        <div>
                                            {titleTouched && titleError && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {titleError}
                                                </div>
                                            )}
                                        </div>
                                        <Form.Text className="text-muted">
                                            {newReport.title.length}/255 caracteres
                                        </Form.Text>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Paciente</Form.Label>
                                    <Form.Select
                                        value={newReport.patientId}
                                        onChange={handlePatientChange}
                                        onBlur={handlePatientBlur}
                                        style={patientTouched && patientError ? { 
                                            border: '2px solid #d00', 
                                            background: '#fff6f6' 
                                        } : {}}
                                        className={patientTouched && patientError ? 'error-input' : ''}
                                    >
                                        <option value="">Seleccionar paciente</option>
                                        {patients.map(patient => (
                                            <option key={patient.id} value={patient.id}>
                                                {`${patient.firstName} ${patient.lastName}`}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    {patientTouched && patientError && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {patientError}
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Especialidad</Form.Label>
                                    <Form.Select
                                        value={newReport.specialtyId}
                                        onChange={handleSpecialtyChange}
                                        onBlur={handleSpecialtyBlur}
                                        style={specialtyTouched && specialtyError ? { 
                                            border: '2px solid #d00', 
                                            background: '#fff6f6' 
                                        } : {}}
                                        className={specialtyTouched && specialtyError ? 'error-input' : ''}
                                    >
                                        <option value="">Seleccionar especialidad</option>
                                        {specialties.map(specialty => (
                                            <option key={specialty.id} value={specialty.id}>
                                                {specialty.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    {specialtyTouched && specialtyError && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {specialtyError}
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Archivo</Form.Label>
                                    <Form.Control
                                        type="file"
                                        onChange={handleFileChange}
                                        onBlur={handleFileBlur}
                                        accept={REPORT_ACCEPT_ATTR}
                                        style={fileTouched && fileError ? {
                                            border: '2px solid #d00',
                                            background: '#fff6f6'
                                        } : {}}
                                        className={fileTouched && fileError ? 'error-input' : ''}
                                    />
                                    <div>
                                        {fileTouched && fileError && (
                                            <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                <FaExclamationCircle className="me-1" /> {fileError}
                                            </div>
                                        )}
                                        <Form.Text className="text-muted">
                                            Formatos permitidos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG. Máximo 25MB.
                                            {newReport.file && (
                                                <><br/>Archivo seleccionado: {newReport.file.name} ({(newReport.file.size / 1024 / 1024).toFixed(2)} MB)</>
                                            )}
                                        </Form.Text>
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        {/* Mensaje de error general */}
                        {formError && (
                            <Alert variant="danger" className="d-flex align-items-center">
                                <FaExclamationCircle className="me-2" />
                                <div style={{ whiteSpace: 'pre-line' }}>{formError}</div>
                            </Alert>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseCreateModal}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={creating || (titleTouched && titleError) || (patientTouched && patientError) ||
                                     (specialtyTouched && specialtyError) || (fileTouched && fileError)}
                        >
                            {creating ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Creando...</> : 'Crear Informe'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal Editar Reporte */}
            <Modal show={showEditModal} onHide={handleCloseEditModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Editar Informe</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpdateReport}>
                    <Modal.Body>
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Título</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Título del informe"
                                        value={editReport.title}
                                        maxLength={255}
                                        onChange={handleEditTitleChange}
                                        onBlur={handleEditTitleBlur}
                                        style={editTitleTouched && editTitleError ? { 
                                            border: '2px solid #d00', 
                                            background: '#fff6f6' 
                                        } : {}}
                                        className={editTitleTouched && editTitleError ? 'error-input' : ''}
                                    />
                                    <div className="d-flex justify-content-between">
                                        <div>
                                            {editTitleTouched && editTitleError && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {editTitleError}
                                                </div>
                                            )}
                                        </div>
                                        <Form.Text className="text-muted">
                                            {editReport.title.length}/255 caracteres
                                        </Form.Text>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Paciente</Form.Label>
                                    <Form.Select
                                        value={editReport.patientId}
                                        onChange={handleEditPatientChange}
                                        onBlur={handleEditPatientBlur}
                                        style={editPatientTouched && editPatientError ? { 
                                            border: '2px solid #d00', 
                                            background: '#fff6f6' 
                                        } : {}}
                                        className={editPatientTouched && editPatientError ? 'error-input' : ''}
                                    >
                                        <option value="">Seleccionar paciente</option>
                                        {patients.map(patient => (
                                            <option key={patient.id} value={patient.id}>
                                                {`${patient.firstName} ${patient.lastName}`}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    {editPatientTouched && editPatientError && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {editPatientError}
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Especialidad</Form.Label>
                                    <Form.Select
                                        value={editReport.specialtyId}
                                        onChange={handleEditSpecialtyChange}
                                        onBlur={handleEditSpecialtyBlur}
                                        style={editSpecialtyTouched && editSpecialtyError ? { 
                                            border: '2px solid #d00', 
                                            background: '#fff6f6' 
                                        } : {}}
                                        className={editSpecialtyTouched && editSpecialtyError ? 'error-input' : ''}
                                    >
                                        <option value="">Seleccionar especialidad</option>
                                        {specialties.map(specialty => (
                                            <option key={specialty.id} value={specialty.id}>
                                                {specialty.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                    {editSpecialtyTouched && editSpecialtyError && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {editSpecialtyError}
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Archivo (opcional)</Form.Label>
                                    <Form.Control
                                        type="file"
                                        onChange={handleEditFileChange}
                                        onBlur={handleEditFileBlur}
                                        accept={REPORT_ACCEPT_ATTR}
                                        style={editFileTouched && editFileError ? {
                                            border: '2px solid #d00',
                                            background: '#fff6f6'
                                        } : {}}
                                        className={editFileTouched && editFileError ? 'error-input' : ''}
                                    />
                                    <div>
                                        {editFileTouched && editFileError && (
                                            <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                <FaExclamationCircle className="me-1" /> {editFileError}
                                            </div>
                                        )}
                                        <Form.Text className="text-muted">
                                            Formatos permitidos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, JPG, PNG. Máximo 25MB.
                                            {editReport.file && (
                                                <><br/>Archivo seleccionado: {editReport.file.name} ({(editReport.file.size / 1024 / 1024).toFixed(2)} MB)</>
                                            )}
                                            {selectedReport && selectedReport.file && !editReport.file && (
                                                <><br/>Archivo actual: {selectedReport.file.filename}</>
                                            )}
                                        </Form.Text>
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        {/* Mensaje de error general */}
                        {editFormError && (
                            <Alert variant="danger" className="d-flex align-items-center">
                                <FaExclamationCircle className="me-2" />
                                <div style={{ whiteSpace: 'pre-line' }}>{editFormError}</div>
                            </Alert>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseEditModal}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={updating || (editTitleTouched && editTitleError) || (editPatientTouched && editPatientError) ||
                                     (editSpecialtyTouched && editSpecialtyError) || (editFileTouched && editFileError)}
                        >
                            {updating ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Actualizando...</> : 'Actualizar Informe'}
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
                                <p><strong>Paciente:</strong> {`${selectedReport.patient?.firstName} ${selectedReport.patient?.lastName}` || 'N/A'}</p>
                                <p><strong>Especialidad:</strong> {selectedReport.specialty?.name || 'N/A'}</p>
                            </Col>
                            <Col md={6}>
                                <p><strong>Terapeuta:</strong> {selectedReport.doctor?.name || 'N/A'}</p>
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
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={handleDeleteReport} disabled={deleting}>
                        {deleting ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Eliminando...</> : 'Eliminar'}
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