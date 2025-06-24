# Error Pages System

## 📋 Componentes Disponibles

### Error Pages
- **Error404**: Página no encontrada (404)
- **Error500**: Error interno del servidor (500)
- **Error503**: Servicio no disponible (503)
- **ErrorBoundary**: Captura errores de JavaScript en la aplicación

### Hook de Manejo de Errores
- **useErrorHandler**: Hook personalizado para manejar errores de API

## 🚀 Uso

### 1. Error Pages en Rutas

Las páginas de error están configuradas automáticamente en las rutas:

```javascript
// Rutas específicas de error
/error/500  -> Error500 component
/error/503  -> Error503 component
/*          -> Error404 component (wildcard)
```

### 2. ErrorBoundary

El ErrorBoundary está envolviendo toda la aplicación en `App.js` y captura automáticamente errores de JavaScript:

```javascript
<ErrorBoundary>
  <AuthProvider>
    {/* Tu aplicación */}
  </AuthProvider>
</ErrorBoundary>
```

### 3. Hook useErrorHandler

Úsalo en tus componentes para manejar errores de API:

```javascript
import useErrorHandler from '../hooks/useErrorHandler';

const MyComponent = () => {
  const { handleError, createErrorMessage } = useErrorHandler();

  const fetchData = async () => {
    try {
      const response = await api.get('/data');
      // ... manejar éxito
    } catch (error) {
      handleError(error); // Automáticamente navega a la página de error apropiada
      const userMessage = createErrorMessage(error); // Mensaje amigable para el usuario
      setError(userMessage);
    }
  };
};
```

### 4. Manejo Automático en Interceptors

Los errores HTTP se manejan automáticamente:

- **401**: Redirige al login (si el usuario está autenticado)
- **500**: Navega a `/error/500`
- **503**: Navega a `/error/503`
- **Network errors**: Navega a `/error/503`

## 🎨 Características

### Error404
- Botón "Volver Atrás"
- Botón "Ir al Inicio"
- Diseño responsive
- Animaciones suaves

### Error500
- Botón "Recargar Página"
- Botón "Ir al Inicio"
- Guía de qué hacer

### Error503
- Botón "Reintentar" (con indicador de carga)
- Botón "Ir al Inicio"
- Guía de acciones recomendadas

### ErrorBoundary
- Captura errores de JavaScript
- Muestra stack trace en desarrollo
- Botón "Reportar Error" (copia detalles al clipboard)
- Información detallada del error

## 🔧 Personalización

### Personalización del Delay de Reintento

En `Error503.js`, puedes modificar el tiempo de delay del reintento:

```javascript
setTimeout(() => {
    window.location.reload();
}, 2000); // Cambiar 2000ms por el valor deseado
```

### Estilos

Los estilos están en `ErrorPages.css` y incluyen:
- Gradientes personalizados
- Animaciones CSS
- Diseño responsive
- Hover effects

## 📱 Responsive Design

Todas las páginas de error son completamente responsive:
- **Desktop**: Layout completo con todos los elementos
- **Tablet**: Botones apilados, tamaños ajustados
- **Mobile**: Layout vertical, iconos más pequeños

## 🔍 Testing

Para probar las páginas de error:

```javascript
// Error 404 - Navega a una ruta inexistente
/ruta-que-no-existe

// Error 500 - Accede directamente
/error/500

// Error 503 - Accede directamente
/error/503

// ErrorBoundary - Lanza un error en un componente
throw new Error('Test error');
```

## 🚨 Consideraciones de Producción

1. **Logging**: Los errores se logean en la consola. En producción, considera enviarlos a un servicio como Sentry.

2. **Monitoreo**: El ErrorBoundary incluye información útil para debugging.

3. **Retry Logic**: El Error503 incluye lógica de reintento manual que puede ajustarse según tus necesidades.

## 📊 Error Codes Handled

| Code | Description | Action |
|------|-------------|--------|
| 400 | Bad Request | Show local error message |
| 401 | Unauthorized | Redirect to login |
| 403 | Forbidden | Show local error message |
| 404 | Not Found | Show local or navigate to Error404 |
| 429 | Too Many Requests | Show local error message |
| 500 | Internal Server Error | Navigate to Error500 |
| 503 | Service Unavailable | Navigate to Error503 |
| Network | Connection Error | Navigate to Error503 |
| JavaScript | Runtime Error | Show ErrorBoundary | 