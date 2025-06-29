import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Row, Col, Alert, Spinner, Table } from 'react-bootstrap';
import { FaTrash, FaSync, FaDownload, FaCheck, FaTimes } from 'react-icons/fa';
import useCache from '../../hooks/useCache';

const CacheManager = () => {
    const {
        cacheStatus,
        clearAllCache,
        clearSpecificCache,
        getCacheStats,
        updateCacheInfo
    } = useCache();

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [cacheStats, setCacheStats] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        loadCacheStats();
    }, []);

    const loadCacheStats = async () => {
        setLoading(true);
        try {
            const stats = await getCacheStats();
            setCacheStats(stats);
            updateCacheInfo();
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearAllCache = async () => {
        if (!window.confirm('¿Estás seguro de que quieres limpiar todo el caché? Esto puede hacer que la aplicación se cargue más lentamente la próxima vez.')) {
            return;
        }

        setLoading(true);
        try {
            const success = await clearAllCache();
            if (success) {
                setMessage('Caché limpiado exitosamente');
                setMessageType('success');
                setCacheStats(null);
                loadCacheStats();
            } else {
                setMessage('Error al limpiar el caché');
                setMessageType('danger');
            }
        } catch (error) {
            setMessage('Error al limpiar el caché: ' + error.message);
            setMessageType('danger');
        } finally {
            setLoading(false);
        }
    };

    const handleClearSpecificCache = async (cacheName) => {
        if (!window.confirm(`¿Eliminar el caché "${cacheName}"?`)) {
            return;
        }

        setLoading(true);
        try {
            const success = await clearSpecificCache(cacheName);
            if (success) {
                setMessage(`Caché "${cacheName}" eliminado`);
                setMessageType('success');
                loadCacheStats();
            } else {
                setMessage(`Error al eliminar caché "${cacheName}"`);
                setMessageType('danger');
            }
        } catch (error) {
            setMessage('Error: ' + error.message);
            setMessageType('danger');
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const clearAllCaches = async () => {
        setIsClearing(true);
        setMessage('');

        try {
            let clearedItems = [];

            // 1. Limpiar localStorage
            const localStorageKeys = Object.keys(localStorage);
            if (localStorageKeys.length > 0) {
                localStorage.clear();
                clearedItems.push(`localStorage (${localStorageKeys.length} items)`);
            }

            // 2. Limpiar sessionStorage
            const sessionStorageKeys = Object.keys(sessionStorage);
            if (sessionStorageKeys.length > 0) {
                sessionStorage.clear();
                clearedItems.push(`sessionStorage (${sessionStorageKeys.length} items)`);
            }

            // 3. Limpiar caché del Service Worker
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                try {
                    const channel = new MessageChannel();
                    
                    const swCacheCleared = await new Promise((resolve) => {
                        channel.port1.onmessage = (event) => {
                            resolve(event.data.success);
                        };

                        navigator.serviceWorker.controller.postMessage(
                            { type: 'CLEAR_CACHE' },
                            [channel.port2]
                        );

                        // Timeout después de 5 segundos
                        setTimeout(() => resolve(false), 5000);
                    });

                    if (swCacheCleared) {
                        clearedItems.push('Service Worker cache');
                    }
                } catch (swError) {
                    console.warn('Error limpiando Service Worker cache:', swError);
                }
            }

            // 4. Limpiar caché del navegador (si es posible)
            if ('caches' in window) {
                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    if (cacheNames.length > 0) {
                        clearedItems.push(`Browser caches (${cacheNames.length} caches)`);
                    }
                } catch (cacheError) {
                    console.warn('Error limpiando browser caches:', cacheError);
                }
            }

            if (clearedItems.length > 0) {
                setMessage(`✅ Caché limpiado exitosamente: ${clearedItems.join(', ')}`);
                setMessageType('success');
                
                // Auto-reload después de 2 segundos
                setTimeout(() => {
                    window.location.reload(true);
                }, 2000);
            } else {
                setMessage('✅ No había caché para limpiar');
                setMessageType('info');
            }

        } catch (error) {
            console.error('Error limpiando caché:', error);
            setMessage(`❌ Error limpiando caché: ${error.message}`);
            setMessageType('danger');
        } finally {
            setIsClearing(false);
        }
    };

    const forceRefresh = () => {
        // Forzar recarga completa sin caché
        window.location.reload(true);
    };

    const getCurrentCacheInfo = () => {
        const info = {
            localStorage: Object.keys(localStorage).length,
            sessionStorage: Object.keys(sessionStorage).length,
            hasServiceWorker: 'serviceWorker' in navigator,
            hasCacheAPI: 'caches' in window
        };
        return info;
    };

    const cacheInfo = getCurrentCacheInfo();

    return (
        <Card className="cache-manager">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                    <i className="bi bi-archive me-2"></i>
                    Gestión de Caché
                </h5>
                <div className="d-flex gap-2">
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={loadCacheStats}
                        disabled={loading}
                    >
                        <FaSync className={`me-1 ${loading ? 'fa-spin' : ''}`} />
                        Actualizar
                    </Button>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                    >
                        {showDetails ? 'Ocultar' : 'Mostrar'} Detalles
                    </Button>
                </div>
            </Card.Header>

            <Card.Body>
                {message && (
                    <Alert 
                        variant={messageType} 
                        dismissible 
                        onClose={() => setMessage('')}
                        className="mb-3"
                    >
                        {message}
                        {messageType === 'success' && (
                            <div className="mt-2 small">
                                La página se recargará automáticamente en 2 segundos...
                            </div>
                        )}
                    </Alert>
                )}

                {/* Estado general del caché */}
                <Row className="mb-4">
                    <Col md={3}>
                        <div className="text-center">
                            <div className="cache-status-icon mb-2">
                                {cacheStatus.isSupported ? (
                                    <FaCheck className="text-success" size={24} />
                                ) : (
                                    <FaTimes className="text-danger" size={24} />
                                )}
                            </div>
                            <h6>Soporte</h6>
                            <Badge variant={cacheStatus.isSupported ? 'success' : 'danger'}>
                                {cacheStatus.isSupported ? 'Soportado' : 'No soportado'}
                            </Badge>
                        </div>
                    </Col>
                    <Col md={3}>
                        <div className="text-center">
                            <div className="cache-status-icon mb-2">
                                {cacheStatus.isRegistered ? (
                                    <FaCheck className="text-success" size={24} />
                                ) : (
                                    <FaTimes className="text-warning" size={24} />
                                )}
                            </div>
                            <h6>Service Worker</h6>
                            <Badge variant={cacheStatus.isRegistered ? 'success' : 'warning'}>
                                {cacheStatus.isRegistered ? 'Activo' : 'Inactivo'}
                            </Badge>
                        </div>
                    </Col>
                    <Col md={3}>
                        <div className="text-center">
                            <div className="cache-status-icon mb-2">
                                <i className="bi bi-files" style={{ fontSize: '24px', color: '#009A9E' }}></i>
                            </div>
                            <h6>Recursos</h6>
                            <Badge variant="info">
                                {cacheStatus.cacheSize} archivos
                            </Badge>
                        </div>
                    </Col>
                    <Col md={3}>
                        <div className="text-center">
                            <div className="cache-status-icon mb-2">
                                <i className="bi bi-clock" style={{ fontSize: '24px', color: '#6c757d' }}></i>
                            </div>
                            <h6>Última actualización</h6>
                            <small className="text-muted">
                                {cacheStatus.lastUpdate ? 
                                    cacheStatus.lastUpdate.toLocaleTimeString() : 
                                    'Nunca'
                                }
                            </small>
                        </div>
                    </Col>
                </Row>

                {/* Acciones */}
                <Row className="mb-4">
                    <Col>
                        <div className="d-flex justify-content-center gap-3">
                            <Button
                                variant="warning"
                                onClick={clearAllCaches}
                                disabled={isClearing}
                                size="sm"
                            >
                                {isClearing ? (
                                    <>
                                        <Spinner size="sm" className="me-2" />
                                        Limpiando...
                                    </>
                                ) : (
                                    '🗑️ Limpiar Todo el Caché'
                                )}
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Detalles del caché */}
                {showDetails && cacheStats && (
                    <div className="cache-details">
                        <h6 className="mb-3">
                            <i className="bi bi-info-circle me-2"></i>
                            Detalles del Caché
                        </h6>
                        <Table responsive striped>
                            <thead>
                                <tr>
                                    <th>Nombre del Caché</th>
                                    <th>Recursos</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(cacheStats).map(([cacheName, data]) => (
                                    <tr key={cacheName}>
                                        <td>
                                            <code>{cacheName}</code>
                                        </td>
                                        <td>
                                            <Badge variant="secondary">
                                                {data.count} archivos
                                            </Badge>
                                        </td>
                                        <td>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleClearSpecificCache(cacheName)}
                                                disabled={loading}
                                            >
                                                <FaTrash className="me-1" />
                                                Eliminar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}

                {/* Información adicional */}
                <Card className="mt-4 bg-light">
                    <Card.Body>
                        <h6>
                            <i className="bi bi-lightbulb me-2"></i>
                            Información sobre el Caché
                        </h6>
                        <ul className="mb-0">
                            <li>El caché mejora la velocidad de carga al almacenar recursos localmente</li>
                            <li>Los logos, CSS y JS se cachean automáticamente</li>
                            <li>Las imágenes de anuncios NO se cachean para mantenerlas actualizadas</li>
                            <li>Limpiar el caché puede hacer que la app sea más lenta la próxima vez</li>
                        </ul>
                    </Card.Body>
                </Card>

                <div className="cache-info mb-3 p-2 bg-light rounded">
                    <small>
                        <strong>Estado actual:</strong><br/>
                        • localStorage: {cacheInfo.localStorage} items<br/>
                        • sessionStorage: {cacheInfo.sessionStorage} items<br/>
                        • Service Worker: {cacheInfo.hasServiceWorker ? '✅ Disponible' : '❌ No disponible'}<br/>
                        • Cache API: {cacheInfo.hasCacheAPI ? '✅ Disponible' : '❌ No disponible'}
                    </small>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                    <Button
                        variant="outline-secondary"
                        onClick={forceRefresh}
                        disabled={isClearing}
                        size="sm"
                    >
                        🔄 Recarga Forzada
                    </Button>
                </div>

                <div className="mt-3">
                    <small className="text-muted">
                        <strong>💡 Cuándo usar:</strong><br/>
                        • Los cambios de CSS no se ven<br/>
                        • La API cambia entre localhost y Heroku<br/>
                        • Errores de autenticación persistentes<br/>
                        • Después de actualizar la aplicación
                    </small>
                </div>
            </Card.Body>
        </Card>
    );
};

export default CacheManager; 