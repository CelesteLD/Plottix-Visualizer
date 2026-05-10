# ServiceX + Plottix

**Máster en Ingeniería Informática — Universidad de La Laguna**  
Asignatura: Visualización y Diseño de Datos (VDD-IIIV)

---

## ¿Qué es esto?

Portal unificado de servicios desarrollado como práctica de la asignatura. Integra tres servicios independientes bajo una única interfaz web:

- **Operaciones numéricas** — ejecuta código C++ compilado en tiempo real (suma, resta, multiplicación, matrices…).
- **Procesamiento de imagen** — aplica filtros de nitidez sobre imágenes PNG usando paralelismo OpenMP y MPI.
- **Plottix** — herramienta de exploración y visualización de datos con soporte de Machine Learning. Permite cargar datasets CSV o Excel, gestionar valores faltantes, generar gráficos interactivos y entrenar modelos de clasificación, regresión y clustering.

---

## Puesta en marcha

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución
- Puertos `3000`, `5001` y `5002` libres

### Levantar el proyecto

Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

| Servicio | URL |
|---|---|
| Portal (interfaz unificada) | http://localhost:3000 |
| ServiceX backend | http://localhost:5001 |
| Plottix backend | http://localhost:5002 |

Para parar:

```bash
docker compose down
```

---

## Estructura del repositorio

```
ServiceX/
│
├── docker-compose.yml              ← levanta los 3 servicios
│
├── portal/                         ← SPA React (interfaz unificada)
│   └── src/
│       ├── App.jsx                 ← router principal
│       ├── global.css              ← tema claro, Inter + JetBrains Mono
│       ├── hooks/
│       │   └── useTheme.js
│       ├── services/
│       │   └── api.js              ← cliente HTTP para ServiceX (:5001) y Plottix (:5002)
│       └── components/
│           ├── HomePage.jsx        ← selector de servicios
│           ├── operations/         ← vista operaciones numéricas C++
│           ├── images/             ← vista procesamiento de imagen
│           └── visualize/          ← dashboard Plottix
│               ├── VisualizeView.jsx
│               ├── ChartCard.jsx
│               ├── ChartModal.jsx
│               ├── MissingValuesModal.jsx
│               ├── tokens.js       ← tokens de diseño y reglas de ejes
│               └── ml/             ← pestaña Machine Learning
│                   ├── MLModelSelector.jsx
│                   ├── MLConfigPanel.jsx
│                   ├── MLResultsPanel.jsx
│                   └── MLResultCard.jsx
│
├── plottix-service/
│   └── backend/                    ← Flask + matplotlib + scikit-learn
│       ├── app.py                  ← endpoints REST
│       ├── descriptor.json
│       ├── requirements.txt
│       ├── visualizers/
│       │   └── factory.py          ← genera PNG (matplotlib) o HTML (Folium)
│       └── ml/                     ← modelos ML (patrón Strategy)
│           ├── iml_model.py        ← interfaz abstracta IMLModel
│           ├── factory.py          ← MLModelFactory
│           ├── classification.py   ← RandomForest, SVM, KNN
│           ├── regression.py       ← LinearRegression, Ridge, RandomForest
│           └── clustering.py       ← KMeans (+ método del codo), DBSCAN
│
├── servicex-backend/               ← Flask + compilador C++ (g++ / mpic++)
│   ├── app.py
│   ├── binaries/                   ← código fuente C++ de las operaciones
│   └── descriptors/                ← JSON autodescriptivos de cada operación
│
└── docs/
    ├── architecture.md
    └── architecture.png
```

---

## Cómo usar el portal

1. Abre **http://localhost:3000**
2. En la página de inicio elige un servicio:

### Operaciones numéricas
Selecciona una operación del menú lateral, introduce los parámetros y pulsa **Ejecutar**. Puedes registrar nuevas operaciones subiendo un fichero `.cpp` — el backend lo compila en tiempo real con `g++` o `mpic++`.

### Procesamiento de imagen
Sube una imagen PNG, elige un filtro de nitidez (secuencial, OpenMP o MPI) y obtén la imagen procesada. También puedes registrar filtros `.cpp` personalizados.

### Plottix — Visualización y ML

**Pestaña Visualización:**
1. Sube un dataset CSV, TSV o Excel.
2. Gestiona los valores faltantes (eliminar, media, mediana, moda…).
3. Pulsa **+ Añadir gráfico** y configura el tipo de gráfico y las columnas.
4. Los gráficos se acumulan en el panel. Cada uno tiene un botón **↓ PNG** para descargar.

**Pestaña Machine Learning:**
1. Selecciona los modelos a entrenar (clasificación, regresión y/o clustering).
2. Configura features, target e hiperparámetros.
3. Para K-Means, usa el **método del codo** para elegir el número óptimo de clusters antes de entrenar.
4. Pulsa **Entrenar**. Se entrena en paralelo todos los modelos seleccionados.
5. La vista de **Comparación** muestra métricas y destaca el mejor modelo de cada categoría.
6. Cada modelo tiene su propia pestaña con visualizaciones detalladas: matriz de confusión, scatter predicho vs real, scatter PCA de clusters, importancia de features.

---

## Gráficos disponibles

| Tipo | Variables requeridas |
|---|---|
| Bar Chart | X categórica · Y numérica |
| Line Chart | X numérica · Y numérica |
| Scatter Plot | X numérica · Y numérica (+ línea de regresión) |
| Histogram | Y numérica |
| Pie Chart | X categórica · Y numérica opcional |
| Box Plot | X categórica · Y numérica |
| Density Curve (KDE) | Y numérica |
| Violin Plot | Y numérica |
| Correlogram | 2+ columnas numéricas |
| Mapa coroplético | X categórica (país) · Y numérica — interactivo Folium |

---

## Modelos de Machine Learning

| Categoría | Modelo | Métricas |
|---|---|---|
| Clasificación | Random Forest | Accuracy, F1, matriz de confusión |
| Clasificación | SVM (kernel RBF) | Accuracy, F1, matriz de confusión |
| Clasificación | K-Nearest Neighbors | Accuracy, F1, matriz de confusión |
| Regresión | Regresión Lineal | R², RMSE, MAE |
| Regresión | Ridge | R², RMSE, MAE |
| Regresión | Random Forest | R², RMSE, MAE |
| Clustering | K-Means | Silhouette score, inercia, método del codo |
| Clustering | DBSCAN | Silhouette score, puntos de ruido |

Todos los modelos incluyen visualización de importancia de features (cuando aplica) y proyección PCA 2D para clustering.

---

## Tecnologías

### Portal (frontend)
| Tecnología | Uso |
|---|---|
| React 18 + CRA | Framework de UI |
| Inter + JetBrains Mono | Tipografía |
| CSS variables | Sistema de tokens de diseño |

### Plottix (backend)
| Tecnología | Uso |
|---|---|
| Flask 3 | Servidor HTTP |
| pandas 2.2 | Carga y procesamiento de datos |
| matplotlib 3.9 | Generación de gráficos PNG |
| seaborn 0.13 | Gráficos estadísticos |
| scipy 1.13 | KDE, regresión lineal |
| scikit-learn 1.4 | Modelos de Machine Learning |
| GeoPandas 0.14 | Geometrías para el mapa coroplético |
| Folium 0.17 | Mapa interactivo con tooltips |
| gunicorn + gevent | Servidor WSGI de producción |

### ServiceX (backend)
| Tecnología | Uso |
|---|---|
| Flask 3 | Servidor HTTP |
| g++ / mpic++ | Compilación de servicios C++ en tiempo real |
| OpenMP / MPI | Paralelismo para procesamiento de imagen |

---

## Notas técnicas

- Los patrones de diseño **Strategy** y **Factory** se aplican tanto en los visualizadores (`visualizers/factory.py`) como en los modelos ML (`ml/factory.py`). Para añadir un nuevo gráfico o modelo basta con implementar la interfaz correspondiente (`IVisualizer` / `IMLModel`) y registrarlo en su factory.
- Las sesiones se guardan en memoria en el backend — no persisten entre reinicios del contenedor.
- El mapa coroplético es el único gráfico que devuelve HTML interactivo en lugar de PNG. Se renderiza en un `<iframe>` con el botón **⤢ Ampliar** para pantalla completa.
- Para K-Means, el endpoint `/api/ml/elbow` calcula la curva de inercia antes del entrenamiento para que el usuario elija `k` de forma informada.