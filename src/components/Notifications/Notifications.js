import React, { useState, useEffect } from 'react';
import { Dropdown, Badge, Button, Modal } from 'react-bootstrap';
import { FaBell } from 'react-icons/fa';
import { getNotifications, markNotificationAsRead } from '../../api/notifications';
import api from '../../api/api';
import './Notifications.css';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [authorName, setAuthorName] = useState('');

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(notif => !notif.read).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
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

    const formatSpecialties = (specialties) => {
        if (!specialties || specialties.length === 0) return 'Todas las especialidades';
        return specialties.map(spec => typeof spec === 'object' ? spec.name : spec).join(', ');
    };

    return (
        <>
            <Dropdown align="end">
                <div className="d-flex align-items-center">
                    <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={fetchNotifications}
                        className="me-2"
                    >
                        Probar Notificaciones
                    </Button>
                    <Dropdown.Toggle as="div" className="nav-icon-button">
                        <FaBell className="nav-icon" />
                        {unreadCount > 0 && (
                            <Badge bg="danger" className="notification-badge">
                                {unreadCount}
                            </Badge>
                        )}
                    </Dropdown.Toggle>
                </div>

                <Dropdown.Menu className="notification-dropdown">
                    <Dropdown.Header>Notificaciones</Dropdown.Header>
                    <div className="notification-list">
                        {notifications.length === 0 ? (
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
                                            {new Date(notification.date).toLocaleString()}
                                        </small>
                                    </div>
                                </Dropdown.Item>
                            ))
                        )}
                    </div>
                </Dropdown.Menu>
            </Dropdown>

            {/* Modal para mostrar detalles del anuncio */}
            <Modal 
                show={showAnnouncementModal} 
                onHide={() => setShowAnnouncementModal(false)} 
                size="lg"
                dialogClassName="modal-dialog-responsive"
                centered
            >
                {selectedAnnouncement && (
                    <>
                        <Modal.Header className="border-bottom-0 sticky-top bg-white" style={{ zIndex: 1031 }}>
                            <Modal.Title>{selectedAnnouncement.title}</Modal.Title>
                        </Modal.Header>
                        <div className="announcement-metadata sticky-top bg-light mb-0 p-3" style={{ top: '56px', zIndex: 1030, borderRadius: 0 }}>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <small className="text-muted">
                                        <i className="bi bi-calendar me-1"></i>
                                        {new Date(selectedAnnouncement.date).toLocaleDateString()}
                                    </small>
                                    <small className="text-muted ms-3">
                                        <i className="bi bi-person me-1"></i>
                                        {authorName}
                                    </small>
                                </div>
                                <div>
                                    <small className="text-muted">
                                        <i className="bi bi-tags me-1"></i>
                                        {formatSpecialties(selectedAnnouncement.specialties)}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <Modal.Body>
                            {selectedAnnouncement.imageUrl && (
                                <div className="announcement-image-container mb-3">
                                    <img 
                                        src={selectedAnnouncement.imageUrl} 
                                        alt={selectedAnnouncement.title} 
                                        className="announcement-image"
                                        style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                    />
                                </div>
                            )}
                            <div className="announcement-content" style={{ paddingTop: '8px' }}>
                                {selectedAnnouncement.content}
                            </div>
                        </Modal.Body>
                        <Modal.Footer className="border-0 d-flex justify-content-center">
                            <Button 
                                variant="primary" 
                                onClick={() => setShowAnnouncementModal(false)}
                                className="px-5"
                            >
                                Cerrar
                            </Button>
                        </Modal.Footer>
                    </>
                )}
            </Modal>
        </>
    );
};

export default Notifications; 