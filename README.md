# Harmos Front-End

Este proyecto es el frontend de Harmos, desarrollado en React. Incluye autenticación, rutas privadas y consumo de una API configurable por entorno.

---

## Requisitos

- [Node.js](https://nodejs.org/) (v16 o superior recomendado)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/) (v1.x)

---

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repo>
   cd harmos-web
   ```

2. **Instalar dependencias**
   ```bash
   yarn install
   ```

---

## Configuración de variables de entorno

El proyecto utiliza variables de entorno para definir la URL de la API y otros parámetros.  
**Siempre usá el prefijo `REACT_APP_` para que estén disponibles en el frontend.**

### Ejemplo de archivos `.env`:

#### `.env.development` (para desarrollo local)
```
REACT_APP_API_URL=http://localhost:8080
```

#### `.env.production` (para producción)
```
REACT_APP_API_URL=https://harmos-api-a77d01707678.herokuapp.com
```

> **Nota:**  
> Si cambiás alguna variable, reiniciá el servidor de desarrollo (`Ctrl+C` y luego `yarn start`).

---

## Comandos útiles

### Desarrollo (hot reload, debug, etc.)
```bash
yarn start
```
- Levanta el servidor de desarrollo en [http://localhost:3000](http://localhost:3000)
- Usa `.env.development` y/o `.env.local` para las variables de entorno.

### Build de producción
```bash
yarn build
```
- Genera la carpeta `build` optimizada para producción.
- Usa `.env.production` para las variables de entorno.

### Servir la build de producción localmente
```bash
yarn global add serve
yarn build
serve -s build
```
- Sirve la app en modo estático (ideal para testear la build final).

### Tests
```bash
yarn test
```

---

## Estructura de carpetas principal

- `src/api/` — Configuración de Axios y funciones para consumir la API.
- `src/context/` — Contexto de autenticación y lógica de login/logout.
- `src/components/` — Componentes reutilizables y rutas privadas.
- `src/containers/` — Vistas principales y formularios.
- `public/` — Archivos estáticos y HTML base.

---

## Autenticación y rutas privadas

- El login se realiza enviando email y password a `/api/authenticate` (ver función `loginUser` en `src/api/api.js`).
- Todas las rutas, excepto `/login`, son privadas y requieren estar autenticado.
- El token se guarda en `localStorage` bajo la clave `authToken`.

---

## Notas y buenas prácticas

- **Nunca subas `.env.local`** al repositorio (ya está en `.gitignore`).
- **No pongas secretos reales** en las variables de entorno del frontend.
- Si cambiás la URL de la API, recordá reiniciar el servidor de desarrollo.
- Si ves errores de CORS, asegurate de que el backend permita requests desde `localhost:3000`.

---

## ¿Problemas comunes?

- **El login no redirige:**  
  Verificá que la URL de la API tenga el protocolo (`http://` o `https://`).
- **Siempre usa la API productiva:**  
  Asegurate de estar usando el comando correcto (`yarn start` para desarrollo, `yarn build` para producción) y de tener el `.env` adecuado.
- **404 al hacer `yarn start`:**  
  Verificá que el script de `start` en `package.json` sea `"react-scripts start"`.

---

## Contacto

Para dudas o problemas, consultá con el equipo de desarrollo o revisá este README antes de preguntar.