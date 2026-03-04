import dotenv from "dotenv";
import path from "path";

// Cargar .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.produccion") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_PUERTO:
      process.env.NEXT_PUBLIC_ENTORNO === "desarrollo"
        ? process.env.NEXT_PUBLIC_PUERTO_DESARROLLO
        : process.env.NEXT_PUBLIC_PUERTO_PRODUCCION,
  },
};

export default nextConfig;

