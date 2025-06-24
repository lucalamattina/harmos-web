import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import './ErrorPages.css';

const Error404 = () => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    return (
        <Container className="error-page-container">
            <Row className="justify-content-center align-items-center min-vh-100">
                <Col md={8} lg={6}>
                    <Card className="error-card text-center shadow-lg">
                        <Card.Body className="p-5">
                            <div className="error-icon mb-4">
                                <FaExclamationTriangle size={80} className="text-warning" />
                            </div>
                            
                            <div className="error-code mb-3">
                                <h1 className="display-1 fw-bold text-primary">404</h1>
                            </div>
                            
                            <div className="error-message mb-4">
                                <h2 className="h3 mb-3">Página no encontrada</h2>
                                <p className="text-muted lead">
                                    Lo sentimos, la página que estás buscando no existe o ha sido movida.
                                </p>
                                <p className="text-muted">
                                    Verifica la URL o utiliza los botones de abajo para navegar.
                                </p>
                            </div>
                            
                            <div className="error-actions d-flex gap-3 justify-content-center flex-wrap">
                                <Button 
                                    variant="primary" 
                                    size="lg"
                                    onClick={handleGoHome}
                                    className="d-flex align-items-center gap-2"
                                >
                                    <FaHome />
                                    Ir al Inicio
                                </Button>
                                <Button 
                                    variant="outline-secondary" 
                                    size="lg"
                                    onClick={handleGoBack}
                                    className="d-flex align-items-center gap-2"
                                >
                                    <FaArrowLeft />
                                    Volver Atrás
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Error404; 