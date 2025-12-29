FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required to build packages like annoy
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy all app files
COPY . .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8888

# Run app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8888"]
