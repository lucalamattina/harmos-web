# Guía de Integración de Visualizadores de Archivos

Esta guía te explica cómo implementar visualizadores de archivos integrados en tu frontend para mantener la identidad de tu sitio, sin depender del visualizador externo de Cloudinary.

## 🚀 Endpoints Disponibles

### Obtener datos de visualización completos
```
GET /announcements/{id}/files
GET /files/viewer/{publicId}?filename={filename}&fileUrl={fileUrl}
```

### Respuesta del API
```json
{
  "public_id": "harmos/announcements/documento_1234567890.pdf",
  "filename": "documento.pdf", 
  "document_type": "pdf",
  "viewer_type": "pdf",
  "download_url": "https://res.cloudinary.com/.../fl_attachment/...",
  "direct_url": "https://res.cloudinary.com/.../harmos/announcements/documento_1234567890.pdf",
  "pdf_viewer_url": "https://res.cloudinary.com/.../documento_1234567890.pdf",
  "embed_url": "https://res.cloudinary.com/.../fl_immutable_cache/...",
  "pdf_viewer_urls": {
    "direct": "https://res.cloudinary.com/.../documento.pdf",
    "embed": "https://res.cloudinary.com/.../fl_immutable_cache/...",
    "mozilla_viewer": "https://mozilla.github.io/pdf.js/web/viewer.html?file=...",
    "pdf_js_viewer": "https://mozilla.github.io/pdf.js/web/viewer.html?file=..."
  },
  "page_previews": [
    {
      "page": 1,
      "preview_url": "https://res.cloudinary.com/.../f_jpg,pg_1,w_800,h_600,c_fit/...",
      "thumbnail_url": "https://res.cloudinary.com/.../f_jpg,pg_1,w_200,h_150,c_fit/..."
    }
  ],
  "thumbnail": "https://res.cloudinary.com/.../f_jpg,pg_1,w_200,h_150,c_fit/..."
}
```

## 🎯 Tipos de Visualizadores

### 1. Visualizador de PDFs - Opción Recomendada
**Usando PDF.js (librerïa de Mozilla)**

```html
<!-- HTML -->
<div id="pdf-viewer-container">
  <iframe 
    id="pdf-viewer"
    src="" 
    width="100%" 
    height="600px"
    style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
  </iframe>
</div>
```

```javascript
// JavaScript
function showPdfViewer(fileData) {
  const iframe = document.getElementById('pdf-viewer');
  
  // Usar la URL directa con PDF.js de Mozilla
  const pdfUrl = encodeURIComponent(fileData.embed_url);
  iframe.src = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${pdfUrl}`;
}
```

### 2. Visualizador de PDFs - Autohospedado
**Descarga y aloja PDF.js en tu servidor**

```html
<!-- HTML -->
<div id="custom-pdf-viewer">
  <iframe 
    src="/assets/pdfjs/web/viewer.html?file=ENCODED_PDF_URL"
    width="100%" 
    height="600px">
  </iframe>
</div>
```

### 3. Visualizador de Documentos Word/Excel/PowerPoint
**Usando previews como imágenes**

```html
<!-- HTML -->
<div id="document-viewer" class="document-viewer">
  <div class="viewer-toolbar">
    <button id="prev-page">← Anterior</button>
    <span id="page-info">Página 1 de N</span>
    <button id="next-page">Siguiente →</button>
    <a id="download-btn" href="" download="">⬇ Descargar</a>
  </div>
  <div class="page-container">
    <img id="current-page" src="" alt="Página del documento" />
  </div>
</div>
```

```css
/* CSS */
.document-viewer {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: #f9f9f9;
}

.viewer-toolbar {
  background: #fff;
  padding: 10px;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-container {
  padding: 20px;
  text-align: center;
  background: #fff;
}

.page-container img {
  max-width: 100%;
  height: auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.viewer-toolbar button {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.viewer-toolbar button:hover {
  background: #0056b3;
}

.viewer-toolbar button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

```javascript
// JavaScript
class DocumentViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentPage = 1;
    this.pages = [];
  }
  
  loadDocument(fileData) {
    this.pages = fileData.page_previews;
    this.setupUI(fileData);
    this.showPage(1);
  }
  
  setupUI(fileData) {
    document.getElementById('download-btn').href = fileData.download_url;
    document.getElementById('download-btn').download = fileData.filename;
    
    document.getElementById('prev-page').onclick = () => this.prevPage();
    document.getElementById('next-page').onclick = () => this.nextPage();
  }
  
  showPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > this.pages.length) return;
    
    this.currentPage = pageNumber;
    const page = this.pages[pageNumber - 1];
    
    document.getElementById('current-page').src = page.preview_url;
    document.getElementById('page-info').textContent = `Página ${pageNumber} de ${this.pages.length}`;
    
    document.getElementById('prev-page').disabled = pageNumber === 1;
    document.getElementById('next-page').disabled = pageNumber === this.pages.length;
  }
  
  nextPage() {
    this.showPage(this.currentPage + 1);
  }
  
  prevPage() {
    this.showPage(this.currentPage - 1);
  }
}

// Uso
const viewer = new DocumentViewer('document-viewer');
viewer.loadDocument(fileData);
```

### 4. Visualizador Universal (React/Vue/Angular)

```jsx
// React Component
import React, { useState, useEffect } from 'react';

const FileViewer = ({ fileData }) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const renderViewer = () => {
    switch (fileData.viewer_type) {
      case 'pdf':
        return (
          <iframe
            src={fileData.pdf_viewer_urls.mozilla_viewer}
            width="100%"
            height="600px"
            style={{ border: 'none', borderRadius: '8px' }}
          />
        );
        
      case 'image_pages':
        const page = fileData.page_previews[currentPage - 1];
        return (
          <div className="document-viewer">
            <div className="viewer-toolbar">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ← Anterior
              </button>
              <span>Página {currentPage} de {fileData.page_previews.length}</span>
              <button 
                onClick={() => setCurrentPage(Math.min(fileData.page_previews.length, currentPage + 1))}
                disabled={currentPage === fileData.page_previews.length}
              >
                Siguiente →
              </button>
              <a href={fileData.download_url} download={fileData.filename}>
                ⬇ Descargar
              </a>
            </div>
            <div className="page-container">
              <img src={page?.preview_url} alt={`Página ${currentPage}`} />
            </div>
          </div>
        );
        
      case 'image':
        return (
          <div className="image-viewer">
            <img src={fileData.image_url} alt={fileData.filename} />
            <a href={fileData.download_url} download={fileData.filename}>
              ⬇ Descargar
            </a>
          </div>
        );
        
      case 'download_only':
        return (
          <div className="download-only">
            <p>{fileData.message}</p>
            <a href={fileData.download_url} download={fileData.filename}>
              ⬇ Descargar {fileData.filename}
            </a>
          </div>
        );
        
      default:
        return <div>Tipo de archivo no soportado</div>;
    }
  };
  
  return (
    <div className="file-viewer">
      <h3>{fileData.filename}</h3>
      {renderViewer()}
    </div>
  );
};

export default FileViewer;
```

## 🎨 Estilos Personalizados

```css
/* Tema personalizado para mantener tu identidad */
.file-viewer {
  font-family: 'Tu-Fuente', sans-serif;
  border: 2px solid #tu-color-principal;
  border-radius: 12px;
  overflow: hidden;
  background: #tu-color-fondo;
}

.viewer-toolbar {
  background: linear-gradient(90deg, #tu-color-1, #tu-color-2);
  color: white;
  padding: 15px;
}

.viewer-toolbar button {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.3);
  padding: 8px 16px;
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.viewer-toolbar button:hover {
  background: rgba(255,255,255,0.3);
}
```

## 📱 Responsive y Mobile

```css
/* Responsive design */
@media (max-width: 768px) {
  .file-viewer iframe {
    height: 400px;
  }
  
  .viewer-toolbar {
    flex-direction: column;
    gap: 10px;
  }
  
  .viewer-toolbar button {
    flex: 1;
  }
}
```

## 🔒 Consideraciones de Seguridad

1. **URLs firmadas**: Para archivos privados, usa `signed_url` en lugar de `direct_url`
2. **CORS**: Las URLs de Cloudinary ya tienen CORS configurado
3. **Validación**: Siempre valida que el usuario tenga permisos para ver el archivo

## 🚀 Implementación Paso a Paso

### Paso 1: Obtener datos del archivo
```javascript
async function loadFileViewer(publicId, filename) {
  const response = await fetch(`/files/viewer/${publicId}?filename=${filename}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const fileData = await response.json();
  return fileData;
}
```

### Paso 2: Renderizar el visualizador
```javascript
const fileData = await loadFileViewer('harmos/announcements/doc_123.pdf', 'documento.pdf');

// Para PDFs
if (fileData.viewer_type === 'pdf') {
  showPdfViewer(fileData);
}

// Para documentos de Office
if (fileData.viewer_type === 'image_pages') {
  showDocumentViewer(fileData);
}
```

### Paso 3: Manejar errores
```javascript
try {
  const fileData = await loadFileViewer(publicId, filename);
  renderViewer(fileData);
} catch (error) {
  showErrorMessage('No se pudo cargar el archivo');
}
```

## 🎯 Ventajas de esta Implementación

✅ **Mantiene tu identidad visual** - Los visualizadores usan tu diseño  
✅ **No redirecciona** - Los usuarios permanecen en tu sitio  
✅ **Múltiples formatos** - PDF, Word, Excel, PowerPoint, imágenes  
✅ **Responsive** - Funciona en móviles y desktop  
✅ **Fallback** - Si falla el visualizador, siempre pueden descargar  
✅ **Performance** - Las imágenes se cargan bajo demanda  
✅ **Accesible** - Soporta navegación por teclado  

## 📚 Recursos Adicionales

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [Cloudinary Transformation Reference](https://cloudinary.com/documentation/image_transformation_reference)
- [CORS Configuration](https://cloudinary.com/documentation/upload_images#cross_origin_resource_sharing_cors)

## 🔧 Troubleshooting

**Problema**: El PDF no se carga en el iframe  
**Solución**: Usa `embed_url` en lugar de `direct_url`

**Problema**: Las imágenes de preview se ven borrosas  
**Solución**: Ajusta los parámetros `w_` y `h_` en `getDocumentPreviewUrl()`

**Problema**: No funciona en algunos navegadores  
**Solución**: Implementa fallback con `page_previews` como imágenes 