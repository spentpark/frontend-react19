# =============================
# Etapa 1: Build React (Vite)
# =============================
FROM node:24-alpine AS build

WORKDIR /usr/src/app

# URLs de la API que se hornean en el bundle. Por defecto son rutas relativas
# porque la imagen de Nginx hace de proxy inverso (`/api` y `/news-api`) bajo el
# mismo origen: así la app funciona igual abierta por localhost, por la IP de la
# LAN o por la IP pública, sin CORS ni depender de dónde esté el navegador.
# Se pueden sobreescribir con `--build-arg` si el frontend debe llamar
# directamente a otro backend.
ARG VITE_API_URL=/api
ARG VITE_NEWS_API_URL=/news-api
ENV VITE_API_URL=$VITE_API_URL \
    VITE_NEWS_API_URL=$VITE_NEWS_API_URL

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Build producción (Vite genera /dist)
RUN npm run build


# =============================
# Etapa 2: Servir con Nginx
# =============================
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build generado por Vite
COPY --from=build /usr/src/app/dist /usr/share/nginx/html


EXPOSE 8065

CMD ["nginx", "-g", "daemon off;"]
