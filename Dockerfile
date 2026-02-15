# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .


RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
# Optional: Add custom nginx config if needed for SPA routing (usually needed for React Router)
# For now, default nginx config might suffice if no client-side routing is complex, 
# but usually we need to fallback 404 to index.html.
# Let's add a simple config inline or assume default works for root path.
# To be safe for SPA, let's create a minimal config.

# Add mjs support by modifying mime.types directly
RUN sed -i 's|application/javascript|application/javascript mjs|' /etc/nginx/mime.types

RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
