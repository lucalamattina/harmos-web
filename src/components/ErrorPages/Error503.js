import React, { useState } from 'react';
import { Container, Row, Col, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaTools, FaRedo } from 'react-icons/fa';
import './ErrorPages.css';

const Error503 = () => {
    const navigate = useNavigate();
    const [isRetrying, setIsRetrying] = useState(false);

    const handleGoHome = () => {
        navigate('/');
    };

    const handleRetry = () => {
        setIsRetrying(true);
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    };

    return (
        <Container className="error-page-container">
            <Row className="justify-content-center align-items-center min-vh-100">
                <Col md={8} lg={6}>
                    <Card className="error-card text-center shadow-lg">
                        <Card.Body className="p-5">
                            <div className="error-icon mb-4">
                                <FaTools size={80} className="text-info" />
                            </div>
                            
                            <div className="error-code mb-3">
                                <h1 className="display-1 fw-bold text-info">503</h1>
                            </div>
                            
                            <div className="error-message mb-4">
                                <h2 className="h3 mb-3">Servicio temporalmente no disponible</h2>
                                <p className="text-muted lead">
                                    El sistema está temporalmente fuera de línea por mantenimiento o alta demanda.
                                </p>
                                
                                <Alert variant="info" className="mt-3">
                                    <strong>¿Qué puedes hacer?</strong>
                                    <ul className="list-unstyled mt-2 mb-0">
                                        <li>• Intentar recargar la página</li>
                                        <li>• Esperar unos minutos y volver a intentar</li>
                                        <li>• Verificar tu conexión a internet</li>
                                    </ul>
                                </Alert>
                            </div>
                            
                            <div className="error-actions d-flex gap-3 justify-content-center flex-wrap">
                                <Button 
                                    variant="primary" 
                                    size="lg"
                                    onClick={handleRetry}
                                    disabled={isRetrying}
                                    className="d-flex align-items-center gap-2"
                                >
                                    <FaRedo className={isRetrying ? 'fa-spin' : ''} />
                                    {isRetrying ? 'Reintentando...' : 'Reintentar'}
                                </Button>
                                
                                <Button 
                                    variant="outline-primary" 
                                    size="lg"
                                    onClick={handleGoHome}
                                    className="d-flex align-items-center gap-2"
                                >
                                    <FaHome />
                                    Ir al Inicio
                                </Button>
                            </div>

                            <div className="mt-4">
                                <small className="text-muted">
                                    Si el problema persiste, intenta de nuevo en unos minutos.
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Error503; 