# =============================
# Etapa 1: Build React (Vite)
# =============================
FROM node:20-alpine AS build

WORKDIR /usr/src/app

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
