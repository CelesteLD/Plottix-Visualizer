import os
import re
import json
import uuid
import subprocess
import tempfile
import shutil
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR          = os.path.dirname(__file__)
BINARIES_DIR      = os.path.join(BASE_DIR, "binaries")
IMG_BINARIES_DIR  = os.path.join(BASE_DIR, "image_binaries")
DESCRIPTORS_DIR   = os.path.join(BASE_DIR, "descriptors")
UPLOADS_DIR       = os.path.join(BASE_DIR, "uploads")
OUTPUTS_DIR       = os.path.join(BASE_DIR, "outputs")

for d in (UPLOADS_DIR, OUTPUTS_DIR, IMG_BINARIES_DIR):
    os.makedirs(d, exist_ok=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_descriptor(operation_id):
    path = os.path.join(DESCRIPTORS_DIR, f"{operation_id}.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)

def load_all_descriptors():
    descriptors = []
    for filename in sorted(os.listdir(DESCRIPTORS_DIR)):
        if filename.endswith(".json"):
            with open(os.path.join(DESCRIPTORS_DIR, filename)) as f:
                descriptors.append(json.load(f))
    return descriptors

def safe_id(name: str) -> str:
    """Convert a human name into a safe snake_case identifier."""
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = s.strip("_")
    return s or "operation"


# ── Catalogue ─────────────────────────────────────────────────────────────────

@app.route("/api/operations", methods=["GET"])
def get_operations():
    try:
        return jsonify({"operations": load_all_descriptors()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Register a new service ────────────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
def register_service():
    """
    Accepts multipart/form-data:
      - file        : the .cpp source file
      - meta        : JSON string with { name, description, category,
                       service_type ("numeric"|"image"),
                       parallel_type ("none"|"openmp"|"mpi"),   # only for image
                       inputs: [{name, label, type, placeholder?, options?, default?}] }
    Compiles the binary, writes the descriptor, returns the new descriptor.
    """
    try:
        # ── 1. Validate file ──────────────────────────────────────────────────
        if "file" not in request.files:
            return jsonify({"error": "No se recibió ningún fichero fuente (.cpp)"}), 400

        src_file = request.files["file"]
        if not src_file.filename.endswith(".cpp"):
            return jsonify({"error": "El fichero debe tener extensión .cpp"}), 400

        # ── 2. Parse metadata ─────────────────────────────────────────────────
        meta_raw = request.form.get("meta")
        if not meta_raw:
            return jsonify({"error": "Falta el campo 'meta' con los metadatos del servicio"}), 400

        try:
            meta = json.loads(meta_raw)
        except json.JSONDecodeError as e:
            return jsonify({"error": f"JSON de metadatos inválido: {e}"}), 400

        name          = (meta.get("name") or "").strip()
        description   = (meta.get("description") or "").strip()
        category      = (meta.get("category") or "General").strip()
        service_type  = meta.get("service_type", "numeric")   # "numeric" | "image"
        parallel_type = meta.get("parallel_type", "none")     # "none" | "openmp" | "mpi"
        inputs        = meta.get("inputs", [])

        if not name:
            return jsonify({"error": "El campo 'name' es obligatorio"}), 400
        if service_type not in ("numeric", "image"):
            return jsonify({"error": "service_type debe ser 'numeric' o 'image'"}), 400

        # ── 3. Generate unique ID ─────────────────────────────────────────────
        base_id  = safe_id(name)
        op_id    = base_id
        counter  = 1
        while os.path.exists(os.path.join(DESCRIPTORS_DIR, f"{op_id}.json")):
            op_id = f"{base_id}_{counter}"
            counter += 1

        # ── 4. Save source to a temp file and compile ─────────────────────────
        tmp_dir = tempfile.mkdtemp()
        try:
            src_path = os.path.join(tmp_dir, f"{op_id}.cpp")
            src_file.save(src_path)

            if service_type == "image":
                bin_dir  = IMG_BINARIES_DIR
                bin_path = os.path.join(bin_dir, op_id)
                if parallel_type == "mpi":
                    compile_cmd = ["mpic++", "-O2", "-o", bin_path, src_path, "-lpng"]
                elif parallel_type == "openmp":
                    compile_cmd = ["g++", "-O2", "-fopenmp", "-o", bin_path, src_path, "-lpng"]
                else:
                    compile_cmd = ["g++", "-O2", "-o", bin_path, src_path, "-lpng"]
            else:
                bin_dir  = BINARIES_DIR
                bin_path = os.path.join(bin_dir, op_id)
                compile_cmd = ["g++", "-O2", "-o", bin_path, src_path]

            result = subprocess.run(
                compile_cmd,
                capture_output=True, text=True, timeout=60
            )

            if result.returncode != 0:
                error_msg = result.stderr.strip() or result.stdout.strip()
                return jsonify({
                    "error": "Error de compilación",
                    "details": error_msg
                }), 422

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

        # ── 5. Build and save descriptor ──────────────────────────────────────
        descriptor = {
            "id":          op_id,
            "name":        name,
            "description": description,
            "binary":      op_id,
            "category":    category,
            "inputs":      inputs,
        }

        if service_type == "image":
            descriptor["type"]          = "image"
            descriptor["parallel_type"] = parallel_type

        desc_path = os.path.join(DESCRIPTORS_DIR, f"{op_id}.json")
        with open(desc_path, "w") as f:
            json.dump(descriptor, f, ensure_ascii=False, indent=2)

        return jsonify({"ok": True, "descriptor": descriptor}), 201

    except subprocess.TimeoutExpired:
        return jsonify({"error": "La compilación tardó demasiado (>60s)"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Delete a service ──────────────────────────────────────────────────────────

@app.route("/api/operations/<operation_id>", methods=["DELETE"])
def delete_operation(operation_id):
    """Remove a user-registered service (descriptor + binary). Built-ins are protected."""
    BUILTIN_IDS = {
        "sum", "sum_float", "substract_float", "quotient",
        "multiply", "divide", "matrix_add", "matrix_multiply",
        "sharpen_omp", "sharpen_mpi"
    }
    if operation_id in BUILTIN_IDS:
        return jsonify({"error": "No se pueden eliminar los servicios predefinidos"}), 403

    descriptor = load_descriptor(operation_id)
    if not descriptor:
        return jsonify({"error": "Operación no encontrada"}), 404

    is_image = descriptor.get("type") == "image"
    bin_dir  = IMG_BINARIES_DIR if is_image else BINARIES_DIR

    # Remove binary
    for ext in ("", ".out"):
        p = os.path.join(bin_dir, f"{operation_id}{ext}")
        if os.path.exists(p):
            os.remove(p)

    # Remove descriptor
    os.remove(os.path.join(DESCRIPTORS_DIR, f"{operation_id}.json"))

    return jsonify({"ok": True})


# ── Run numeric operation ─────────────────────────────────────────────────────

@app.route("/api/run/<operation_id>", methods=["POST"])
def run_operation(operation_id):
    try:
        descriptor = load_descriptor(operation_id)
        if not descriptor:
            return jsonify({"error": f"Operación '{operation_id}' no encontrada"}), 404
        if descriptor.get("type") == "image":
            return jsonify({"error": "Usa /api/run-image para operaciones de imagen"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"error": "No se proporcionaron datos de entrada"}), 400

        args = []
        for inp in descriptor["inputs"]:
            value = data.get(inp["name"])
            if value is None:
                return jsonify({"error": f"Falta el campo: {inp['name']}"}), 400
            args.append(str(value))

        binary_path = os.path.join(BINARIES_DIR, descriptor["binary"])
        if not os.path.exists(binary_path):
            return jsonify({"error": f"Binario '{descriptor['binary']}' no encontrado"}), 500

        result = subprocess.run(
            [binary_path] + args,
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            return jsonify({"error": result.stderr.strip()}), 500

        return jsonify({
            "operation": descriptor["name"],
            "inputs":    data,
            "result":    result.stdout.strip()
        })

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Tiempo de espera agotado"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Run image operation ───────────────────────────────────────────────────────

@app.route("/api/run-image/<operation_id>", methods=["POST"])
def run_image_operation(operation_id):
    try:
        descriptor = load_descriptor(operation_id)
        if not descriptor or descriptor.get("type") != "image":
            return jsonify({"error": f"Operación de imagen '{operation_id}' no encontrada"}), 404

        if "image" not in request.files:
            return jsonify({"error": "No se recibió imagen (campo: 'image')"}), 400

        file = request.files["image"]
        if file.filename == "":
            return jsonify({"error": "Nombre de fichero vacío"}), 400

        job_id      = uuid.uuid4().hex
        ext         = os.path.splitext(file.filename)[1].lower() or ".png"
        input_path  = os.path.join(UPLOADS_DIR, f"{job_id}_in{ext}")
        output_path = os.path.join(OUTPUTS_DIR, f"{job_id}_out.png")
        file.save(input_path)

        binary_path = os.path.join(IMG_BINARIES_DIR, descriptor["binary"])
        if not os.path.exists(binary_path):
            return jsonify({"error": f"Binario '{descriptor['binary']}' no encontrado"}), 500

        parallel_type = descriptor.get("parallel_type", "none")

        if parallel_type == "mpi":
            processes = int(request.form.get("processes", 4))
            if processes not in (2, 4):
                processes = 4
            cmd = [
                "mpirun", "--allow-run-as-root", "--oversubscribe",
                "-np", str(processes),
                binary_path, input_path, output_path
            ]
        elif parallel_type == "openmp":
            threads = int(request.form.get("threads", 4))
            if threads not in (2, 4):
                threads = 4
            cmd = [binary_path, input_path, output_path, str(threads)]
        else:
            cmd = [binary_path, input_path, output_path]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        try:
            os.remove(input_path)
        except Exception:
            pass

        if result.returncode != 0:
            return jsonify({"error": result.stderr.strip() or "Fallo en la ejecución"}), 500
        if not os.path.exists(output_path):
            return jsonify({"error": "El binario no generó imagen de salida"}), 500

        timing = {}
        try:
            timing = json.loads(result.stdout.strip())
        except Exception:
            pass

        return jsonify({
            "operation": descriptor["name"],
            "job_id":    job_id,
            "timing":    timing
        })

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Tiempo de espera agotado (>120s)"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Serve result image ────────────────────────────────────────────────────────

@app.route("/api/result/<job_id>", methods=["GET"])
def get_result_image(job_id):
    if not job_id.isalnum():
        return jsonify({"error": "job_id inválido"}), 400
    output_path = os.path.join(OUTPUTS_DIR, f"{job_id}_out.png")
    if not os.path.exists(output_path):
        return jsonify({"error": "Resultado no encontrado"}), 404
    return send_file(output_path, mimetype="image/png")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)