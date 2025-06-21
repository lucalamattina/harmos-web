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

    const getFileExtension = () => {
        if (!fileData?.filename) return '';
        return fileData.filename.split('.').pop()?.toLowerCase() || '';
    };

    const getFileType = () => {
        const extension = getFileExtension();
        
        if (extension === 'pdf') return 'pdf';
        if (['docx', 'doc'].includes(extension)) return 'docx';
        if (['xlsx', 'xls'].includes(extension)) return 'excel';
        if (['pptx', 'ppt'].includes(extension)) return 'powerpoint';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) return 'image';
        if (['txt', 'md'].includes(extension)) return 'text';
        
        return 'other';
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

        const fileType = getFileType();

        switch (fileType) {
            case 'pdf':
                return renderPdfViewer();
            case 'docx':
                return renderOfficeViewer('docx');
            case 'excel':
                return renderOfficeViewer('excel');
            case 'powerpoint':
                return renderOfficeViewer('powerpoint');
            case 'image':
                return renderImageViewer();
            case 'text':
                return renderTextViewer();
            case 'image_pages':
                if (fileData.page_previews && fileData.page_previews.length > 0) {
                    return renderDocumentViewer();
                } else {
                    return renderDownloadOnly();
                }
            default:
                return renderDownloadOnly();
        }
    };

    const renderPdfViewer = () => {
        // Usar embed directo del PDF ya que el viewer externo tiene problemas de CORS
        const pdfUrl = fileData.embed_url || fileData.direct_url || fileData.url;

        return (
            <div className="pdf-viewer-container">
                {iframeLoading && (
                    <div className="iframe-loading">
                        <Spinner animation="border" variant="primary" />
                        <p>Cargando documento PDF...</p>
                    </div>
                )}
                <object
                    data={pdfUrl}
                    type="application/pdf"
                    style={{ 
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: iframeLoading ? 'none' : 'block'
                    }}
                    onLoad={() => setIframeLoading(false)}
                >
                    <iframe
                        src={pdfUrl}
                        style={{ 
                            width: '100%',
                            height: '100%',
                            border: 'none'
                        }}
                        onLoad={() => setIframeLoading(false)}
                        onError={() => {
                            setIframeLoading(false);
                            console.error('Error al cargar el PDF:', pdfUrl);
                        }}
                        title={`Visualizador de ${fileData.filename}`}
                    />
                    <p style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                        No se puede mostrar el PDF en el navegador. 
                        <br />
                        <Button 
                            variant="primary" 
                            onClick={handleDownload}
                            className="mt-2"
                        >
                            <FaDownload className="me-2" />
                            Descargar PDF
                        </Button>
                    </p>
                </object>
                
                {/* Botón de descarga como alternativa */}
                <div className="pdf-viewer-controls">
                    <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={handleDownload}
                        className="download-alternative"
                    >
                        <FaDownload className="me-2" />
                        Descargar PDF
                    </Button>
                </div>
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

    const renderOfficeViewer = (type) => {
        const fileUrl = encodeURIComponent(fileData.embed_url || fileData.direct_url || fileData.url);
        let viewerUrl = '';
        let typeName = '';

        switch (type) {
            case 'docx':
                // Microsoft Office Online Viewer para Word
                viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${fileUrl}`;
                typeName = 'documento de Word';
                break;
            case 'excel':
                // Microsoft Office Online Viewer para Excel
                viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${fileUrl}`;
                typeName = 'hoja de cálculo de Excel';
                break;
            case 'powerpoint':
                // Microsoft Office Online Viewer para PowerPoint
                viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${fileUrl}`;
                typeName = 'presentación de PowerPoint';
                break;
            default:
                return renderDownloadOnly();
        }

        return (
            <div className="office-viewer-container">
                {iframeLoading && (
                    <div className="iframe-loading">
                        <Spinner animation="border" variant="primary" />
                        <p>Cargando {typeName}...</p>
                    </div>
                )}
                <iframe
                    src={viewerUrl}
                    style={{ 
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: iframeLoading ? 'none' : 'block'
                    }}
                    onLoad={() => setIframeLoading(false)}
                    onError={() => {
                        setIframeLoading(false);
                        console.error('Error al cargar el archivo de Office:', fileUrl);
                    }}
                    title={`Visualizador de ${fileData.filename}`}
                />
                {/* Botón de descarga como alternativa */}
                <div className="office-viewer-controls">
                    <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={handleDownload}
                        className="download-alternative"
                    >
                        <FaDownload className="me-2" />
                        Descargar {getFileExtension().toUpperCase()}
                    </Button>
                </div>
            </div>
        );
    };

    const renderImageViewer = () => {
        const imageUrl = fileData.embed_url || fileData.direct_url || fileData.url;
        
        return (
            <div className="image-viewer-container">
                <div className="image-container">
                    <img 
                        src={imageUrl}
                        alt={fileData.filename}
                        style={{ 
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            display: 'block',
                            margin: '0 auto'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'block';
                        }}
                    />
                    <div style={{ display: 'none', textAlign: 'center', padding: '2rem' }}>
                        <p>No se pudo cargar la imagen</p>
                        <Button variant="primary" onClick={handleDownload}>
                            <FaDownload className="me-2" />
                            Descargar imagen
                        </Button>
                    </div>
                </div>
                <div className="image-viewer-controls">
                    <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={handleDownload}
                        className="download-alternative"
                    >
                        <FaDownload className="me-2" />
                        Descargar imagen
                    </Button>
                </div>
            </div>
        );
    };

    const renderTextViewer = () => {
        // Para archivos de texto, solo ofrecemos descarga por ahora
        return renderDownloadOnly();
    };

    const renderDownloadOnly = () => {
        const extension = getFileExtension().toUpperCase();
        const fileType = getFileType();
        
        let message = "Este tipo de archivo no puede previsualizarse en el navegador.";
        let icon = "bi-file-earmark-text";
        
        if (fileType === 'docx') {
            message = "Los archivos de Word pueden visualizarse usando Microsoft Office Online.";
            icon = "bi-file-earmark-word";
        } else if (fileType === 'excel') {
            message = "Los archivos de Excel pueden visualizarse usando Microsoft Office Online.";
            icon = "bi-file-earmark-excel";
        } else if (fileType === 'powerpoint') {
            message = "Los archivos de PowerPoint pueden visualizarse usando Microsoft Office Online.";
            icon = "bi-file-earmark-ppt";
        }

        return (
            <div className="download-only-container">
                <div className="download-message">
                    <i className={`bi ${icon}`} style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <h5 className="mt-3">Vista previa no disponible</h5>
                    <p className="text-muted">
                        {message}<br />
                        Puedes descargarlo para abrirlo en la aplicación correspondiente.
                    </p>
                    <Button variant="primary" onClick={handleDownload} className="mt-3">
                        <FaDownload className="me-2" />
                        Descargar {extension} - {fileData.filename}
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