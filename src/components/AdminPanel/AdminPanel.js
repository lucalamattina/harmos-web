import React, { useState, useEffect, useContext } from 'react';
import { Container, Tabs, Tab, Table, Button, Modal, Form, Alert, Pagination, OverlayTrigger, Tooltip, InputGroup } from 'react-bootstrap';
import { FaTrash, FaEdit, FaPlus, FaUserPlus } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/api';
import './AdminPanel.css';

const AdminPanel = () => {
    const { isAdmin } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [specialties, setSpecialties] = useState([]);
    const [loading, setLoading] = useState(true);
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
        description: ''
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

    useEffect(() => {
        if (isAdmin) {
            fetchUsers(0);
            fetchSpecialties(); // Cargar especialidades al montar
        }
    }, [isAdmin]);

    const fetchUsers = async (page) => {
        try {
            const response = await api.get(`/api/users?page=${page}&size=${pagination.pageSize}`);
            const usersData = response.data.content || [];
            setUsers(usersData);
            
            // Actualizar estado de paginación
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
        try {
            const payload = {
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                specialties: formData.specialties,
                roles: formData.roles
            };
            if (selectedUser) {
                await api.put(`/api/users/${selectedUser.id}`, payload);
            } else {
                await api.post('/api/users', payload);
            }
            setShowUserModal(false);
            fetchUsers(0);
            resetForm();
        } catch (err) {
            setError('Error al guardar usuario');
        }
    };

    const handleSpecialtySubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedSpecialty) {
                // Aquí podrías implementar la edición de especialidad si tu backend lo permite
                // await api.put(`/api/specialties/${selectedSpecialty.id}`, { name: specialtyFormData.name, data: specialtyFormData.description });
            } else {
                // Crear especialidad
                await api.post('/api/specialties', {
                    name: specialtyFormData.name,
                    data: specialtyFormData.description
                });
            }
            setShowSpecialtyModal(false);
            fetchSpecialties(); // Recargar especialidades después de crear
            resetSpecialtyForm();
        } catch (err) {
            setError('Error al guardar especialidad');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
            try {
                await api.delete(`/api/users/${userId}`);
                fetchUsers(0);
            } catch (err) {
                setError('Error al eliminar usuario');
            }
        }
    };

    const handleDeleteSpecialty = async (specialtyName) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar esta especialidad?')) {
            try {
                // Primero encontramos el usuario que tiene esta especialidad
                const userWithSpecialty = users.find(user => 
                    user.specialties && user.specialties.includes(specialtyName)
                );
                
                if (userWithSpecialty) {
                    await api.put(`/api/users/${userWithSpecialty.id}/specialties`, {
                        specialties: userWithSpecialty.specialties.filter(s => s !== specialtyName)
                    });
                    fetchUsers(0);
                }
            } catch (err) {
                setError('Error al eliminar especialidad');
            }
        }
    };

    const handleAssignSpecialty = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/api/users/${selectedUser.id}/specialties`, {
                specialtyId: selectedSpecialty.id
            });
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
    };

    const resetSpecialtyForm = () => {
        setSpecialtyFormData({
            name: '',
            description: ''
        });
        setSelectedSpecialty(null);
    };

    const handlePageChange = (page) => {
        fetchUsers(page - 1); // La API usa 0-based indexing
    };

    // Para depuración, mostrar el array de especialidades en consola
    console.log('Especialidades:', specialties);

    if (!isAdmin) {
        return <Alert variant="danger">No tienes permisos para acceder a esta página.</Alert>;
    }

    return (
        <Container className="admin-panel mt-4">
            <h2>Panel de Administración</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Tabs defaultActiveKey="users" className="mb-3">
                <Tab eventKey="users" title="Usuarios">
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
                                                variant="info" 
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
                                                variant="success" 
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
                                                variant="danger" 
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
                </Tab>

                <Tab eventKey="specialties" title="Especialidades">
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
                                                variant="info" 
                                                size="sm" 
                                                className="me-2"
                                                onClick={() => {
                                                    setSelectedSpecialty(specialty);
                                                    setSpecialtyFormData({
                                                        name: specialty.name,
                                                        description: specialty.data || ''
                                                    });
                                                    setShowSpecialtyModal(true);
                                                }}
                                            >
                                                <FaEdit />
                                            </Button>
                                        </OverlayTrigger>
                                        <OverlayTrigger placement="top" overlay={<Tooltip>Eliminar especialidad</Tooltip>}>
                                            <Button 
                                                variant="danger" 
                                                size="sm"
                                                onClick={() => handleDeleteSpecialty(specialty.name)}
                                            >
                                                <FaTrash />
                                            </Button>
                                        </OverlayTrigger>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Tab>
            </Tabs>

            {/* Modal para crear/editar usuario */}
            <Modal show={showUserModal} onHide={() => setShowUserModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleUserSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Apellido</Form.Label>
                            <Form.Control
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Teléfono</Form.Label>
                            <Form.Control
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                required
                            />
                        </Form.Group>
                        {!selectedUser && (
                            <Form.Group className="mb-3">
                                <Form.Label>Contraseña</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    required
                                />
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
                                <option value="DOCTOR">Doctor</option>
                                <option value="ADMINISTRATOR">Administrador</option>
                            </Form.Select>
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            {selectedUser ? 'Guardar Cambios' : 'Crear Usuario'}
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Modal para crear/editar especialidad */}
            <Modal show={showSpecialtyModal} onHide={() => setShowSpecialtyModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{selectedSpecialty ? 'Editar Especialidad' : 'Nueva Especialidad'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSpecialtySubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre</Form.Label>
                            <Form.Control
                                type="text"
                                value={specialtyFormData.name}
                                onChange={(e) => setSpecialtyFormData({...specialtyFormData, name: e.target.value})}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Descripción</Form.Label>
                            <Form.Control
                                type="text"
                                value={specialtyFormData.description}
                                onChange={(e) => setSpecialtyFormData({...specialtyFormData, description: e.target.value})}
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            {selectedSpecialty ? 'Guardar Cambios' : 'Crear Especialidad'}
                        </Button>
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
        </Container>
    );
};

export default AdminPanel; 