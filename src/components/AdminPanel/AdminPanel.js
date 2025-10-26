import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Tabs, Tab, Table, Button, Modal, Form, Alert, OverlayTrigger, Tooltip, InputGroup, Row, Col, Card } from 'react-bootstrap';
import { FaTrash, FaEdit, FaPlus, FaUserPlus, FaExclamationCircle } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import api, { createLocation, deleteLocation, getLocations, updateLocation } from '../../api/api';
import './AdminPanel.css';

const AdminPanel = () => {
    const { isAdmin } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [specialties, setSpecialties] = useState([]);
    const [setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showUserModal, setShowUserModal] = useState(false);
    const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedSpecialty, setSelectedSpecialty] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        specialties: [],
        roles: ['DOCTOR']
    });
    const [specialtyFormData, setSpecialtyFormData] = useState({
        name: '',
        data: ''
    });
    // Estado para la paginación
    const [pagination, setPagination] = useState({
        currentPage: 0,
        totalPages: 0,
        totalElements: 0,
        pageSize: 10
    });
    // Estado para el dropdown de especialidades
    const [showSpecialtiesDropdown, setShowSpecialtiesDropdown] = useState(false);
    const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');
    // Estados para filtros
    const [filterEmail, setFilterEmail] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterSpecialties, setFilterSpecialties] = useState([]);
    // Estado para el modal de confirmación
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [onConfirm, setOnConfirm] = useState(() => () => {});

    // Estados de validación de formulario para usuarios
    const [userFormErrors, setUserFormErrors] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: ''
    });
    const [userFieldsTouched, setUserFieldsTouched] = useState({
        firstName: false,
        lastName: false,
        email: false,
        phone: false,
        password: false
    });
    const [userFormError, setUserFormError] = useState('');

    // Estados de validación de formulario para especialidades
    const [specialtyFormErrors, setSpecialtyFormErrors] = useState({
        name: '',
        data: ''
    });
    const [specialtyFieldsTouched, setSpecialtyFieldsTouched] = useState({
        name: false,
        data: false
    });
    const [specialtyFormError, setSpecialtyFormError] = useState('');

    const [locations, setLocations] = useState([]);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [locationFormData, setLocationFormData] = useState({ name: '' });
    const [locationFormErrors, setLocationFormErrors] = useState({ name: '' });
    const [locationFieldsTouched, setLocationFieldsTouched] = useState({ name: false });
    const [locationFormError, setLocationFormError] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);

    const fetchUsers = useCallback(async (page = 0, filters = {}) => {
        try {
            const params = {
                page,
                size: pagination.pageSize,
                ...filters
            };
            // specialties debe ser array de strings
            if (filters.specialties && filters.specialties.length > 0) {
                params.specialties = filters.specialties;
            }
            const query = new URLSearchParams();
            if (params.email) query.append('email', params.email);
            if (params.name) query.append('name', params.name);
            if (params.specialties && params.specialties.length > 0) {
                params.specialties.forEach(s => query.append('specialties', s));
            }
            query.append('page', params.page);
            query.append('size', params.size);
            const response = await api.get(`/api/users?${query.toString()}`);
            const usersData = response.data.content || [];
            setUsers(usersData);
            setPagination({
                currentPage: response.data.number,
                totalPages: response.data.totalPages,
                totalElements: response.data.totalElements,
                pageSize: response.data.size
            });
        } catch (err) {
            setError('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    }, [pagination.pageSize, setLoading]);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers(0, {
                email: filterEmail,
                name: filterName,
                specialties: filterSpecialties
            });
            fetchSpecialties();
            fetchLocations();
        }
    }, [isAdmin, fetchUsers, filterEmail, filterName, filterSpecialties]);

    const fetchLocations = async () => {
        try {
            const response = await api.get('/api/locations');
            setLocations(response.data);
        } catch (err) {
            setError('Error al cargar ubicaciones');
        }
    };

    const fetchSpecialties = async () => {
        try {
            const response = await api.get('/api/specialties');
            setSpecialties(response.data);
        } catch (err) {
            setError('Error al cargar especialidades');
        }
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        
        // Limpiar errores previos
        setUserFormError('');
        
        // Marcar todos los campos como touched
        const fieldsToValidate = ['firstName', 'lastName', 'email', 'phone'];
        if (!selectedUser) fieldsToValidate.push('password');
        
        const touchedFields = {};
        fieldsToValidate.forEach(field => {
            touchedFields[field] = true;
        });
        setUserFieldsTouched(prev => ({ ...prev, ...touchedFields }));
        
        // Validar todos los campos
        const errors = {};
        errors.firstName = validateFirstName(formData.firstName);
        errors.lastName = validateLastName(formData.lastName);
        errors.email = validateEmail(formData.email);
        errors.phone = validatePhone(formData.phone);
        if (!selectedUser) {
            errors.password = validatePassword(formData.password);
        }
        
        setUserFormErrors(errors);
        
        // Verificar si hay errores
        const hasErrors = Object.values(errors).some(error => error !== '');
        if (hasErrors) {
            setUserFormError('Por favor, corrige los errores antes de continuar.');
            return;
        }

        try {
            const payload = {
                email: formData.email,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                specialties: formData.specialties,
                roles: formData.roles
            };
            
            if (!selectedUser) {
                payload.password = formData.password;
            }
            
            if (selectedUser) {
                await api.put(`/api/users/${selectedUser.id}`, payload);
            } else {
                await api.post('/api/users', payload);
            }
            setShowUserModal(false);
            fetchUsers(0);
            resetForm();
        } catch (err) {
            console.error('Error al guardar usuario:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Error al guardar usuario';
            setUserFormError(errorMessage);
        }
    };

    const handleSpecialtySubmit = async (e) => {
        e.preventDefault();
        
        // Limpiar errores previos
        setSpecialtyFormError('');
        
        // Marcar todos los campos como touched
        setSpecialtyFieldsTouched({
            name: true,
            data: true
        });
        
        // Validar todos los campos
        const errors = {};
        errors.name = validateSpecialtyName(specialtyFormData.name);
        errors.data = validateSpecialtyData(specialtyFormData.data);
        
        setSpecialtyFormErrors(errors);
        
        // Verificar si hay errores
        const hasErrors = Object.values(errors).some(error => error !== '');
        if (hasErrors) {
            setSpecialtyFormError('Por favor, corrige los errores antes de continuar.');
            return;
        }

        try {
            if (selectedSpecialty) {
                // Editar especialidad existente
                await api.put(`/api/specialties/${selectedSpecialty.id}`, { 
                    name: specialtyFormData.name, 
                    data: specialtyFormData.data 
                });
            } else {
                // Crear especialidad
                await api.post('/api/specialties', {
                    name: specialtyFormData.name,
                    data: specialtyFormData.data
                });
            }
            setShowSpecialtyModal(false);
            fetchSpecialties(); // Recargar especialidades después de crear
            resetSpecialtyForm();
        } catch (err) {
            console.error('Error al guardar especialidad:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Error al guardar especialidad';
            setSpecialtyFormError(errorMessage);
        }
    };

    const handleLocationSubmit = async (e) => {
        e.preventDefault();
        setLocationFormError('');
        setLocationFieldsTouched({ name: true });

        const errors = { name: validateLocationName(locationFormData.name) };
        setLocationFormErrors(errors);

        if (errors.name) {
            setLocationFormError('Por favor, corrige los errores antes de continuar.');
            return;
        }

        try {
            if (selectedLocation) {
                await updateLocation(selectedLocation.id, { name: locationFormData.name });
            } else {
                await createLocation({ name: locationFormData.name });
            }
            setShowLocationModal(false);
            fetchLocations();
            resetLocationForm();
        } catch (err) {
            console.error('Error al guardar ubicación:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Error al guardar ubicación';
            setLocationFormError(errorMessage);
        }
    };

    // Nueva función para mostrar el modal de confirmación
    const showConfirmation = (message, onConfirmAction) => {
        setConfirmMessage(message);
        setOnConfirm(() => onConfirmAction);
        setShowConfirmModal(true);
    };

    const handleDeleteUser = async (userId) => {
        showConfirmation('¿Estás seguro de que deseas eliminar este usuario?', async () => {
            try {
                await api.delete(`/api/users/${userId}`);
                fetchUsers(0);
            } catch (err) {
                setError('Error al eliminar usuario');
            }
        });
    };

    const handleDeleteSpecialty = async (specialtyNameOrObj) => {
        // specialtyNameOrObj puede ser el objeto de especialidad
        const specialty = typeof specialtyNameOrObj === 'object' ? specialtyNameOrObj : specialties.find(s => s.name === specialtyNameOrObj);
        if (!specialty || !specialty.id) return;
        showConfirmation('¿Estás seguro de que deseas eliminar esta especialidad?', async () => {
            try {
                await api.delete(`/api/specialties/${specialty.id}`);
                fetchSpecialties();
            } catch (err) {
                setError('Error al eliminar especialidad');
            }
        });
    };

    const handleDeleteLocation = async (locationId) => {
        showConfirmation('¿Estás seguro de que deseas eliminar esta ubicación? Se borrarán todos los horarios asociados a esta ubicación.', async () => {
            try {
                await deleteLocation(locationId);
                fetchLocations();
            } catch (err) {
                setError('Error al eliminar ubicación');
            }
        });
    };

    const handleAssignSpecialty = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/users/${selectedUser.id}/specialties/${selectedSpecialty.id}`);
            setShowAssignModal(false);
            fetchUsers(0);
        } catch (err) {
            setError('Error al asignar especialidad');
        }
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            phone: '',
            specialties: [],
            roles: ['DOCTOR']
        });
        setSelectedUser(null);
        clearUserFormErrors();
    };

    const resetSpecialtyForm = () => {
        setSpecialtyFormData({
            name: '',
            data: ''
        });
        setSelectedSpecialty(null);
        clearSpecialtyFormErrors();
    };

    const resetLocationForm = () => {
        setLocationFormData({ name: '' });
        setLocationFormErrors({ name: '' });
        setLocationFieldsTouched({ name: false });
        setLocationFormError('');
    };

    // Funciones para cerrar modales con limpieza de errores
    const handleCloseUserModal = () => {
        setShowUserModal(false);
        resetForm();
    };

    const handleCloseSpecialtyModal = () => {
        setShowSpecialtyModal(false);
        resetSpecialtyForm();
    };

    const handleCloseLocationModal = () => {
        setShowLocationModal(false);
        resetLocationForm();
    };

    const handlePageChange = (page) => {
        fetchUsers(page - 1); // La API usa 0-based indexing
    };

    // Funciones de validación para usuarios
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

    const validateEmail = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El email es obligatorio.';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Ingrese un email válido.';
        }
        if (value.length > 100) {
            return 'El email no puede exceder 100 caracteres.';
        }
        return '';
    };

    const validatePhone = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El teléfono es obligatorio.';
        }
        const phoneRegex = /^[\d\s\-\(\)\+]{7,20}$/;
        if (!phoneRegex.test(value.trim())) {
            return 'Ingrese un número de teléfono válido (7-20 dígitos).';
        }
        return '';
    };

    const validatePassword = (value) => {
        if (!selectedUser) { // Solo validar contraseña para usuarios nuevos
            if (!value || value.trim().length === 0) {
                return 'La contraseña es obligatoria.';
            }
            if (value.length < 6) {
                return 'La contraseña debe tener al menos 6 caracteres.';
            }
            if (value.length > 50) {
                return 'La contraseña no puede exceder 50 caracteres.';
            }
        }
        return '';
    };

    // Funciones de validación para especialidades
    const validateSpecialtyName = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El nombre de la especialidad es obligatorio.';
        }
        if (value.trim().length < 2) {
            return 'El nombre debe tener al menos 2 caracteres.';
        }
        if (value.length > 100) {
            return 'El nombre no puede exceder 100 caracteres.';
        }
        return '';
    };

    const validateSpecialtyData = (value) => {
        if (value && value.length > 500) {
            return 'La descripción no puede exceder 500 caracteres.';
        }
        return '';
    };

    const validateLocationName = (value) => {
        if (!value || value.trim().length === 0) {
            return 'El nombre de la ubicación es obligatorio.';
        }
        if (value.trim().length < 2) {
            return 'El nombre debe tener al menos 2 caracteres.';
        }
        if (value.length > 100) {
            return 'El nombre no puede exceder 100 caracteres.';
        }
        return '';
    };

    // Manejadores de cambio con validación en tiempo real para usuarios
    const handleUserFieldChange = (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        
        if (userFieldsTouched[fieldName]) {
            let error = '';
            switch (fieldName) {
                case 'firstName':
                    error = validateFirstName(value);
                    break;
                case 'lastName':
                    error = validateLastName(value);
                    break;
                case 'email':
                    error = validateEmail(value);
                    break;
                case 'phone':
                    error = validatePhone(value);
                    break;
                case 'password':
                    error = validatePassword(value);
                    break;
                default:
                    break;
            }
            setUserFormErrors(prev => ({ ...prev, [fieldName]: error }));
        }
        
        if (userFormError) setUserFormError('');
    };

    // Manejadores de blur para usuarios
    const handleUserFieldBlur = (fieldName) => {
        setUserFieldsTouched(prev => ({ ...prev, [fieldName]: true }));
        
        let error = '';
        const value = formData[fieldName];
        switch (fieldName) {
            case 'firstName':
                error = validateFirstName(value);
                break;
            case 'lastName':
                error = validateLastName(value);
                break;
            case 'email':
                error = validateEmail(value);
                break;
            case 'phone':
                error = validatePhone(value);
                break;
            case 'password':
                error = validatePassword(value);
                break;
            default:
                break;
        }
        setUserFormErrors(prev => ({ ...prev, [fieldName]: error }));
    };

    // Manejadores de cambio para especialidades
    const handleSpecialtyFieldChange = (fieldName, value) => {
        setSpecialtyFormData(prev => ({ ...prev, [fieldName]: value }));
        
        if (specialtyFieldsTouched[fieldName]) {
            let error = '';
            switch (fieldName) {
                case 'name':
                    error = validateSpecialtyName(value);
                    break;
                case 'data':
                    error = validateSpecialtyData(value);
                    break;
                default:
                    break;
            }
            setSpecialtyFormErrors(prev => ({ ...prev, [fieldName]: error }));
        }
        
        if (specialtyFormError) setSpecialtyFormError('');
    };

    // Manejadores de blur para especialidades
    const handleSpecialtyFieldBlur = (fieldName) => {
        setSpecialtyFieldsTouched(prev => ({ ...prev, [fieldName]: true }));
        
        let error = '';
        const value = specialtyFormData[fieldName];
        switch (fieldName) {
            case 'name':
                error = validateSpecialtyName(value);
                break;
            case 'data':
                error = validateSpecialtyData(value);
                break;
            default:
                break;
        }
        setSpecialtyFormErrors(prev => ({ ...prev, [fieldName]: error }));
    };

    // Funciones para limpiar errores
    const clearUserFormErrors = () => {
        setUserFormErrors({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            password: ''
        });
        setUserFieldsTouched({
            firstName: false,
            lastName: false,
            email: false,
            phone: false,
            password: false
        });
        setUserFormError('');
    };

    const clearSpecialtyFormErrors = () => {
        setSpecialtyFormErrors({
            name: '',
            data: ''
        });
        setSpecialtyFieldsTouched({
            name: false,
            data: false
        });
        setSpecialtyFormError('');
    };

    if (!isAdmin) {
        return <Alert variant="danger">No tienes permisos para acceder a esta página.</Alert>;
    }

    return (
        <Container className="admin-panel mt-4">
            <h2>Panel de Administración</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Tabs defaultActiveKey="users" className="mb-3">
                <Tab eventKey="users" title="Usuarios">
                    <Card>
                        <Card.Body>
                            <Button 
                                variant="primary" 
                                className="mb-3"
                                onClick={() => {
                                    resetForm();
                                    setShowUserModal(true);
                                }}
                            >
                                <FaPlus /> Nuevo Usuario
                            </Button>
                            
                            <Form className="mb-3">
                                <Row className="align-items-end">
                                    <Col md={3}>
                                        <InputGroup>
                                            <InputGroup.Text>
                                                <i className="bi bi-search"></i>
                                            </InputGroup.Text>
                                            <Form.Control
                                                type="text"
                                                placeholder="Buscar por nombre..."
                                                value={filterName}
                                                onChange={e => {
                                                    setFilterName(e.target.value);
                                                    fetchUsers(0, {
                                                        email: filterEmail,
                                                        name: e.target.value,
                                                        specialties: filterSpecialties
                                                    });
                                                }}
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
                                                placeholder="Buscar por email..."
                                                value={filterEmail}
                                                onChange={e => {
                                                    setFilterEmail(e.target.value);
                                                    fetchUsers(0, {
                                                        email: e.target.value,
                                                        name: filterName,
                                                        specialties: filterSpecialties
                                                    });
                                                }}
                                            />
                                        </InputGroup>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Select
                                            value={filterSpecialties[0] || ''}
                                            onChange={e => {
                                                const value = e.target.value;
                                                setFilterSpecialties(value ? [value] : []);
                                                fetchUsers(0, {
                                                    email: filterEmail,
                                                    name: filterName,
                                                    specialties: value ? [value] : []
                                                });
                                            }}
                                        >
                                            <option value="">Todas las especialidades</option>
                                            {specialties.map(spec => (
                                                <option key={spec.id} value={spec.name}>{spec.name}</option>
                                            ))}
                                        </Form.Select>
                                    </Col>
                                </Row>
                            </Form>
                            
                            <Table striped bordered hover>
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Teléfono</th>
                                        <th>Especialidades</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.phone}</td>
                                            <td>{user.specialties?.join(', ') || 'Ninguna'}</td>
                                            <td>
                                                                                 <OverlayTrigger placement="top" overlay={<Tooltip>Editar usuario</Tooltip>}>
                                                 <Button 
                                                     variant="outline-warning" 
                                                     size="sm" 
                                                     className="me-2"
                                                     onClick={() => {
                                                         setSelectedUser(user);
                                                         setFormData({
                                                             firstName: user.firstName || '',
                                                             lastName: user.lastName || '',
                                                             email: user.email,
                                                             phone: user.phone,
                                                             specialties: user.specialties || [],
                                                             roles: Array.isArray(user.roles) ? user.roles : [user.role || 'DOCTOR'],
                                                             password: ''
                                                         });
                                                         setShowUserModal(true);
                                                     }}
                                                 >
                                                     <FaEdit />
                                                 </Button>
                                             </OverlayTrigger>
                                                                                 <OverlayTrigger placement="top" overlay={<Tooltip>Asignar especialidad</Tooltip>}>
                                                <Button 
                                                    variant="outline-success" 
                                                    size="sm" 
                                                    className="me-2"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowAssignModal(true);
                                                    }}
                                                >
                                                    <FaUserPlus />
                                                </Button>
                                            </OverlayTrigger>
                                            <OverlayTrigger placement="top" overlay={<Tooltip>Eliminar usuario</Tooltip>}>
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    <FaTrash />
                                                </Button>
                                            </OverlayTrigger>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        {/* Tarjetas móviles para usuarios */}
                        <div className="users-mobile-cards">
                            {users.map(user => (
                                <div key={user.id} className="user-mobile-card">
                                    <h6>{user.name}</h6>
                                    <div className="mobile-card-row">
                                        <span className="mobile-card-label">Email:</span>
                                        <span className="mobile-card-value">{user.email}</span>
                                    </div>
                                    <div className="mobile-card-row">
                                        <span className="mobile-card-label">Teléfono:</span>
                                        <span className="mobile-card-value">{user.phone}</span>
                                    </div>
                                    <div className="mobile-card-row">
                                        <span className="mobile-card-label">Especialidades:</span>
                                        <span className="mobile-card-value">{user.specialties?.join(', ') || 'Ninguna'}</span>
                                    </div>
                                                                 <div className="mobile-card-actions">
                                     <Button 
                                         variant="outline-warning" 
                                         size="sm"
                                         onClick={() => {
                                             setSelectedUser(user);
                                             setFormData({
                                                 firstName: user.firstName || '',
                                                 lastName: user.lastName || '',
                                                 email: user.email,
                                                 phone: user.phone,
                                                 specialties: user.specialties || [],
                                                 roles: Array.isArray(user.roles) ? user.roles : [user.role || 'DOCTOR'],
                                                 password: ''
                                             });
                                             setShowUserModal(true);
                                         }}
                                         title="Editar usuario"
                                     >
                                         <FaEdit />
                                     </Button>
                                    <Button 
                                        variant="outline-success" 
                                        size="sm"
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setShowAssignModal(true);
                                        }}
                                        title="Asignar especialidad"
                                    >
                                        <FaUserPlus />
                                    </Button>
                                    <Button 
                                        variant="outline-danger" 
                                        size="sm"
                                        onClick={() => handleDeleteUser(user.id)}
                                        title="Eliminar usuario"
                                    >
                                        <FaTrash />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Paginación custom igual a pacientes */}
                    <div className="d-flex justify-content-center align-items-center my-4 gap-2">
                        <Button 
                            variant="outline-secondary" 
                            onClick={() => handlePageChange(pagination.currentPage)}
                            disabled={pagination.currentPage === 0}
                        >
                            Anterior
                        </Button>
                        {/* Primera página */}
                        <Button
                            variant={pagination.currentPage === 0 ? 'primary' : 'outline-primary'}
                            onClick={() => handlePageChange(1)}
                        >
                            1
                        </Button>
                        {/* Puntos suspensivos iniciales si es necesario */}
                        {pagination.currentPage > 2 && (
                            <span className="mx-2">...</span>
                        )}
                        {/* Páginas alrededor de la actual */}
                        {Array.from({ length: pagination.totalPages }, (_, i) => {
                            if (i === 0 || i === pagination.totalPages - 1) return null;
                            if (Math.abs(pagination.currentPage - i) <= 1) {
                                return (
                                    <Button
                                        key={i}
                                        variant={pagination.currentPage === i ? 'primary' : 'outline-primary'}
                                        onClick={() => handlePageChange(i + 1)}
                                    >
                                        {i + 1}
                                    </Button>
                                );
                            }
                            return null;
                        })}
                        {/* Puntos suspensivos finales si es necesario */}
                        {pagination.currentPage < pagination.totalPages - 3 && (
                            <span className="mx-2">...</span>
                        )}
                        {/* Última página */}
                        {pagination.totalPages > 1 && (
                            <Button
                                variant={pagination.currentPage === pagination.totalPages - 1 ? 'primary' : 'outline-primary'}
                                onClick={() => handlePageChange(pagination.totalPages)}
                            >
                                {pagination.totalPages}
                            </Button>
                        )}
                        <Button 
                            variant="outline-secondary" 
                            onClick={() => handlePageChange(pagination.currentPage + 2)}
                            disabled={pagination.currentPage === pagination.totalPages - 1}
                        >
                            Siguiente
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        </Tab>

        <Tab eventKey="specialties" title="Especialidades">
            <Card>
                <Card.Body>
                    <Button 
                        variant="primary" 
                        className="mb-3"
                        onClick={() => {
                            resetSpecialtyForm();
                            setShowSpecialtyModal(true);
                        }}
                    >
                        <FaPlus /> Nueva Especialidad
                    </Button>
                    
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {specialties.map(specialty => (
                                <tr key={specialty.id}>
                                    <td>{specialty.name}</td>
                                    <td>
                                                                                 <OverlayTrigger placement="top" overlay={<Tooltip>Editar especialidad</Tooltip>}>
                                             <Button 
                                                 variant="outline-warning" 
                                                 size="sm" 
                                                 className="me-2"
                                                 onClick={() => {
                                                     setSelectedSpecialty(specialty);
                                                     setSpecialtyFormData({
                                                         name: specialty.name,
                                                         data: specialty.data || ''
                                                     });
                                                     setShowSpecialtyModal(true);
                                                 }}
                                             >
                                                 <FaEdit />
                                             </Button>
                                         </OverlayTrigger>
                                        <OverlayTrigger placement="top" overlay={<Tooltip>Eliminar especialidad</Tooltip>}>
                                            <Button 
                                                variant="outline-danger" 
                                                size="sm"
                                                onClick={() => handleDeleteSpecialty(specialty)}
                                            >
                                                <FaTrash />
                                            </Button>
                                        </OverlayTrigger>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Tab>

        <Tab eventKey="locations" title="Ubicaciones">
            <Card>
                <Card.Body>
                    <Button
                        variant="primary"
                        className="mb-3"
                        onClick={() => {
                            resetLocationForm();
                            setShowLocationModal(true);
                        }}
                    >
                        <FaPlus /> Nueva Ubicación
                    </Button>

                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.map(location => (
                                <tr key={location.id}>
                                    <td>{location.name}</td>
                                    <td>
                                                                                 <OverlayTrigger placement="top" overlay={<Tooltip>Editar ubicación</Tooltip>}>
                                             <Button
                                                 variant="outline-warning"
                                                 size="sm"
                                                 className="me-2"
                                                 onClick={() => {
                                                     setSelectedLocation(location);
                                                     setLocationFormData({ name: location.name });
                                                     setShowLocationModal(true);
                                                 }}
                                             >
                                                 <FaEdit />
                                             </Button>
                                         </OverlayTrigger>
                                        <OverlayTrigger placement="top" overlay={<Tooltip>Eliminar ubicación</Tooltip>}>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleDeleteLocation(location.id)}
                                            >
                                                <FaTrash />
                                            </Button>
                                        </OverlayTrigger>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Tab>
    </Tabs>

            {/* Modal para crear/editar usuario */}
            <Modal show={showUserModal} onHide={handleCloseUserModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleUserSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nombre del usuario"
                                value={formData.firstName}
                                maxLength={50}
                                onChange={(e) => handleUserFieldChange('firstName', e.target.value)}
                                onBlur={(e) => handleUserFieldBlur('firstName')}
                                style={userFieldsTouched.firstName && userFormErrors.firstName ? { 
                                    border: '2px solid #d00', 
                                    background: '#fff6f6' 
                                } : {}}
                                className={userFieldsTouched.firstName && userFormErrors.firstName ? 'error-input' : ''}
                            />
                            <div className="d-flex justify-content-between">
                                <div>
                                    {userFieldsTouched.firstName && userFormErrors.firstName && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {userFormErrors.firstName}
                                        </div>
                                    )}
                                </div>
                                <Form.Text className="text-muted">
                                    {formData.firstName.length}/50 caracteres
                                </Form.Text>
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Apellido</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Apellido del usuario"
                                value={formData.lastName}
                                maxLength={50}
                                onChange={(e) => handleUserFieldChange('lastName', e.target.value)}
                                onBlur={(e) => handleUserFieldBlur('lastName')}
                                style={userFieldsTouched.lastName && userFormErrors.lastName ? { 
                                    border: '2px solid #d00', 
                                    background: '#fff6f6' 
                                } : {}}
                                className={userFieldsTouched.lastName && userFormErrors.lastName ? 'error-input' : ''}
                            />
                            <div className="d-flex justify-content-between">
                                <div>
                                    {userFieldsTouched.lastName && userFormErrors.lastName && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {userFormErrors.lastName}
                                        </div>
                                    )}
                                </div>
                                <Form.Text className="text-muted">
                                    {formData.lastName.length}/50 caracteres
                                </Form.Text>
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={formData.email}
                                maxLength={100}
                                onChange={(e) => handleUserFieldChange('email', e.target.value)}
                                onBlur={(e) => handleUserFieldBlur('email')}
                                style={userFieldsTouched.email && userFormErrors.email ? { 
                                    border: '2px solid #d00', 
                                    background: '#fff6f6' 
                                } : {}}
                                className={userFieldsTouched.email && userFormErrors.email ? 'error-input' : ''}
                            />
                            <div className="d-flex justify-content-between">
                                <div>
                                    {userFieldsTouched.email && userFormErrors.email && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {userFormErrors.email}
                                        </div>
                                    )}
                                </div>
                                <Form.Text className="text-muted">
                                    {formData.email.length}/100 caracteres
                                </Form.Text>
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Teléfono</Form.Label>
                            <Form.Control
                                type="tel"
                                placeholder="Número de teléfono"
                                value={formData.phone}
                                maxLength={20}
                                onChange={(e) => handleUserFieldChange('phone', e.target.value)}
                                onBlur={(e) => handleUserFieldBlur('phone')}
                                style={userFieldsTouched.phone && userFormErrors.phone ? { 
                                    border: '2px solid #d00', 
                                    background: '#fff6f6' 
                                } : {}}
                                className={userFieldsTouched.phone && userFormErrors.phone ? 'error-input' : ''}
                            />
                            {userFieldsTouched.phone && userFormErrors.phone && (
                                <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                    <FaExclamationCircle className="me-1" /> {userFormErrors.phone}
                                </div>
                            )}
                            <Form.Text className="text-muted">
                                Incluya código de área. Ej: +1234567890, (123) 456-7890
                            </Form.Text>
                        </Form.Group>
                        {!selectedUser && (
                            <Form.Group className="mb-3">
                                <Form.Label>Contraseña</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Contraseña (mínimo 6 caracteres)"
                                    value={formData.password}
                                    maxLength={50}
                                    onChange={(e) => handleUserFieldChange('password', e.target.value)}
                                    onBlur={(e) => handleUserFieldBlur('password')}
                                    style={userFieldsTouched.password && userFormErrors.password ? { 
                                        border: '2px solid #d00', 
                                        background: '#fff6f6' 
                                    } : {}}
                                    className={userFieldsTouched.password && userFormErrors.password ? 'error-input' : ''}
                                />
                                <div className="d-flex justify-content-between">
                                    <div>
                                        {userFieldsTouched.password && userFormErrors.password && (
                                            <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                                <FaExclamationCircle className="me-1" /> {userFormErrors.password}
                                            </div>
                                        )}
                                    </div>
                                    <Form.Text className="text-muted">
                                        {formData.password.length}/50 caracteres
                                    </Form.Text>
                                </div>
                            </Form.Group>
                        )}
                        <Form.Group className="mb-3">
                            <Form.Label>Especialidades</Form.Label>
                            <div className="specialties-select-container">
                                <div 
                                    className="specialties-select-trigger"
                                    onClick={() => setShowSpecialtiesDropdown(!showSpecialtiesDropdown)}
                                >
                                    <div className="selected-specialties">
                                        {formData.specialties.length === 0
                                            ? 'Todas las especialidades'
                                            : formData.specialties.join(', ')}
                                    </div>
                                    <div className="specialties-arrow">
                                        {showSpecialtiesDropdown ? '▲' : '▼'}
                                    </div>
                                </div>
                                {showSpecialtiesDropdown && (
                                    <div className="specialties-dropdown">
                                        <InputGroup className="mb-2">
                                            <Form.Control
                                                type="text"
                                                placeholder="Buscar especialidad..."
                                                value={specialtySearchTerm}
                                                onChange={e => setSpecialtySearchTerm(e.target.value)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </InputGroup>
                                        <div className="specialties-list">
                                            {specialties
                                                .filter(spec => spec.name.toLowerCase().includes(specialtySearchTerm.toLowerCase()))
                                                .map(spec => (
                                                    <div
                                                        key={spec.id}
                                                        className={`specialty-item${formData.specialties.includes(spec.name) ? ' selected' : ''}`}
                                                        onClick={() => {
                                                            if (formData.specialties.includes(spec.name)) {
                                                                setFormData({
                                                                    ...formData,
                                                                    specialties: formData.specialties.filter(s => s !== spec.name)
                                                                });
                                                            } else {
                                                                setFormData({
                                                                    ...formData,
                                                                    specialties: [...formData.specialties, spec.name]
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.specialties.includes(spec.name)}
                                                            readOnly
                                                            style={{ marginRight: 8 }}
                                                        />
                                                        <span>{spec.name}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Rol</Form.Label>
                            <Form.Select
                                value={formData.roles[0]}
                                onChange={(e) => setFormData({...formData, roles: [e.target.value]})}
                            >
                                <option value="DOCTOR">Terapeuta</option>
                                <option value="ADMINISTRATOR">Administrador</option>
                            </Form.Select>
                        </Form.Group>
                        
                        {/* Mensaje de error general */}
                        {userFormError && (
                            <Alert variant="danger" className="d-flex align-items-center mb-3">
                                <FaExclamationCircle className="me-2" />
                                <div style={{ whiteSpace: 'pre-line' }}>{userFormError}</div>
                            </Alert>
                        )}
                        
                        <div className="d-flex gap-2">
                            <Button variant="secondary" onClick={handleCloseUserModal}>
                                Cancelar
                            </Button>
                            <Button 
                                variant="primary" 
                                type="submit"
                                disabled={
                                    Object.values(userFormErrors).some(error => error !== '') && 
                                    Object.values(userFieldsTouched).some(touched => touched)
                                }
                            >
                                {selectedUser ? 'Guardar Cambios' : 'Crear Usuario'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Modal para crear/editar especialidad */}
            <Modal show={showSpecialtyModal} onHide={handleCloseSpecialtyModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{selectedSpecialty ? 'Editar Especialidad' : 'Nueva Especialidad'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSpecialtySubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nombre de la especialidad"
                                value={specialtyFormData.name}
                                maxLength={100}
                                onChange={(e) => handleSpecialtyFieldChange('name', e.target.value)}
                                onBlur={(e) => handleSpecialtyFieldBlur('name')}
                                style={specialtyFieldsTouched.name && specialtyFormErrors.name ? { 
                                    border: '2px solid #d00', 
                                    background: '#fff6f6' 
                                } : {}}
                                className={specialtyFieldsTouched.name && specialtyFormErrors.name ? 'error-input' : ''}
                            />
                            <div className="d-flex justify-content-between">
                                <div>
                                    {specialtyFieldsTouched.name && specialtyFormErrors.name && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {specialtyFormErrors.name}
                                        </div>
                                    )}
                                </div>
                                <Form.Text className="text-muted">
                                    {specialtyFormData.name.length}/100 caracteres
                                </Form.Text>
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label data-optional>Descripción</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Descripción de la especialidad (opcional)"
                                value={specialtyFormData.data}
                                maxLength={500}
                                onChange={(e) => handleSpecialtyFieldChange('data', e.target.value)}
                                onBlur={(e) => handleSpecialtyFieldBlur('data')}
                                style={specialtyFieldsTouched.data && specialtyFormErrors.data ? { 
                                    border: '2px solid #d00', 
                                    background: '#fff6f6' 
                                } : {}}
                                className={specialtyFieldsTouched.data && specialtyFormErrors.data ? 'error-input' : ''}
                            />
                            <div className="d-flex justify-content-between">
                                <div>
                                    {specialtyFieldsTouched.data && specialtyFormErrors.data && (
                                        <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.875rem' }}>
                                            <FaExclamationCircle className="me-1" /> {specialtyFormErrors.data}
                                        </div>
                                    )}
                                </div>
                                <Form.Text className="text-muted">
                                    {specialtyFormData.data.length}/500 caracteres
                                </Form.Text>
                            </div>
                        </Form.Group>
                        
                        {/* Mensaje de error general */}
                        {specialtyFormError && (
                            <Alert variant="danger" className="d-flex align-items-center mb-3">
                                <FaExclamationCircle className="me-2" />
                                <div style={{ whiteSpace: 'pre-line' }}>{specialtyFormError}</div>
                            </Alert>
                        )}
                        
                        <div className="d-flex gap-2">
                            <Button variant="secondary" onClick={handleCloseSpecialtyModal}>
                                Cancelar
                            </Button>
                            <Button 
                                variant="primary" 
                                type="submit"
                                disabled={
                                    Object.values(specialtyFormErrors).some(error => error !== '') && 
                                    Object.values(specialtyFieldsTouched).some(touched => touched)
                                }
                            >
                                {selectedSpecialty ? 'Guardar Cambios' : 'Crear Especialidad'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Modal para asignar especialidad */}
            <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Asignar Especialidad</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleAssignSpecialty}>
                        <Form.Group className="mb-3">
                            <Form.Label>Especialidad</Form.Label>
                            <Form.Select
                                value={selectedSpecialty ? selectedSpecialty.id : ''}
                                onChange={(e) => {
                                    const found = specialties.find(s => s.id === e.target.value || s.id === Number(e.target.value));
                                    setSelectedSpecialty(found || null);
                                }}
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
                        <Button variant="primary" type="submit">
                            Asignar Especialidad
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Modal para crear/editar ubicación */}
            <Modal show={showLocationModal} onHide={handleCloseLocationModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{selectedLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleLocationSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nombre de la ubicación"
                                value={locationFormData.name}
                                maxLength={100}
                                onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                                onBlur={() => setLocationFieldsTouched({ ...locationFieldsTouched, name: true })}
                                isInvalid={locationFieldsTouched.name && !!locationFormErrors.name}
                            />
                            <Form.Control.Feedback type="invalid">
                                {locationFormErrors.name}
                            </Form.Control.Feedback>
                        </Form.Group>

                        {locationFormError && (
                            <Alert variant="danger" className="d-flex align-items-center mb-3">
                                <FaExclamationCircle className="me-2" />
                                <div style={{ whiteSpace: 'pre-line' }}>{locationFormError}</div>
                            </Alert>
                        )}

                        <div className="d-flex gap-2">
                            <Button variant="secondary" onClick={handleCloseLocationModal}>
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                            >
                                Crear Ubicación
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
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

export default AdminPanel;