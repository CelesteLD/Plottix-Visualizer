# Arquitectura software — ServiceX Portal

## Descripción general

El **ServiceX Portal** es una aplicación web unificada que integra tres servicios cloud en una única interfaz:

1. **Operaciones Numéricas** — aritmética, álgebra matricial, operaciones C++ personalizadas
2. **Procesamiento de Imagen** — filtros con paralelismo OpenMP/MPI compilados desde C++
3. **Plottix — Visualización de Datos** — dashboard exploratorio con gráficos generados en servidor

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│                     ServiceX Portal                             │
│                                                                 │
│   docker compose up -d --build                                  │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  portal  (React SPA · nginx · puerto 3000)               │  │
│   │                                                          │  │
│   │   /  Home ──→  Selector de servicios                     │  │
│   │                    │                                     │  │
│   │       ┌────────────┼────────────┐                        │  │
│   │       ▼            ▼            ▼                        │  │
│   │  Operaciones    Imágenes    Plottix                      │  │
│   └──────────┬──────────┬──────────┬───────────────────────┘  │
│              │          │          │                           │
│         REST/JSON   REST/JSON  REST/JSON + PNG                 │
│              │          │          │                           │
│   ┌──────────▼──────────▼──┐  ┌───▼───────────────────────┐   │
│   │  servicex-backend       │  │  plottix-backend           │   │
│   │  Flask · puerto 5001    │  │  Flask · puerto 5002       │   │
│   │  C++ binaries           │  │  matplotlib · pandas       │   │
│   └─────────────────────────┘  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estructura del repositorio

```
Plottix-Visualizer/
├── docker-compose.yml          ← levanta los 3 servicios
│
├── portal/                     ← SPA React unificada
│   ├── src/
│   │   ├── App.jsx             ← router de vistas (home/ops/img/viz)
│   │   ├── global.css          ← tema ServiceX dark
│   │   ├── services/api.js     ← cliente para ambos backends
│   │   └── components/
│   │       ├── HomePage.jsx    ← selector de servicios
│   │       ├── operations/     ← vista operaciones numéricas
│   │       ├── images/         ← vista procesamiento de imagen
│   │       └── visualize/      ← vista Plottix dashboard
│   └── Dockerfile
│
├── servicex-backend/           ← Flask + compilador C++
│   ├── app.py
│   ├── binaries/               ← servicios predefinidos compilados
│   ├── descriptors/            ← JSON descriptores de cada servicio
│   └── Dockerfile
│
└── plottix-service/
    └── backend/                ← Flask + matplotlib
        ├── app.py
        ├── visualizers/factory.py
        └── Dockerfile
```

---

## Flujo de navegación

```
Usuario accede a localhost:3000
        │
        ▼
   Home Page
   ┌──────────────────────────────────────┐
   │  ⚙ Operaciones │ ⬡ Imágenes │ ◈ Plottix │
   └──────────────────────────────────────┘
        │                │              │
        ▼                ▼              ▼
  Lista ops         Lista filtros   Sube dataset
  Suma, resta...    Sharpen...      CSV / Excel
  + registrar .cpp  + registrar .cpp      │
        │                │         Gestiona faltantes
        ▼                ▼              │
  Ejecuta operación  Aplica filtro  Configura gráfico
  → resultado        → imagen PNG   (tipo, ejes, agg)
                                         │
                                    Servidor genera PNG
                                    (matplotlib)
                                         │
                                    Dashboard multi-gráfico
                                    + descarga PNG
```

---

## Tecnologías

| Componente | Tecnología | Puerto |
|---|---|---|
| Portal frontend | React 18 + CRA + nginx | 3000 |
| ServiceX backend | Flask 3.0 + Python 3.12 + g++/mpic++ | 5001 |
| Plottix backend | Flask 3.0 + Python 3.12 + matplotlib | 5002 |
| Contenedores | Docker + Docker Compose | — |

### Por qué rendering en servidor para Plottix

La versión original de Plottix renderizaba los gráficos en el navegador con Recharts (JavaScript). En la versión servicio, el servidor genera las imágenes PNG con **matplotlib**. Ventajas:

- El cliente no necesita conocer la estructura de los datos — solo muestra una imagen.
- El servidor puede procesar datasets de cientos de miles de filas sin limitaciones de memoria del navegador.
- Los PNG descargados son estáticos y reproducibles.

---

## Despliegue

```bash
# Clonar o descomprimir el proyecto
cd Plottix-Visualizer

# Levantar todo con un solo comando
docker compose up -d --build

# Acceder al portal
open http://localhost:3000
```

Los tres servicios quedan accesibles desde el portal. No es necesario levantar nada por separado.
