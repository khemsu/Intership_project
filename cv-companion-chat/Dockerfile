# Stage 1: Build the React Vite app
FROM node:20 AS builder

# Set working directory
WORKDIR /app

# Copy package.json and lockfile
# COPY package*.json ./

# Install dependencies

# Copy source files
COPY . .
RUN npm ci

ENV VITE_API_BASE_URL=https://cv-backend-1092536125686.asia-south1.run.app/


# Build the app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Copy the build output from previous stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy the nginx template and startup script
COPY default.conf.template /etc/nginx/conf.d/default.conf.template
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose port 80
EXPOSE 8889

# Start Nginx
CMD ["/start.sh"]
