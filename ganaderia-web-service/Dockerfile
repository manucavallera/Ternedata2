FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

ENV NEXT_PUBLIC_ENTORNO=produccion
ENV NEXT_PUBLIC_ENV_MS_BUSINESS_API_URL_PRODUCCION=https://manu-bussines.gygo4l.easypanel.host
ENV NEXT_PUBLIC_ENV_MS_SECURITY_API_URL_PRODUCCION=https://manu-security.gygo4l.easypanel.host
ENV NEXT_PUBLIC_API_URL=https://manu-security.gygo4l.easypanel.host

RUN npm run build

RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public || true

EXPOSE 3002
ENV PORT=3002
CMD ["node", ".next/standalone/server.js"]
