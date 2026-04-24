# Plottix — Generic Dataset Visualizer

Aplicación web para visualización interactiva de datasets genéricos. Desarrollada con **React** en el frontend y **Python (FastAPI)** en el backend, orquestada con **Docker Compose**, e implementando el **Patrón de Estrategia** tanto para el parseo de ficheros como para la generación de gráficos.

---

## Capturas

### Estado inicial

![Empty state](docs/empty.png)

> 📷 _Interfaz vacía antes de subir un dataset_

---

### Demo con gráficas

![Demo](docs/demo.png)

> 📷 _Varios gráficos generados sobre el dataset de ejemplo_

---

## Arquitectura

```
plottix/
├── docker-compose.yml
├── backend/
│   ├── main.py                     # FastAPI — endpoints REST
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── parsers/
│   │   ├── iparser.py              # ◆ Interfaz IParser (Strategy)
│   │   ├── csv_parser.py           # Estrategia: CSV (auto-detecta separador)
│   │   ├── txt_parser.py           # Estrategia: TXT / TSV
│   │   ├── excel_parser.py         # Estrategia: Excel (.xlsx, .xls)
│   │   └── factory.py              # Factory — resuelve parser por extensión
│   └── visualizers/
│       ├── ivisualizer.py          # ◆ Interfaz IVisualizer (Strategy)
│       ├── bar_chart.py            # Estrategia: Bar Chart
│       ├── line_chart.py           # Estrategia: Line Chart
│       ├── scatter_plot.py         # Estrategia: Scatter Plot
│       ├── histogram.py            # Estrategia: Histogram
│       └── factory.py              # Factory — resuelve visualizador por tipo
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── Dockerfile
    └── src/
        ├── main.jsx
        ├── App.jsx                 # Layout principal + estado global
        ├── index.css               # Variables CSS y estilos base
        ├── services/
        │   └── api.js              # Capa de comunicación con el backend
        └── components/
            ├── FileUpload.jsx      # Zona de drag & drop
            ├── DatasetInfo.jsx     # Chips de columnas y tipos
            ├── ChartModal.jsx      # Modal de configuración de gráfico
            └── ChartRenderer.jsx  # Renderizado con Recharts
```

---

## Patrón de Estrategia

El patrón se aplica en dos ejes independientes del sistema.

### Parsers de ficheros

```
IParser  (ABC)
    ├── CSVParser       →  .csv          (detecta separador , ; \t)
    ├── TXTParser       →  .txt  .tsv    (tab y whitespace)
    └── ExcelParser     →  .xlsx  .xls
```

`ParserFactory` recibe la extensión del fichero subido y devuelve la instancia correcta sin que el cliente conozca la implementación concreta.

### Visualizadores

```
IVisualizer  (ABC)
    ├── BarChartVisualizer
    ├── LineChartVisualizer
    ├── ScatterPlotVisualizer
    └── HistogramVisualizer
```

`VisualizerFactory` resuelve el tipo de gráfico seleccionado en el frontend y aplica la estrategia correspondiente. Cada estrategia implementa `generate()`, que detecta automáticamente si las columnas son numéricas o categóricas y agrega los datos de forma coherente.

---

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/upload` | Sube un fichero y devuelve `session_id`, columnas y tipos |
| `GET` | `/chart-types` | Lista los tipos de gráfico disponibles |
| `POST` | `/visualize` | Genera los datos del gráfico para las columnas seleccionadas |

Documentación interactiva disponible en `http://localhost:8000/docs` (Swagger UI).

---

## Flujo de uso

```
1. Upload    →  Arrastra o selecciona un fichero CSV / TXT / Excel
2. Inspect   →  Pulsa "Show columns" en el header para ver columnas y tipos
3. Configure →  Pulsa "+ Add chart" → selecciona X, Y y tipo de gráfico
4. Visualize →  El gráfico aparece en el panel derecho
5. Repeat    →  Añade tantos gráficos como necesites; se organizan en grid
```

---

## Puesta en marcha

### Requisitos

- Docker Desktop instalado y en ejecución
- Puertos `3000` y `8000` libres

### Arrancar

```bash
# Clonar / descomprimir el proyecto y entrar en la carpeta raíz
cd datavis

# Primera vez (descarga imágenes y construye)
docker compose up --build

# Siguientes veces
docker compose up
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |

### Parar

```bash
docker compose down
```

---

## Extender la aplicación

### Añadir un nuevo formato de fichero

1. Crear `backend/parsers/json_parser.py` extendiendo `IParser`
2. Implementar `parse()` y `supported_extensions`
3. Importarlo y añadirlo en `parsers/factory.py`

```python
# parsers/json_parser.py
class JSONParser(IParser):
    @property
    def supported_extensions(self): return ["json"]
    def parse(self, file): return pd.read_json(file)
```

### Añadir un nuevo tipo de gráfico

1. Crear `backend/visualizers/pie_chart.py` extendiendo `IVisualizer`
2. Implementar `generate()`, `chart_type` y `label`
3. Importarlo y añadirlo en `visualizers/factory.py`
4. Añadir el case correspondiente en `ChartRenderer.jsx`

El endpoint `/chart-types` lo expondrá automáticamente al frontend sin más cambios.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Gráficos | Recharts |
| HTTP client | Axios |
| Backend | Python 3.12 + FastAPI |
| Data processing | Pandas + NumPy |
| Contenerización | Docker + Docker Compose |