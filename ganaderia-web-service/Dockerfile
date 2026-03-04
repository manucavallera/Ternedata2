FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Copiar archivos estáticos al standalone
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public || true

EXPOSE 3002
CMD ["node", ".next/standalone/server.js"]
