const { exec } = require("child_process");
const { default: nextConfig } = require("./next.config.mjs");

console.log("Verificando variables de entorno desde next.config.mjs...");
console.log("NEXT_PUBLIC_PUERTO:", nextConfig.env.NEXT_PUBLIC_PUERTO);

const puerto = parseInt(nextConfig.env.NEXT_PUBLIC_PUERTO);

if (!puerto) {
  console.error("Error: No se encontró el puerto en nextConfig.");
  process.exit(1);
}

console.log(`Iniciando Next.js en el puerto ${puerto}...`);

const comando = `next dev -p ${puerto}`;
const proceso = exec(comando);

proceso.stdout.pipe(process.stdout);
proceso.stderr.pipe(process.stderr);


