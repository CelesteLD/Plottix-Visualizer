FROM python:3.12-slim

# System deps: g++, OpenMPI, libpng++, libpng-dev
RUN apt-get update && apt-get install -y \
      g++ \
      libpng-dev \
      libpng++-dev \
      openmpi-bin \
      libopenmpi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Compile numeric binaries (no extra libs needed)
RUN find binaries/ -name "*.cpp" | while read src; do \
      out="${src%.cpp}"; \
      g++ -O2 -o "$out" "$src"; \
    done

# Ensure runtime directories exist
RUN mkdir -p image_binaries uploads outputs

# Image binaries are compiled dynamically at runtime via /api/register

EXPOSE 5000

CMD ["python", "app.py"]