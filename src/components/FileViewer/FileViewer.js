import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import { FaDownload, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa';
import './FileViewer.css';

const FileViewer = ({ show, onHide, fileData, isLoading, error }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [iframeLoading, setIframeLoading] = useState(true);

    useEffect(() => {
        if (show) {
            setCurrentPage(1);
            setIframeLoading(true);
        }
    }, [show, fileData]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'ArrowLeft' && currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        } else if (e.key === 'ArrowRight' && fileData?.page_previews && currentPage < fileData.page_previews.length) {
            setCurrentPage(prev => prev + 1);
        } else if (e.key === 'Escape') {
            onHide();
        }
    }, [currentPage, fileData, onHide]);

    useEffect(() => {
        if (show) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [show, handleKeyDown]);

    if (!show) return null;

    const handleDownload = () => {
        if (fileData?.download_url) {
            const link = document.createElement('a');
            link.href = fileData.download_url;
            link.download = fileData.filename || 'documento';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const renderViewer = () => {
        if (isLoading) {
            return (
                <div className="file-viewer-loading">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Cargando archivo...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="file-viewer-error">
                    <Alert variant="danger">
                        <Alert.Heading>Error al cargar el archivo</Alert.Heading>
                        <p>{error}</p>
                        {fileData?.download_url && (
                            <Button variant="outline-primary" onClick={handleDownload}>
                                <FaDownload className="me-2" />
                                Descargar archivo
                            </Button>
                        )}
                    </Alert>
                </div>
            );
        }

        if (!fileData) {
            return (
                <div className="file-viewer-error">
                    <Alert variant="warning">No hay datos del archivo disponibles</Alert>
                </div>
            );
        }

        switch (fileData.viewer_type || fileData.document_type) {
            case 'pdf':
                return renderPdfViewer();
            case 'image_pages':
            default:
                if (fileData.page_previews && fileData.page_previews.length > 0) {
                    return renderDocumentViewer();
                } else {
                    return renderDownloadOnly();
                }
        }
    };

    const renderPdfViewer = () => {
        // Usar PDF.js de Mozilla con la URL embed
        const pdfUrl = encodeURIComponent(fileData.embed_url || fileData.direct_url || fileData.url);
        const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${pdfUrl}`;

        return (
            <div className="pdf-viewer-container">
                {iframeLoading && (
                    <div className="iframe-loading">
                        <Spinner animation="border" variant="primary" />
                        <p>Cargando visualizador PDF...</p>
                    </div>
                )}
                <iframe
                    src={viewerUrl}
                    style={{ 
                        width: '100%',
                        height: '100%',
                        border: 'none', 
                        borderRadius: '0 0 12px 12px',
                        display: iframeLoading ? 'none' : 'block'
                    }}
                    onLoad={() => setIframeLoading(false)}
                    title={`Visualizador de ${fileData.filename}`}
                />
            </div>
        );
    };

    const renderDocumentViewer = () => {
        const totalPages = fileData.page_previews.length;
        const currentPageData = fileData.page_previews[currentPage - 1];

        return (
            <div className="document-viewer">
                <div className="viewer-toolbar">
                    <Button
                        variant="outline-light"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                    >
                        <FaChevronLeft className="me-1" />
                        Anterior
                    </Button>
                    
                    <span className="page-info">
                        Página {currentPage} de {totalPages}
                    </span>
                    
                    <Button
                        variant="outline-light"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Siguiente
                        <FaChevronRight className="ms-1" />
                    </Button>
                </div>
                
                <div className="page-container">
                    <img 
                        src={currentPageData?.preview_url} 
                        alt={`Página ${currentPage} de ${fileData.filename}`}
                        style={{ 
                            maxWidth: '100%', 
                            height: 'auto',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                            borderRadius: '4px'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'block';
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIiBzdHJva2U9IiNkZWUyZTYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM2Yzc1N2QiPkVycm9yIGFsIGNhcmdhciBsYSBww6FnaW5hPC90ZXh0Pjwvc3ZnPg==';
                        }}
                    />
                </div>

                {/* Navegación por miniaturas si hay múltiples páginas */}
                {totalPages > 1 && (
                    <div className="thumbnails-container">
                        <div className="thumbnails-scroll">
                            {fileData.page_previews.map((page, index) => (
                                <div
                                    key={index}
                                    className={`thumbnail ${currentPage === index + 1 ? 'active' : ''}`}
                                    onClick={() => setCurrentPage(index + 1)}
                                >
                                    <img
                                        src={page.thumbnail_url}
                                        alt={`Página ${index + 1}`}
                                        onError={(e) => {
                                            e.target.style.display = 'block';
                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y4ZjlmYSIgc3Ryb2tlPSIjZGVlMmU2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2Yzc1N2QiPiR7aW5kZXggKyAxfTwvdGV4dD48L3N2Zz4=';
                                        }}
                                    />
                                    <span className="thumbnail-number">{index + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderDownloadOnly = () => {
        return (
            <div className="download-only-container">
                <div className="download-message">
                    <i className="bi bi-file-earmark-text" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <h5 className="mt-3">Vista previa no disponible</h5>
                    <p className="text-muted">
                        Este tipo de archivo no puede previsualizarse en el navegador.
                        Puedes descargarlo para abrirlo en la aplicación correspondiente.
                    </p>
                    <Button variant="primary" onClick={handleDownload} className="mt-3">
                        <FaDownload className="me-2" />
                        Descargar {fileData.filename}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Modal 
            show={show} 
            onHide={onHide} 
            size="xl"
            centered
            dialogClassName="file-viewer-modal"
        >
            <Modal.Header className="file-viewer-header">
                <Modal.Title className="d-flex align-items-center">
                    <i className="bi bi-file-earmark me-2"></i>
                    {fileData?.filename || 'Archivo'}
                </Modal.Title>
                <div className="header-actions">
                    {fileData?.download_url && (
                        <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={handleDownload}
                            className="me-2"
                        >
                            <FaDownload className="me-1" />
                            Descargar
                        </Button>
                    )}
                    <Button
                        variant="link"
                        className="text-dark"
                        onClick={onHide}
                        style={{ fontSize: '1.2rem' }}
                    >
                        <FaTimes />
                    </Button>
                </div>
            </Modal.Header>
            
            <Modal.Body className="file-viewer-body p-0">
                {renderViewer()}
            </Modal.Body>
        </Modal>
    );
};

export default FileViewer; 