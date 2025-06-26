import React, { useState, useEffect } from 'react';
import { Dropdown, Badge, Button, Modal, Alert } from 'react-bootstrap';
import { FaBell } from 'react-icons/fa';
import { getNotifications, markNotificationAsRead } from '../../api/notifications';
import api from '../../api/api';
import { AnnouncementModal } from '../AnnouncementBoard/AnnouncementBoard';
import { formatNotificationDate } from '../../utils/dateUtils';
import './Notifications.css';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [authorName, setAuthorName] = useState('');
    const [error, setError] = useState('');

    const formatSpecialties = (specialties) => {
        if (!specialties || specialties.length === 0) return 'Todas las especialidades';
        return specialties.map(spec => typeof spec === 'object' ? spec.name : spec).join(', ');
    };

    const fetchNotifications = async () => {
        try {
            setError('');
            const data = await getNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(notif => !notif.read).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            if (error.response?.status === 401) {
                setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
            } else if (error.response?.status === 403) {
                setError('No tienes permisos para acceder a las notificaciones.');
            } else {
                setError('Error al cargar las notificaciones.');
            }
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            setError('');
            // Marcar como leída
            await markNotificationAsRead(notification.id);
            setNotifications(notifications.map(notif => 
                notif.id === notification.id 
                    ? { ...notif, read: true }
                    : notif
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));

            // Obtener detalles del anuncio
            if (notification.announcementId) {
                const announcementResponse = await api.get(`/api/announcements/${notification.announcementId}`);
                setSelectedAnnouncement(announcementResponse.data);
                
                // Obtener nombre del autor
                const authorResponse = await api.get(`/api/users/${announcementResponse.data.createdByUserId}`);
                setAuthorName(authorResponse.data.name);
                
                setShowAnnouncementModal(true);
            }
        } catch (error) {
            console.error('Error handling notification:', error);
            if (error.response?.status === 401) {
                setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
            } else if (error.response?.status === 403) {
                setError('No tienes permisos para realizar esta acción.');
            } else {
                setError('Error al procesar la notificación.');
            }
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchNotifications();

        // // Set up polling every 2 minutes
        // const pollInterval = setInterval(fetchNotifications, 120000);

        // // Cleanup interval on component unmount
        // return () => clearInterval(pollInterval);
    }, []);

    return (
        <>
            <Dropdown align="end">
                <Dropdown.Toggle variant="link" id="notification-dropdown" className="position-relative p-2 notification-toggle">
                    <FaBell size={20} color="#009A9E" />
                    {unreadCount > 0 && (
                        <Badge 
                            bg="danger" 
                            pill 
                            className="position-absolute top-0 start-100 translate-middle"
                            style={{ fontSize: '0.7rem' }}
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </Dropdown.Toggle>

                <Dropdown.Menu className="notification-dropdown">
                    <Dropdown.Header className="d-flex justify-content-between align-items-center">
                        <span>Notificaciones</span>
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Aquí podrías agregar la lógica para probar notificaciones
                                alert('Función de probar notificaciones');
                            }}
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                        >
                            Probar
                        </Button>
                    </Dropdown.Header>
                    {error && (
                        <div className="px-3 py-2">
                            <Alert variant="danger" className="mb-0 py-2">
                                <small>{error}</small>
                            </Alert>
                        </div>
                    )}
                    <div className="notification-list">
                        {notifications.length === 0 && !error ? (
                            <Dropdown.Item disabled>No hay notificaciones</Dropdown.Item>
                        ) : (
                            notifications.map(notification => (
                                <Dropdown.Item
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                                    style={{ cursor: notification.announcementId ? 'pointer' : 'default' }}
                                >
                                    <div className="notification-content">
                                        <p className="notification-text">{notification.message}</p>
                                        <small className="notification-date">
                                            {formatNotificationDate(notification.date)}
                                        </small>
                                    </div>
                                </Dropdown.Item>
                            ))
                        )}
                    </div>
                </Dropdown.Menu>
            </Dropdown>

            {/* Modal unificado para mostrar detalles del anuncio */}
            <AnnouncementModal
                show={showAnnouncementModal}
                onHide={() => setShowAnnouncementModal(false)}
                announcement={selectedAnnouncement}
                authorName={authorName}
            />
        </>
    );
};

export default Notifications; 