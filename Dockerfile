# ── Stage 1: Build React frontend ──
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production image ──
FROM python:3.11-slim

# Create a non-root user with UID 1000
RUN useradd -m -u 1000 user

# Set up environment variables
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

# Install backend dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code with correct ownership
COPY --chown=user:user backend/app ./app

# Copy built frontend into static directory with correct ownership
COPY --chown=user:user --from=frontend-build /app/frontend/dist ./static

# Ensure correct permissions on the app directory
RUN chown -R user:user /home/user/app

# Switch to the non-root user
USER user

# HF Spaces requires port 7860
ENV PORT=7860
ENV DATABASE_URL=sqlite:///./utm_builder.db
ENV CORS_ORIGINS=*

EXPOSE 7860

# Start FastAPI serving both API and static frontend
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
