import React, { Suspense } from "react";
import { Spinner } from "react-bootstrap";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "bootstrap/dist/css/bootstrap.min.css";
import 'bootstrap-icons/font/bootstrap-icons.css';

ReactDOM.render(
    <BrowserRouter>
        <Suspense
            fallback={
                <Spinner
                    animation="border"
                    variant="primary"
                    style={{
                        width: "4rem",
                        height: "4rem",
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                    }}
                />
            }
        >
            <App />
        </Suspense>,
    </BrowserRouter>,
    document.getElementById("root")
);

reportWebVitals();

// Service Worker DESHABILITADO para desarrollo
// Para evitar problemas de cache durante desarrollo
/*
// Registrar Service Worker para cacheo
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                // Service Worker registrado

                // Escuchar por actualizaciones
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    // Nueva versión del SW disponible

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nueva versión disponible
                            // Nueva versión lista, reinicia la app para aplicar cambios

                            // Opcional: mostrar notificación al usuario
                            if (window.confirm('Nueva versión disponible. ¿Recargar la página?')) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                            }
                        }
                    });
                });
            })
                  .catch((error) => {
        // Error al registrar Service Worker
      });
    });

    // Escuchar cuando el SW toma control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Service Worker ha tomado control
  });
}
*/

// LIMPIAR SERVICE WORKER EXISTENTE si hay uno registrado
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
        }
    });
}