import React from 'react';
import { Container, Row, Col, Button, Card, Alert } from 'react-bootstrap';
import { FaHome, FaBug, FaRedo, FaExclamationTriangle } from 'react-icons/fa';
import './ErrorPages.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Actualiza el state para mostrar la UI de error
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Puedes registrar el error en un servicio de logging
        console.error('ErrorBoundary capturó un error:', error, errorInfo);
        
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Aquí podrías enviar el error a un servicio como Sentry
        // logErrorToService(error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    handleReportError = () => {
        const errorReport = {
            error: this.state.error?.toString(),
            stack: this.state.error?.stack,
            componentStack: this.state.errorInfo?.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Aquí podrías enviar el reporte a tu sistema de monitoreo
        console.log('Reporte de error:', errorReport);
        
        // Por ahora, copiamos al clipboard
        navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
            .then(() => alert('Información del error copiada al portapapeles'))
            .catch(() => alert('Error al copiar. Revisa la consola para más detalles.'));
    };

    render() {
        if (this.state.hasError) {
            return (
                <Container className="error-page-container">
                    <Row className="justify-content-center align-items-center min-vh-100">
                        <Col md={8} lg={6}>
                            <Card className="error-card text-center shadow-lg">
                                <Card.Body className="p-5">
                                    <div className="error-icon mb-4">
                                        <FaBug size={80} className="text-danger" />
                                    </div>
                                    
                                    <div className="error-code mb-3">
                                        <h1 className="display-1 fw-bold text-danger">Error</h1>
                                    </div>
                                    
                                    <div className="error-message mb-4">
                                        <h2 className="h3 mb-3">Algo salió mal</h2>
                                        <p className="text-muted lead">
                                            Ha ocurrido un error inesperado en la aplicación.
                                        </p>
                                        
                                        <Alert variant="danger" className="mt-3 text-start">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <FaExclamationTriangle />
                                                <strong>Detalles del error:</strong>
                                            </div>
                                            <small className="font-monospace">
                                                {this.state.error && this.state.error.toString()}
                                            </small>
                                        </Alert>

                                        {process.env.NODE_ENV === 'development' && (
                                            <Alert variant="warning" className="mt-3 text-start">
                                                <strong>Stack trace (desarrollo):</strong>
                                                <pre className="mt-2" style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                                                    {this.state.error && this.state.error.stack}
                                                </pre>
                                            </Alert>
                                        )}
                                    </div>
                                    
                                    <div className="error-actions d-flex gap-3 justify-content-center flex-wrap">
                                        <Button 
                                            variant="primary" 
                                            size="lg"
                                            onClick={this.handleReload}
                                            className="d-flex align-items-center gap-2"
                                        >
                                            <FaRedo />
                                            Recargar Página
                                        </Button>
                                        
                                        <Button 
                                            variant="outline-primary" 
                                            size="lg"
                                            onClick={this.handleGoHome}
                                            className="d-flex align-items-center gap-2"
                                        >
                                            <FaHome />
                                            Ir al Inicio
                                        </Button>

                                        <Button 
                                            variant="outline-secondary" 
                                            size="lg"
                                            onClick={this.handleReportError}
                                            className="d-flex align-items-center gap-2"
                                        >
                                            <FaBug />
                                            Reportar Error
                                        </Button>
                                    </div>

                                    <div className="mt-4">
                                        <small className="text-muted">
                                            Si el problema persiste, contacta al soporte técnico.
                                        </small>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 