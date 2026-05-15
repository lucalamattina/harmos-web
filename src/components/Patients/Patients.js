import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Button, Form, Modal, Container, Table, InputGroup, Row, Col, Spinner, Card, Badge, Alert, Collapse, OverlayTrigger, Tooltip } from "react-bootstrap";
import { FaExclamationCircle, FaPlus, FaChevronDown, FaChevronUp, FaChevronLeft, FaChevronRight, FaTrash, FaEye, FaDownload, FaFileAlt, FaFilter, FaEdit, FaTimes } from 'react-icons/fa';
import api from '../../api/api';
import { parseApiError } from '../../utils/apiErrors';
import { AuthContext } from '../../context/AuthContext';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { formatDate } from '../../utils/dateUtils';
import FileViewer from '../FileViewer/FileViewer';
import './Patients.css';
import '../Reports/Reports.css';
import '../mobile-fix.css';

const Patients = () => {
    const { isAdmin } = useContext(AuthContext);
    const isMobile = useMobileDetection();
    
    // Debug log
    // Patients - isMobile detection
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [doctors, setDoctors] = useState([]);

    // Estado para filtros colapsibles - inicializar como false y luego ajustar
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
    const [doctorSpecialty, setDoctorSpecialty] = useState('');
    const [specialties, setSpecialties] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('');
    const [doctorFilterTerm, setDoctorFilterTerm] = useState(''); // Campo de texto para filtrar por nombre de doctor
    const [statuses, setStatuses] = useState([]);
    const [newPatient, setNewPatient] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        status: "ACTIVE",
        doctorIds: [],
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

    // Estados de validación de formulario
    const [firstNameError, setFirstNameError] = useState('');
    const [lastNameError, setLastNameError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [firstNameTouched, setFirstNameTouched] = useState(false);
    const [lastNameTouched, setLastNameTouched] = useState(false);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [formError, setFormError] = useState('');
    // Errores devueltos por el backend (400 con { errors: { campo: msg } })
    const [serverFieldErrors, setServerFieldErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // Estados para el modal de edición de paciente
    const [showEdit, setShowEdit] = useState(false);
    const [editPatient, setEditPatient] = useState({
        id: null,
        firstName: "",
        lastName: "",
        phone: "",
        status: "ACTIVE"
    });
    const [editAssignedDoctors, setEditAssignedDoctors] = useState([]);
    const [editOriginalDoctorIds, setEditOriginalDoctorIds] = useState([]);
    const [editDoctorsToAdd, setEditDoctorsToAdd] = useState([]);
    const [editDoctorSearchTerm, setEditDoctorSearchTerm] = useState('');
    const [editDoctorSpecialty, setEditDoctorSpecialty] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [editFormError, setEditFormError] = useState('');
    const [editFirstNameError, setEditFirstNameError] = useState('');
    const [editLastNameError, setEditLastNameError] = useState('');
    const [editPhoneError, setEditPhoneError] = useState('');
    const [editFirstNameTouched, setEditFirstNameTouched] = useState(false);
    const [editLastNameTouched, setEditLastNameTouched] = useState(false);
    const [editPhoneTouched, setEditPhoneTouched] = useState(false);
    // Errores devueltos por el backend (400 con { errors: { campo: msg } }) en edición
    const [editServerFieldErrors, setEditServerFieldErrors] = useState({});

    // Estados para informes del paciente (modal de detalles)
    const [patientReports, setPatientReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(false);
    const [reportsError, setReportsError] = useState(null);

    // Estados para el visor de archivos
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [selectedFileData, setSelectedFileData] = useState(null);
    const [fileViewerLoading, setFileViewerLoading] = useState(false);
    const [fileViewerError, setFileViewerError] = useState(null);

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
                params.append('doctor', doctorFilterTerm); // Enviar el nombre del doctor
            }
            if (selectedStatus) {
                params.append('status', selectedStatus);
            }
            if (selectedSpecialty) {
                params.append('specialty', selectedSpecialty);
            }

            const response = await api.get(`/api/patients?${params.toString()}`);
            console.log(response.data.content);
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
        if (showNew || showDetails || showEdit) {
            // Cargar especialidades
            api.get('/api/specialties')
                .then(res => setSpecialties(res.data))
                .catch(() => setSpecialties([]));

            // Cargar doctores iniciales
            fetchDoctors();
        }
    }, [showNew, showDetails, showEdit, fetchDoctors]);

    // Actualizar doctores cuando cambie el término de búsqueda o la especialidad
    useEffect(() => {
        if (showNew || showDetails || showEdit) {
            fetchDoctors();
        }
    }, [fetchDoctors, showNew, showDetails, showEdit]);

    // Función de búsqueda con debounce
    const debouncedSearch = useCallback(
        (term) => {
            if (term.trim() === '') {
                setFilteredPatients(patients);
            } else {
                const filtered = patients.filter(patient => 
                    (`${patient.firstName} ${patient.lastName}`).toLowerCase().includes(term.toLowerCase())
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

    // Configurar filtros según el dispositivo
    useEffect(() => {
        // En PC: expandidos, en móvil: minimizados
        setFiltersExpanded(!isMobile);
    }, [isMobile]);

    const handleCloseNew = () => {
        setShowNew(false);
        setNewPatient({
            firstName: "",
            lastName: "",
            phone: "",
            status: "ACTIVE",
            doctorIds: [],
            doctorSpecialties: []
        });
        setDoctorSearchTerm('');
        setDoctorSpecialty('');
        clearFormErrors();
    };

    const handleSave = async () => {
        // Defensa adicional: el botón ya está oculto para no-admins, pero
        // protegemos el handler en caso de invocación directa.
        if (!isAdmin) {
            setFormError('Solo los administradores pueden crear pacientes');
            return;
        }

        // Limpiar errores previos
        setFormError('');
        setServerFieldErrors({});

        // Marcar todos los campos como touched
        setFirstNameTouched(true);
        setLastNameTouched(true);
        setPhoneTouched(true);

        // Validar todos los campos
        const firstNameErr = validateFirstName(newPatient.firstName);
        const lastNameErr = validateLastName(newPatient.lastName);
        const phoneErr = validatePhone(newPatient.phone);

        setFirstNameError(firstNameErr);
        setLastNameError(lastNameErr);
        setPhoneError(phoneErr);

        // Si hay errores de validación, no continuar
        if (firstNameErr || lastNameErr || phoneErr) {
            setFormError('Por favor, corrige los errores antes de continuar.');
            return;
        }

        setSaving(true);
        try {
            await api.post('/api/patients', newPatient);
            await fetchPatients();
            setShowNew(false);
            setNewPatient({
                firstName: "",
                lastName: "",
                phone: "",
                status: "ACTIVE",
                doctorIds: [],
                doctorSpecialties: []
            });
            clearFormErrors();
        } catch (err) {
            console.error('Error al guardar el paciente:', err);
            const { fieldErrors, message, status } = parseApiError(err, 'Error al guardar el paciente');
            if (status === 403) {
                setServerFieldErrors({});
                setFormError('Solo los administradores pueden crear pacientes');
                return;
            }
            if (status === 400 && fieldErrors && Object.keys(fieldErrors).length > 0) {
                setServerFieldErrors(fieldErrors);
                setFormError('Por favor, corrige los errores indicados.');
                return;
            }
            setServerFieldErrors({});
            setFormError(message);
        } finally {
            setSaving(false);
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
            fetchPatientReports(patientId);
        } catch (err) {
            setError('Error al cargar los detalles del paciente');
        }
    };

    const fetchPatientReports = async (patientId) => {
        setReportsLoading(true);
        setReportsError(null);
        try {
            const params = new URLSearchParams();
            params.append('page', '0');
            params.append('size', '100');
            params.append('sortBy', 'date');
            params.append('sortDirection', 'desc');
            params.append('patientId', patientId);

            const response = await api.get(`/api/reports/all?${params.toString()}`);
            const data = response.data;
            if (data && Array.isArray(data.reports)) {
                setPatientReports(data.reports);
            } else if (Array.isArray(data)) {
                setPatientReports(data);
            } else {
                setPatientReports([]);
            }
        } catch (err) {
            console.error('Error al cargar informes del paciente:', err);
            setReportsError('Error al cargar los informes del paciente');
            setPatientReports([]);
        } finally {
            setReportsLoading(false);
        }
    };

    const handleCloseDetails = () => {
        setShowDetails(false);
        setSelectedPatient(null);
        setPatientReports([]);
        setReportsError(null);
    };

    const handleReportPreview = (report) => {
        try {
            setFileViewerError(null);
            const fileData = report.file;

            if (!fileData) {
                setFileViewerError('No se encontró archivo para este informe');
                setShowFileViewer(true);
                return;
            }

            const viewUrl = fileData.url ? fileData.url.replace('fl_attachment/', '') : null;
            const ext = fileData.filename?.split('.').pop()?.toLowerCase() || 'pdf';

            const adaptedFileData = {
                filename: fileData.filename || 'Documento',
                document_type: ext,
                viewer_type: ext,
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
        } catch (err) {
            console.error('Error al cargar archivo:', err);
            setFileViewerError('Error al cargar el archivo');
            setShowFileViewer(true);
        } finally {
            setFileViewerLoading(false);
        }
    };

    const handleReportDownload = (report) => {
        const fileData = report.file;
        if (!fileData || !fileData.downloadUrl) {
            setError('No se encontró archivo para descargar');
            return;
        }
        const link = document.createElement('a');
        link.href = fileData.downloadUrl;
        link.download = fileData.filename || 'informe';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAddDoctors = async () => {
        // Verificar que el usuario sea administrador
        if (!isAdmin) {
            setError('Solo los administradores pueden agregar doctores a pacientes');
            return;
        }

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
        // Verificar que el usuario sea administrador
        if (!isAdmin) {
            setError('Solo los administradores pueden eliminar pacientes');
            return;
        }

        showConfirmation('¿Estás seguro de que deseas eliminar este paciente?', async () => {
            try {
                await api.delete(`/api/patients/${patient.id}`);
                await fetchPatients();
            } catch (err) {
                setError('Error al eliminar el paciente');
            }
        });
    };

    // Abrir modal de edición de paciente (solo admin)
    const handleOpenEdit = async (patient) => {
        if (!isAdmin) {
            setError('Solo los administradores pueden editar pacientes');
            return;
        }

        try {
            // Obtener detalles completos incluyendo terapeutas asignados
            const response = await api.get(`/api/patients/${patient.id}`);
            const patientData = response.data;

            setEditPatient({
                id: patientData.id,
                firstName: patientData.firstName || "",
                lastName: patientData.lastName || "",
                phone: patientData.phone || "",
                status: patientData.status || "ACTIVE"
            });

            const assigned = Array.isArray(patientData.doctors) ? patientData.doctors : [];
            setEditAssignedDoctors(assigned);
            setEditOriginalDoctorIds(assigned.map(d => d.id));
            setEditDoctorsToAdd([]);
            setEditDoctorSearchTerm('');
            setEditDoctorSpecialty('');
            clearEditFormErrors();
            setShowEdit(true);
        } catch (err) {
            setError('Error al cargar los datos del paciente para editar');
        }
    };

    const handleCloseEdit = () => {
        setShowEdit(false);
        setEditPatient({
            id: null,
            firstName: "",
            lastName: "",
            phone: "",
            status: "ACTIVE"
        });
        setEditAssignedDoctors([]);
        setEditOriginalDoctorIds([]);
        setEditDoctorsToAdd([]);
        setEditDoctorSearchTerm('');
        setEditDoctorSpecialty('');
        clearEditFormErrors();
    };

    // Quitar un terapeuta de la lista asignada (localmente, se confirma al guardar)
    const handleRemoveAssignedDoctor = (doctorId) => {
        setEditAssignedDoctors(prev => prev.filter(d => d.id !== doctorId));
    };

    const toggleDoctorToAdd = (doctorId) => {
        setEditDoctorsToAdd(prev =>
            prev.includes(doctorId)
                ? prev.filter(id => id !== doctorId)
                : [...prev, doctorId]
        );
    };

    // Guardar cambios del paciente
    const handleEditSave = async () => {
        setEditFormError('');
        setEditServerFieldErrors({});

        setEditFirstNameTouched(true);
        setEditLastNameTouched(true);
        setEditPhoneTouched(true);

        const firstNameErr = validateFirstName(editPatient.firstName);
        const lastNameErr = validateLastName(editPatient.lastName);
        const phoneErr = validatePhone(editPatient.phone);

        setEditFirstNameError(firstNameErr);
        setEditLastNameError(lastNameErr);
        setEditPhoneError(phoneErr);

        if (firstNameErr || lastNameErr || phoneErr) {
            setEditFormError('Por favor, corrige los errores antes de continuar.');
            return;
        }

        setEditSaving(true);
        try {
            // 1. Actualizar datos básicos del paciente
            await api.put(`/api/patients/${editPatient.id}`, {
                firstName: editPatient.firstName,
                lastName: editPatient.lastName,
                phone: editPatient.phone,
                status: editPatient.status
            });

            // 2. Determinar terapeutas a quitar (estaban y ya no están)
            const currentAssignedIds = editAssignedDoctors.map(d => d.id);
            const doctorsToRemove = editOriginalDoctorIds.filter(
                id => !currentAssignedIds.includes(id)
            );

            // 3. Quitar terapeutas
            await Promise.all(
                doctorsToRemove.map(doctorId =>
                    api.delete(`/api/patients/${editPatient.id}/doctors/${doctorId}`)
                )
            );

            // 4. Agregar nuevos terapeutas seleccionados
            await Promise.all(
                editDoctorsToAdd.map(doctorId =>
                    api.post(`/api/patients/${editPatient.id}/doctors/${doctorId}`)
                )
            );

            await fetchPatients();
            handleCloseEdit();
        } catch (err) {
            console.error('Error al actualizar el paciente:', err);
            const { fieldErrors, message, status } = parseApiError(err, 'Error al actualizar el paciente');
            if (status === 404) {
                setEditServerFieldErrors({});
                setEditFormError('El paciente ya no existe. Actualizando lista...');
                await fetchPatients();
                handleCloseEdit();
                return;
            }
            if (status === 403) {
                setEditServerFieldErrors({});
                setEditFormError('No tienes permiso para realizar esta acción');
                return;
            }
            if (status === 400 && fieldErrors && Object.keys(fieldErrors).length > 0) {
                setEditServerFieldErrors(fieldErrors);
                setEditFormError('Por favor, corrige los errores indicados.');
                return;
            }
            setEditServerFieldErrors({});
            setEditFormError(message);
        } finally {
            setEditSaving(false);
        }
    };

    // Handlers de cambio con validación para el formulario de edición
    const handleEditFirstNameChange = (e) => {
        const value = e.target.value;
        setEditPatient(prev => ({ ...prev, firstName: value }));
        if (editFirstNameTouched) {
            setEditFirstNameError(validateFirstName(value));
        }
        if (editFormError) setEditFormError('');
        if (editServerFieldErrors.firstName) {
            setEditServerFieldErrors(prev => { const { firstName, ...rest } = prev; return rest; });
        }
    };

    const handleEditLastNameChange = (e) => {
        const value = e.target.value;
        setEditPatient(prev => ({ ...prev, lastName: value }));
        if (editLastNameTouched) {
            setEditLastNameError(validateLastName(value));
        }
        if (editFormError) setEditFormError('');
        if (editServerFieldErrors.lastName) {
            setEditServerFieldErrors(prev => { const { lastName, ...rest } = prev; return rest; });
        }
    };

    const handleEditPhoneChange = (e) => {
        const value = e.target.value;
        setEditPatient(prev => ({ ...prev, phone: value }));
        if (editPhoneTouched) {
            setEditPhoneError(validatePhone(value));
        }
        if (editFormError) setEditFormError('');
        if (editServerFieldErrors.phone) {
            setEditServerFieldErrors(prev => { const { phone, ...rest } = prev; return rest; });
        }
    };

    const handleEditFirstNameBlur = () => {
        setEditFirstNameTouched(true);
        setEditFirstNameError(validateFirstName(editPatient.firstName));
    };

    const handleEditLastNameBlur = () => {
        setEditLastNameTouched(true);
        setEditLastNameError(validateLastName(editPatient.lastName));
    };

    const handleEditPhoneBlur = () => {
        setEditPhoneTouched(true);
        setEditPhoneError(validatePhone(editPatient.phone));
    };

    const clearEditFormErrors = () => {
        setEditFirstNameError('');
        setEditLastNameError('');
        setEditPhoneError('');
        setEditFormError('');
        setEditServerFieldErrors({});
        setEditFirstNameTouched(false);
        setEditLastNameTouched(false);
        setEditPhoneTouched(false);
    };

    // Funciones de validación
    const validateFirstName = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El nombre es obligatorio.';
        }
        if (value.trim().length < 2) {
            return 'El nombre debe tener al menos 2 caracteres.';
        }
        if (value.length > 50) {
            return 'El nombre no puede exceder 50 caracteres.';
        }
        return '';
    };

    const validateLastName = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El apellido es obligatorio.';
        }
        if (value.trim().length < 2) {
            return 'El apellido debe tener al menos 2 caracteres.';
        }
        if (value.length > 50) {
            return 'El apellido no puede exceder 50 caracteres.';
        }
        return '';
    };

    const validatePhone = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El teléfono es obligatorio.';
        }
        // Expresión regular para validar números de teléfono (permite espacios, guiones, paréntesis)
        const phoneRegex = /^[\d\s\-()+ ]{7,20}$/;
        if (!phoneRegex.test(value.trim())) {
            return 'Ingrese un número de teléfono válido (7-20 dígitos).';
        }
        return '';
    };

    // Manejadores de cambio con validación en tiempo real
    const handleFirstNameChange = (e) => {
        const value = e.target.value;
        setNewPatient(prev => ({ ...prev, firstName: value }));
        if (firstNameTouched) {
            setFirstNameError(validateFirstName(value));
        }
        if (formError) setFormError('');
        if (serverFieldErrors.firstName) {
            setServerFieldErrors(prev => { const { firstName, ...rest } = prev; return rest; });
        }
    };

    const handleLastNameChange = (e) => {
        const value = e.target.value;
        setNewPatient(prev => ({ ...prev, lastName: value }));
        if (lastNameTouched) {
            setLastNameError(validateLastName(value));
        }
        if (formError) setFormError('');
        if (serverFieldErrors.lastName) {
            setServerFieldErrors(prev => { const { lastName, ...rest } = prev; return rest; });
        }
    };

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        setNewPatient(prev => ({ ...prev, phone: value }));
        if (phoneTouched) {
            setPhoneError(validatePhone(value));
        }
        if (formError) setFormError('');
        if (serverFieldErrors.phone) {
            setServerFieldErrors(prev => { const { phone, ...rest } = prev; return rest; });
        }
    };

    // Manejadores de blur
    const handleFirstNameBlur = () => {
        setFirstNameTouched(true);
        setFirstNameError(validateFirstName(newPatient.firstName));
    };

    const handleLastNameBlur = () => {
        setLastNameTouched(true);
        setLastNameError(validateLastName(newPatient.lastName));
    };

    const handlePhoneBlur = () => {
        setPhoneTouched(true);
        setPhoneError(validatePhone(newPatient.phone));
    };

    // Función para limpiar errores
    const clearFormErrors = () => {
        setFirstNameError('');
        setLastNameError('');
        setPhoneError('');
        setFormError('');
        setServerFieldErrors({});
        setFirstNameTouched(false);
        setLastNameTouched(false);
        setPhoneTouched(false);
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
                                onClick={() => {
                                    setSearchTerm('');
                                    setDoctorFilterTerm('');
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
                                    <FaPlus className="me-2" />
                                    Nuevo Paciente
                                </Button>
                            )}
                        </div>
                    </div>
                    <Collapse in={filtersExpanded}>
                        <div>
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
                                <Form.Label>Terapeuta</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="bi bi-person"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Filtrar por nombre de terapeuta..."
                                        value={doctorFilterTerm}
                                        onChange={handleDoctorFilterChange}
                                    />
                                </InputGroup>
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
                        </div>
                    </Collapse>
                </Card.Body>
            </Card>

            {/* Tabla de pacientes */}
            <Card className="patients-table-container">
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <span>Pacientes</span>
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
                                        <td>{`${patient.firstName} ${patient.lastName}`}</td>
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
                                            <div className="patient-actions">
                                                <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-view-patient-${patient.id}`}>Ver paciente</Tooltip>}>
                                                    <Button 
                                                        variant="outline-primary" 
                                                        size="sm"
                                                        className="patient-action-btn"
                                                        onClick={() => fetchPatientDetails(patient.id)}
                                                    >
                                                        <FaEye />
                                                    </Button>
                                                </OverlayTrigger>
                                                {isAdmin && (
                                                    <>
                                                        <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-edit-patient-${patient.id}`}>Editar paciente</Tooltip>}>
                                                            <Button
                                                                variant="outline-warning"
                                                                size="sm"
                                                                className="patient-action-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEdit(patient);
                                                                }}
                                                            >
                                                                <FaEdit />
                                                            </Button>
                                                        </OverlayTrigger>
                                                        <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-delete-patient-${patient.id}`}>Eliminar paciente</Tooltip>}>
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                className="patient-action-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeletePatient(patient);
                                                                }}
                                                            >
                                                                <FaTrash />
                                                            </Button>
                                                        </OverlayTrigger>
                                                    </>
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
                <div className={`d-flex justify-content-center align-items-center my-4 gap-2 ${isMobile ? 'mobile-pagination' : ''}`}>
                    <Button 
                        variant="outline-secondary" 
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                    >
                        {isMobile ? <FaChevronLeft /> : 'Anterior'}
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
                        {isMobile ? <FaChevronRight /> : 'Siguiente'}
                    </Button>
                </div>
            )}



            {/* Modal de Detalles del Paciente */}
            <Modal
                show={showDetails}
                onHide={handleCloseDetails}
                size="lg"
                dialogClassName="modal-dialog-responsive"
                centered
            >
                <Modal.Header className="border-bottom-0 sticky-top bg-white" style={{ zIndex: 1031 }} closeButton>
                    <Modal.Title>
                        {selectedPatient
                            ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                            : 'Detalles del Paciente'}
                    </Modal.Title>
                </Modal.Header>
                {selectedPatient && (
                    <div
                        className="patient-metadata sticky-top bg-light mb-0 p-3"
                        style={{ top: '56px', zIndex: 1030, borderRadius: 0 }}
                    >
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div className="d-flex flex-wrap gap-3">
                                <small className="text-muted">
                                    <i className="bi bi-telephone me-1"></i>
                                    {selectedPatient.phone || '—'}
                                </small>
                                <small className="text-muted">
                                    <i className="bi bi-people me-1"></i>
                                    {selectedPatient.doctors?.length || 0} terapeuta{(selectedPatient.doctors?.length || 0) === 1 ? '' : 's'}
                                </small>
                                <small className="text-muted">
                                    <i className="bi bi-file-earmark-text me-1"></i>
                                    {patientReports.length} informe{patientReports.length === 1 ? '' : 's'}
                                </small>
                            </div>
                            <span className={`badge bg-${
                                selectedPatient.status === 'ACTIVE' ? 'success' :
                                selectedPatient.status === 'INACTIVE' ? 'danger' :
                                selectedPatient.status === 'DISCHARGED' ? 'info' :
                                selectedPatient.status === 'PENDING' ? 'warning' :
                                selectedPatient.status === 'REFERRED' ? 'primary' : 'secondary'
                            }`}>
                                {selectedPatient.status === 'ACTIVE' ? 'Activo' :
                                 selectedPatient.status === 'INACTIVE' ? 'Inactivo' :
                                 selectedPatient.status === 'DISCHARGED' ? 'Dado de alta' :
                                 selectedPatient.status === 'PENDING' ? 'Pendiente' :
                                 selectedPatient.status === 'REFERRED' ? 'Derivado' : selectedPatient.status}
                            </span>
                        </div>
                    </div>
                )}
                <Modal.Body>
                    {selectedPatient && (
                        <div className="patient-details">
                            {/* Sección: Terapeutas asignados */}
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0">
                                        <i className="bi bi-people me-2"></i>
                                        Terapeutas Asignados
                                    </h6>
                                    {isAdmin && (
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => {
                                                setShowAddDoctor(true);
                                                fetchDoctors();
                                            }}
                                        >
                                            <i className="bi bi-plus-circle me-1"></i>
                                            Agregar Terapeuta
                                        </Button>
                                    )}
                                </div>
                                {selectedPatient.doctors && selectedPatient.doctors.length > 0 ? (
                                    <div className="doctors-list">
                                        {selectedPatient.doctors.map((doctor, index) => (
                                            <div key={index} className="doctor-item p-2 mb-2 border rounded">
                                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                    <span className="fw-medium">
                                                        <i className="bi bi-person-circle me-2 text-muted"></i>
                                                        {doctor.name}
                                                    </span>
                                                    <div>
                                                        {doctor.specialty && (
                                                            <span className="badge bg-info me-1">{doctor.specialty}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-muted fst-italic">
                                        No hay terapeutas asignados
                                    </div>
                                )}
                            </div>

                            <hr />

                            {/* Sección: Informes del paciente */}
                            <div className="reports-section">
                                <h6 className="mb-3">
                                    <i className="bi bi-file-earmark-text me-2"></i>
                                    Informes del paciente
                                    {!reportsLoading && (
                                        <span className="badge bg-secondary ms-2">{patientReports.length}</span>
                                    )}
                                </h6>

                                {reportsLoading ? (
                                    <div className="text-center py-3">
                                        <Spinner animation="border" size="sm" variant="primary" />
                                        <div className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                                            Cargando informes...
                                        </div>
                                    </div>
                                ) : reportsError ? (
                                    <Alert variant="danger" className="d-flex align-items-center mb-0">
                                        <FaExclamationCircle className="me-2" />
                                        <div>{reportsError}</div>
                                    </Alert>
                                ) : patientReports.length === 0 ? (
                                    <div className="empty-state">
                                        <FaFileAlt className="empty-state-icon" />
                                        <div>Este paciente aún no tiene informes.</div>
                                    </div>
                                ) : (
                                    <Table responsive hover className="reports-table">
                                        <thead>
                                            <tr>
                                                <th>Título</th>
                                                <th>Fecha</th>
                                                <th>Especialidad</th>
                                                <th>Terapeuta</th>
                                                <th>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {patientReports.map(report => (
                                                <tr key={report.id}>
                                                    <td>
                                                        <strong className="report-title">{report.title}</strong>
                                                    </td>
                                                    <td className="date-text">{formatDate(report.date)}</td>
                                                    <td>
                                                        <Badge bg="info" className="specialty-badge">
                                                            {report.specialty?.name || 'N/A'}
                                                        </Badge>
                                                    </td>
                                                    <td>{report.doctor?.name || 'N/A'}</td>
                                                    <td>
                                                        <div className={`report-actions ${isMobile ? 'mobile-actions' : ''}`}>
                                                            <Button
                                                                variant="outline-secondary"
                                                                size="sm"
                                                                onClick={() => handleReportPreview(report)}
                                                                title="Ver archivo"
                                                                disabled={!report.file}
                                                            >
                                                                <FaEye />
                                                            </Button>
                                                            <Button
                                                                variant="outline-success"
                                                                size="sm"
                                                                onClick={() => handleReportDownload(report)}
                                                                title="Descargar archivo"
                                                                disabled={!report.file?.downloadUrl}
                                                            >
                                                                <FaDownload />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0 d-flex justify-content-center">
                    <Button variant="primary" className="px-5" onClick={handleCloseDetails}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Visualizador de archivos de informes */}
            <FileViewer
                show={showFileViewer}
                onHide={() => {
                    setShowFileViewer(false);
                    setSelectedFileData(null);
                    setFileViewerError(null);
                }}
                fileData={selectedFileData}
                isLoading={fileViewerLoading}
                error={fileViewerError}
            />

            {/* Modal para Agregar Terapeutas */}
            <Modal show={showAddDoctor} onHide={() => setShowAddDoctor(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Agregar Terapeutas</Modal.Title>
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
                                        placeholder="Buscar terapeuta por nombre..."
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
                                            <td>{doctor.specialty || ''}</td>
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
                        Agregar Terapeutas Seleccionados
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
                                        placeholder="Nombre del paciente"
                                        value={newPatient.firstName}
                                        maxLength={50}
                                        onChange={handleFirstNameChange}
                                        onBlur={handleFirstNameBlur}
                                        style={firstNameTouched && firstNameError ? { 
                                            border: '2px solid #d00', 
                                            background: '#fff6f6' 
                                        } : {}}
                                        className={firstNameTouched && firstNameError ? 'error-input' : ''}
                                    />
                                    <div className="d-flex justify-content-between">
                                        <div>
                                            {firstNameTouched && firstNameError && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {firstNameError}
                                                </div>
                                            )}
                                            {serverFieldErrors.firstName && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {serverFieldErrors.firstName}
                                                </div>
                                            )}
                                        </div>
                                        <Form.Text className="text-muted">
                                            {newPatient.firstName.length}/50 caracteres
                                        </Form.Text>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Apellido</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Apellido del paciente"
                                        value={newPatient.lastName}
                                        maxLength={50}
                                        onChange={handleLastNameChange}
                                        onBlur={handleLastNameBlur}
                                        style={lastNameTouched && lastNameError ? { 
                                            border: '2px solid #d00', 
                                            background: '#fff6f6' 
                                        } : {}}
                                        className={lastNameTouched && lastNameError ? 'error-input' : ''}
                                    />
                                    <div className="d-flex justify-content-between">
                                        <div>
                                            {lastNameTouched && lastNameError && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {lastNameError}
                                                </div>
                                            )}
                                            {serverFieldErrors.lastName && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {serverFieldErrors.lastName}
                                                </div>
                                            )}
                                        </div>
                                        <Form.Text className="text-muted">
                                            {newPatient.lastName.length}/50 caracteres
                                        </Form.Text>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Teléfono</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        placeholder="Número de teléfono"
                                        value={newPatient.phone}
                                        maxLength={20}
                                        onChange={handlePhoneChange}
                                        onBlur={handlePhoneBlur}
                                        style={phoneTouched && phoneError ? { 
                                            border: '2px solid #d00', 
                                            background: '#fff6f6' 
                                        } : {}}
                                        className={phoneTouched && phoneError ? 'error-input' : ''}
                                    />
                                    {phoneTouched && phoneError && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {phoneError}
                                        </div>
                                    )}
                                    {serverFieldErrors.phone && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {serverFieldErrors.phone}
                                        </div>
                                    )}
                                    <Form.Text className="text-muted">
                                        Incluya código de área. Ej: +1234567890, (123) 456-7890
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        {serverFieldErrors.status && (
                            <Alert variant="danger" className="d-flex align-items-center">
                                <FaExclamationCircle className="me-2" />
                                <div>{serverFieldErrors.status}</div>
                            </Alert>
                        )}

                        <Form.Group>
                            <Form.Label data-optional>Seleccionar Terapeuta</Form.Label>
                            <Row className="mb-2">
                                <Col md={6}>
                                    <InputGroup>
                                        <InputGroup.Text>
                                            <i className="bi bi-search"></i>
                                        </InputGroup.Text>
                                        <Form.Control
                                            type="text"
                                            placeholder="Buscar terapeuta por nombre..."
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
                                                className={newPatient.doctorIds.includes(doctor.id) ? 'table-primary' : ''}
                                                onClick={() => {
                                                    if (newPatient.doctorIds.includes(doctor.id)) {
                                                        setNewPatient(prev => ({
                                                            ...prev,
                                                            doctorIds: prev.doctorIds.filter((id) => id !== doctor.id)
                                                        }));
                                                    } else {
                                                        setNewPatient(prev => ({
                                                            ...prev,
                                                            doctorIds: [...prev.doctorIds, doctor.id]
                                                        }));
                                                    }
                                                }}
                                            >
                                                <td>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={newPatient.doctorIds.includes(doctor.id)}
                                                        onChange={() => {}}
                                                    />
                                                </td>
                                                <td>{doctor.name}</td>
                                                <td>{doctor.specialty || ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Form.Group>
                        
                        {/* Mensaje de error general */}
                        {formError && (
                            <Alert variant="danger" className="d-flex align-items-center">
                                <FaExclamationCircle className="me-2" />
                                <div style={{ whiteSpace: 'pre-line' }}>{formError}</div>
                            </Alert>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseNew} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving || (firstNameTouched && firstNameError) || (lastNameTouched && lastNameError) || (phoneTouched && phoneError)}
                    >
                        {saving ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...</> : 'Guardar Paciente'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Edición de Paciente (solo Admin) */}
            <Modal show={showEdit} onHide={handleCloseEdit} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Editar Paciente</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <h6 className="mb-3">
                            <i className="bi bi-person-badge me-2"></i>
                            Datos del paciente
                        </h6>
                        <Row className="mb-4">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Nombre</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Nombre del paciente"
                                        value={editPatient.firstName}
                                        maxLength={50}
                                        onChange={handleEditFirstNameChange}
                                        onBlur={handleEditFirstNameBlur}
                                        style={editFirstNameTouched && editFirstNameError ? {
                                            border: '2px solid #d00',
                                            background: '#fff6f6'
                                        } : {}}
                                        className={editFirstNameTouched && editFirstNameError ? 'error-input' : ''}
                                    />
                                    <div className="d-flex justify-content-between">
                                        <div>
                                            {editFirstNameTouched && editFirstNameError && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {editFirstNameError}
                                                </div>
                                            )}
                                            {editServerFieldErrors.firstName && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {editServerFieldErrors.firstName}
                                                </div>
                                            )}
                                        </div>
                                        <Form.Text className="text-muted">
                                            {editPatient.firstName.length}/50 caracteres
                                        </Form.Text>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Apellido</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Apellido del paciente"
                                        value={editPatient.lastName}
                                        maxLength={50}
                                        onChange={handleEditLastNameChange}
                                        onBlur={handleEditLastNameBlur}
                                        style={editLastNameTouched && editLastNameError ? {
                                            border: '2px solid #d00',
                                            background: '#fff6f6'
                                        } : {}}
                                        className={editLastNameTouched && editLastNameError ? 'error-input' : ''}
                                    />
                                    <div className="d-flex justify-content-between">
                                        <div>
                                            {editLastNameTouched && editLastNameError && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {editLastNameError}
                                                </div>
                                            )}
                                            {editServerFieldErrors.lastName && (
                                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                    <FaExclamationCircle className="me-1" /> {editServerFieldErrors.lastName}
                                                </div>
                                            )}
                                        </div>
                                        <Form.Text className="text-muted">
                                            {editPatient.lastName.length}/50 caracteres
                                        </Form.Text>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={6} className="mt-3">
                                <Form.Group>
                                    <Form.Label>Teléfono</Form.Label>
                                    <Form.Control
                                        type="tel"
                                        placeholder="Número de teléfono"
                                        value={editPatient.phone}
                                        maxLength={20}
                                        onChange={handleEditPhoneChange}
                                        onBlur={handleEditPhoneBlur}
                                        style={editPhoneTouched && editPhoneError ? {
                                            border: '2px solid #d00',
                                            background: '#fff6f6'
                                        } : {}}
                                        className={editPhoneTouched && editPhoneError ? 'error-input' : ''}
                                    />
                                    {editPhoneTouched && editPhoneError && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {editPhoneError}
                                        </div>
                                    )}
                                    {editServerFieldErrors.phone && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {editServerFieldErrors.phone}
                                        </div>
                                    )}
                                    <Form.Text className="text-muted">
                                        Incluya código de área. Ej: +1234567890, (123) 456-7890
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                            <Col md={6} className="mt-3">
                                <Form.Group>
                                    <Form.Label>Estado</Form.Label>
                                    <Form.Select
                                        value={editPatient.status}
                                        onChange={(e) => setEditPatient(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        {statuses.length > 0 ? (
                                            statuses.map(status => (
                                                <option key={status} value={status}>
                                                    {status === 'ACTIVE' ? 'Activo' :
                                                     status === 'INACTIVE' ? 'Inactivo' :
                                                     status === 'DISCHARGED' ? 'Dado de alta' :
                                                     status === 'PENDING' ? 'Pendiente' :
                                                     status === 'REFERRED' ? 'Derivado' : status}
                                                </option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="ACTIVE">Activo</option>
                                                <option value="INACTIVE">Inactivo</option>
                                                <option value="DISCHARGED">Dado de alta</option>
                                                <option value="PENDING">Pendiente</option>
                                                <option value="REFERRED">Derivado</option>
                                            </>
                                        )}
                                    </Form.Select>
                                    {editServerFieldErrors.status && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {editServerFieldErrors.status}
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>
                        </Row>

                        <hr />

                        <h6 className="mb-3">
                            <i className="bi bi-people me-2"></i>
                            Terapeutas asignados ({editAssignedDoctors.length})
                        </h6>
                        {editAssignedDoctors.length > 0 ? (
                            <div className="doctors-list mb-4">
                                {editAssignedDoctors.map(doctor => (
                                    <div key={doctor.id} className="doctor-item p-2 mb-2 border rounded">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <span className="fw-medium">{doctor.name}</span>
                                                {doctor.specialty && (
                                                    <div className="mt-1">
                                                        <span className="badge bg-info me-1">{doctor.specialty}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={() => handleRemoveAssignedDoctor(doctor.id)}
                                                title="Quitar terapeuta"
                                                aria-label={`Quitar a ${doctor.name}`}
                                            >
                                                <FaTimes aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted mb-4">
                                No hay terapeutas asignados actualmente.
                            </div>
                        )}

                        <hr />

                        <h6 className="mb-3">
                            <i className="bi bi-plus-circle me-2"></i>
                            Agregar nuevos terapeutas
                        </h6>
                        <Row className="mb-2">
                            <Col md={6}>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar terapeuta por nombre..."
                                        value={editDoctorSearchTerm}
                                        onChange={e => {
                                            setEditDoctorSearchTerm(e.target.value);
                                            setDoctorSearchTerm(e.target.value);
                                        }}
                                    />
                                </InputGroup>
                            </Col>
                            <Col md={6}>
                                <Form.Select
                                    value={editDoctorSpecialty}
                                    onChange={e => {
                                        setEditDoctorSpecialty(e.target.value);
                                        setDoctorSpecialty(e.target.value);
                                    }}
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
                        <div className="doctors-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <Table striped bordered hover size="sm">
                                <thead>
                                    <tr>
                                        <th>Seleccionar</th>
                                        <th>Nombre</th>
                                        <th>Especialidades</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {doctors
                                        .filter(doctor => !editAssignedDoctors.some(d => d.id === doctor.id))
                                        .map(doctor => (
                                            <tr
                                                key={doctor.id}
                                                className={editDoctorsToAdd.includes(doctor.id) ? 'table-primary' : ''}
                                                onClick={() => toggleDoctorToAdd(doctor.id)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={editDoctorsToAdd.includes(doctor.id)}
                                                        onChange={() => {}}
                                                    />
                                                </td>
                                                <td>{doctor.name}</td>
                                                <td>{doctor.specialty || ''}</td>
                                            </tr>
                                        ))}
                                    {doctors.filter(doctor => !editAssignedDoctors.some(d => d.id === doctor.id)).length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="text-center text-muted">
                                                No hay terapeutas disponibles para agregar
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>

                        {editDoctorsToAdd.length > 0 && (
                            <div className="mt-2">
                                <small className="text-info">
                                    {editDoctorsToAdd.length} terapeuta{editDoctorsToAdd.length > 1 ? 's' : ''} seleccionado{editDoctorsToAdd.length > 1 ? 's' : ''} para agregar
                                </small>
                            </div>
                        )}

                        {editFormError && (
                            <Alert variant="danger" className="d-flex align-items-center mt-3">
                                <FaExclamationCircle className="me-2" />
                                <div style={{ whiteSpace: 'pre-line' }}>{editFormError}</div>
                            </Alert>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={handleCloseEdit}
                        disabled={editSaving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleEditSave}
                        disabled={editSaving || (editFirstNameTouched && editFirstNameError) || (editLastNameTouched && editLastNameError) || (editPhoneTouched && editPhoneError)}
                    >
                        {editSaving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Guardando...
                            </>
                        ) : (
                            'Guardar Cambios'
                        )}
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