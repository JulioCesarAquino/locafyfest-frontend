# ---- Build Stage ----
FROM node:18-alpine AS builder

WORKDIR /app

ARG VITE_API_URL
ARG VITE_STORAGE_URL
ARG VITE_APP_NAME=LocaFyFest
ARG VITE_APP_SUBTITLE=Festas e Eventos

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STORAGE_URL=$VITE_STORAGE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_SUBTITLE=$VITE_APP_SUBTITLE

COPY package*.json ./
RUN npm ci

COPY . .

# Build com base / (produção no servidor próprio)
RUN npx vite build --base /

# ---- Serve Stage ----
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
