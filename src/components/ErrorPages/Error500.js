import React from 'react';
import { Container, Row, Col, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaExclamationCircle, FaRedo } from 'react-icons/fa';
import './ErrorPages.css';

const Error500 = () => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    const handleReload = () => {
        window.location.reload();
    };



    return (
        <Container className="error-page-container">
            <Row className="justify-content-center align-items-center min-vh-100">
                <Col md={8} lg={6}>
                    <Card className="error-card text-center shadow-lg">
                        <Card.Body className="p-5">
                            <div className="error-icon mb-4">
                                <FaExclamationCircle size={80} className="text-danger" />
                            </div>
                            
                            <div className="error-code mb-3">
                                <h1 className="display-1 fw-bold text-danger">500</h1>
                            </div>
                            
                            <div className="error-message mb-4">
                                <h2 className="h3 mb-3">Error interno del servidor</h2>
                                <p className="text-muted lead">
                                    Ha ocurrido un error inesperado en nuestros servidores.
                                </p>
                                <Alert variant="warning" className="mt-3">
                                    <strong>¿Qué puedes hacer?</strong>
                                    <ul className="list-unstyled mt-2 mb-0">
                                        <li>• Recargar la página</li>
                                        <li>• Intentar de nuevo en unos minutos</li>
                                    </ul>
                                </Alert>
                            </div>
                            
                            <div className="error-actions d-flex gap-3 justify-content-center flex-wrap">
                                <Button 
                                    variant="primary" 
                                    size="lg"
                                    onClick={handleReload}
                                    className="d-flex align-items-center gap-2"
                                >
                                    <FaRedo />
                                    Recargar Página
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
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Error500; 