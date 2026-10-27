import Link from "next/link";

export const metadata = {
  title: "Política de privacidad | TerneData",
  description: "Qué datos guarda TerneData, para qué los usa y cómo pedir que los borremos.",
};

const EMAIL = "manucavallera44@gmail.com";
const ACTUALIZADA = "27 de octubre de 2026";

function Seccion({ titulo, children }) {
  return (
    <section className='mt-10'>
      <h2 className='text-xl font-semibold tracking-tight'>{titulo}</h2>
      <div className='mt-3 space-y-3 leading-relaxed text-zinc-700 dark:text-zinc-300'>{children}</div>
    </section>
  );
}

export default function Privacidad() {
  return (
    <div className='min-h-[100dvh] bg-zinc-50 text-zinc-900 [font-family:var(--font-geist-sans),system-ui,sans-serif] antialiased dark:bg-zinc-950 dark:text-zinc-100'>
      <header className='border-b border-zinc-200 dark:border-zinc-800'>
        <div className='mx-auto flex h-16 max-w-3xl items-center px-4'>
          <Link href='/' className='font-bold tracking-tight hover:text-emerald-700 dark:hover:text-emerald-400'>
            TerneData
          </Link>
        </div>
      </header>

      <main className='mx-auto max-w-3xl px-4 py-12 md:py-16'>
        <h1 className='text-3xl font-bold tracking-tight md:text-4xl'>Política de privacidad</h1>
        <p className='mt-3 text-sm text-zinc-500 dark:text-zinc-400'>Última actualización: {ACTUALIZADA}</p>

        <Seccion titulo='Quién es responsable'>
          <p>
            TerneData es un servicio de Manuel Cavallera, con domicilio en la República Argentina. Para cualquier
            consulta sobre tus datos escribí a{" "}
            <a href={`mailto:${EMAIL}`} className='font-medium text-emerald-700 underline dark:text-emerald-400'>
              {EMAIL}
            </a>
            .
          </p>
        </Seccion>

        <Seccion titulo='Qué datos guardamos'>
          <ul className='list-disc space-y-2 pl-5'>
            <li>
              <strong>Datos de tu cuenta:</strong> nombre, email, teléfono y contraseña (guardada cifrada, nadie
              puede leerla).
            </li>
            <li>
              <strong>Datos de tu campo:</strong> establecimientos, terneros, madres, pesadas, tratamientos, eventos,
              litros, rodeos y lo que cargues en el sistema.
            </li>
            <li>
              <strong>Mensajes al bot de WhatsApp:</strong> el texto y los audios que le mandás al bot, para poder
              registrar los datos. Los audios se transcriben a texto y no se guardan.
            </li>
            <li>
              <strong>Datos técnicos:</strong> registros del servidor (fecha, hora y dirección IP de cada pedido) para
              mantener el servicio seguro y resolver errores.
            </li>
          </ul>
        </Seccion>

        <Seccion titulo='Para qué los usamos'>
          <p>
            Solo para darte el servicio: registrar y mostrar los datos de tu campo, avisarte por email (por ejemplo,
            invitaciones o recuperar la contraseña) y responder tus consultas. No vendemos ni alquilamos tus datos, y
            no los usamos para publicidad.
          </p>
        </Seccion>

        <Seccion titulo='Quién más los procesa'>
          <p>Para que el servicio funcione usamos estos proveedores, que solo reciben lo necesario:</p>
          <ul className='list-disc space-y-2 pl-5'>
            <li>
              <strong>Anthropic (Claude):</strong> interpreta los mensajes que le mandás al bot.
            </li>
            <li>
              <strong>Groq:</strong> transcribe a texto los audios que le mandás al bot.
            </li>
            <li>
              <strong>WhatsApp (Meta):</strong> transporta los mensajes entre tu teléfono y el bot.
            </li>
            <li>
              <strong>Google (Gmail):</strong> envía los emails del sistema.
            </li>
            <li>
              <strong>Servidor contratado:</strong> aloja la aplicación y la base de datos.
            </li>
          </ul>
          <p>Algunos de estos proveedores procesan los datos fuera de la Argentina.</p>
        </Seccion>

        <Seccion titulo='Quién ve los datos de tu campo'>
          <p>
            Los datos de un establecimiento los ven solo las personas que el dueño invita a ese campo, cada una
            según su rol (dueño, veterinario u operario). El administrador del sistema puede acceder para dar
            soporte y resolver problemas.
          </p>
        </Seccion>

        <Seccion titulo='Cuánto tiempo los guardamos'>
          <p>
            Mientras tu cuenta esté activa. Si pedís la baja, borramos tu cuenta y los datos de los campos de los que
            sos dueño dentro de los 30 días, salvo lo que la ley nos obligue a conservar.
          </p>
        </Seccion>

        <Seccion titulo='Tus derechos y cómo borrar tu cuenta'>
          <p>
            Podés pedir ver, corregir o borrar tus datos, y dar de baja tu cuenta, escribiendo a{" "}
            <a href={`mailto:${EMAIL}`} className='font-medium text-emerald-700 underline dark:text-emerald-400'>
              {EMAIL}
            </a>{" "}
            desde el email de tu cuenta. Respondemos dentro de los 10 días hábiles.
          </p>
          <p>
            La Agencia de Acceso a la Información Pública, en su carácter de órgano de control de la Ley 25.326,
            tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus
            derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
          </p>
        </Seccion>

        <Seccion titulo='Cambios a esta política'>
          <p>
            Si cambiamos algo importante, lo publicamos en esta página y te avisamos por email. La fecha de arriba
            indica la última actualización.
          </p>
        </Seccion>
      </main>

      <footer className='border-t border-zinc-200 dark:border-zinc-800'>
        <div className='mx-auto max-w-3xl px-4 py-8 text-sm text-zinc-500 dark:text-zinc-400'>
          <Link href='/' className='hover:text-zinc-900 dark:hover:text-zinc-100'>
            Volver al inicio
          </Link>
        </div>
      </footer>
    </div>
  );
}
