"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  ClipboardList,
  MessageCircle,
  Mic,
  Plus,
  Users,
} from "lucide-react";

// Número de WhatsApp para consultas de venta (no el del bot).
// Se define al buildear; si falta, el botón manda un mail.
const WHATSAPP_CONTACTO = process.env.NEXT_PUBLIC_WHATSAPP_CONTACTO || "";
const EMAIL_CONTACTO = "manucavallera44@gmail.com";
// Video de 60 s (URL embebible de YouTube). Si falta, la sección no se muestra.
const VIDEO_URL = process.env.NEXT_PUBLIC_VIDEO_LANDING || "";

const contacto = WHATSAPP_CONTACTO
  ? {
      href: `https://wa.me/${WHATSAPP_CONTACTO.replace(/\D/g, "")}?text=${encodeURIComponent(
        "Hola, quiero saber más de TerneData"
      )}`,
      label: "Hablar por WhatsApp",
    }
  : {
      href: `mailto:${EMAIL_CONTACTO}?subject=${encodeURIComponent("Consulta TerneData")}`,
      label: "Escribinos",
    };

const btnPrimario =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950";
const btnSecundario =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-zinc-300 px-6 py-3 text-base font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900";

function BotonContacto({ className = btnSecundario }) {
  return (
    <a
      href={contacto.href}
      target={WHATSAPP_CONTACTO ? "_blank" : undefined}
      rel='noopener noreferrer'
      className={className}
    >
      <MessageCircle className='h-5 w-5' strokeWidth={2} aria-hidden />
      {contacto.label}
    </a>
  );
}

function BotonProbar({ className = btnPrimario }) {
  return (
    <Link href='/auth/register' className={className}>
      Probar gratis
      <ArrowRight className='h-5 w-5' strokeWidth={2} aria-hidden />
    </Link>
  );
}

/* ---------- Conversación de ejemplo (textos reales del bot) ---------- */

const conversacion = [
  { de: "yo", texto: "nació ternero RP 512 macho 38 kilos, madre 230" },
  {
    de: "bot",
    texto:
      "✅ Ternero anotado\n📋 RP: 512\n⚖️ Peso: 38 kg\n🐄 Sexo: Macho\n📅 Nacimiento: 2026-10-27",
  },
  { de: "yo", audio: "0:06" },
  {
    de: "bot",
    texto:
      "✅ Diarrea anotada\n🐄 Ternero RP: 498\n🔴 Severidad: Leve\n📋 Episodio #1\n📅 Fecha: 2026-10-27",
  },
];

function Chat() {
  return (
    <div
      className='mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-200 bg-[#efeae2] shadow-xl shadow-emerald-900/10 dark:border-zinc-800 dark:bg-[#0b141a] dark:shadow-black/40'
      aria-label='Ejemplo de conversación con el bot de TerneData por WhatsApp'
    >
      <div className='flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white dark:bg-[#202c33]'>
        <Image
          src='/images/logo.png'
          alt=''
          width={36}
          height={36}
          className='h-9 w-9 rounded-full bg-white object-contain p-0.5'
        />
        <div className='leading-tight'>
          <p className='text-sm font-semibold'>TerneData</p>
          <p className='text-xs text-white/70'>en línea</p>
        </div>
      </div>
      <ol className='flex flex-col gap-2 px-3 py-4'>
        {conversacion.map((m, i) => (
          <li
            key={i}
            style={{ "--i": i }}
            className={`landing-burbuja max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-snug shadow-sm ${
              m.de === "yo"
                ? "self-end rounded-tr-sm bg-[#d9fdd3] text-zinc-900 dark:bg-[#005c4b] dark:text-zinc-50"
                : "self-start rounded-tl-sm bg-white text-zinc-900 dark:bg-[#202c33] dark:text-zinc-100"
            }`}
          >
            {m.audio ? (
              <span className='flex items-center gap-2 py-0.5'>
                <Mic className='h-4 w-4 text-emerald-700 dark:text-emerald-300' strokeWidth={2} aria-hidden />
                <span className='h-1 w-28 rounded-full bg-zinc-400/60' aria-hidden />
                <span className='text-xs text-zinc-600 dark:text-zinc-300'>{m.audio}</span>
                <span className='sr-only'>Audio: el ternero 498 tiene diarrea leve</span>
              </span>
            ) : (
              <span className='whitespace-pre-line'>{m.texto}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Secciones ---------- */

const pasos = [
  {
    titulo: "Creá tu cuenta gratis",
    texto: "Registrate, armá tu campo y cargá tu celular en el perfil. Así el bot sabe que sos vos.",
  },
  {
    titulo: "Escribile al bot",
    texto: "Desde la app abrís el chat. Mandá un mensaje o un audio: nacimientos, pesadas, diarreas, tratamientos o litros.",
  },
  {
    titulo: "El bot lo anota",
    texto: "Entiende el mensaje, lo guarda en el ternero que corresponde y te confirma qué cargó.",
  },
  {
    titulo: "Mirás la guachera en el panel",
    texto: "Desde el celular o la compu, con los números del día y las alertas.",
  },
];

const preguntas = [
  {
    p: "¿Puedo escribirle al bot sin registrarme?",
    r: "No. El bot solo anota datos de números registrados, para que nadie cargue datos en tu campo. Registrarte es gratis y tarda un par de minutos.",
  },
  {
    p: "¿Tengo que instalar algo?",
    r: "No. El personal usa el WhatsApp que ya tiene. Vos entrás al panel desde el navegador o el celular.",
  },
  {
    p: "¿Y si en el campo no hay señal?",
    r: "WhatsApp guarda el mensaje y lo manda cuando vuelve la señal. El bot lo anota en ese momento.",
  },
  {
    p: "¿Lo pueden usar los empleados?",
    r: "Sí. Los invitás a tu campo como operarios y cada uno carga su celular en el perfil. Cargan datos, pero no borran ni cambian la configuración.",
  },
  {
    p: "¿Cuánto cuesta?",
    r: "Estamos definiendo los planes. Mientras tanto podés probarlo gratis y te avisamos antes de cobrar nada.",
  },
];

export default function Landing() {
  return (
    <div className='min-h-[100dvh] bg-zinc-50 text-zinc-900 [font-family:var(--font-geist-sans),system-ui,sans-serif] antialiased dark:bg-zinc-950 dark:text-zinc-100'>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .landing-burbuja {
            opacity: 0;
            animation: landing-entra 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            animation-delay: calc(0.4s + var(--i) * 0.7s);
          }
        }
        @keyframes landing-entra {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>

      {/* Encabezado */}
      <header className='sticky top-0 z-30 border-b border-zinc-200/80 bg-zinc-50/90 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/90'>
        <div className='mx-auto flex h-16 max-w-6xl items-center justify-between px-4'>
          <Link href='/' className='flex items-center gap-2 font-bold tracking-tight'>
            <Image src='/images/logo.png' alt='' width={32} height={32} className='h-8 w-8 rounded-full bg-white object-contain' />
            <span className='hidden text-lg sm:inline'>TerneData</span>
          </Link>
          <nav className='flex items-center gap-2 sm:gap-4'>
            <a href='#como-funciona' className='hidden text-sm font-medium text-zinc-600 hover:text-zinc-900 md:inline dark:text-zinc-400 dark:hover:text-zinc-100'>
              Cómo funciona
            </a>
            <a href='#preguntas' className='hidden text-sm font-medium text-zinc-600 hover:text-zinc-900 md:inline dark:text-zinc-400 dark:hover:text-zinc-100'>
              Preguntas
            </a>
            <Link href='/auth/login' className='px-2 text-sm font-semibold text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white'>
              Ingresar
            </Link>
            <BotonProbar className={`${btnPrimario} !px-4 !py-2 !text-sm`} />
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className='mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 md:grid-cols-[1.1fr_1fr] md:pb-24 md:pt-20'>
          <div>
            <h1 className='text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl'>
              Tu guachera ordenada por <span className='text-emerald-600 dark:text-emerald-400'>WhatsApp</span>
            </h1>
            <p className='mt-6 max-w-[48ch] text-lg leading-relaxed text-zinc-600 dark:text-zinc-400'>
              Tu equipo manda un mensaje o un audio. TerneData anota cada ternero y te muestra cómo viene la crianza.
            </p>
            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <BotonProbar />
              <BotonContacto />
            </div>
          </div>
          <Chat />
        </section>

        {/* Cómo funciona */}
        <section id='como-funciona' className='scroll-mt-20 border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40'>
          <div className='mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1fr_1.2fr] md:py-24'>
            <div className='order-2 mx-auto w-full max-w-[280px] md:order-1'>
              <Image
                src='/images/landing/app-celular.jpeg'
                alt='Panel de TerneData en el celular: total de terneros, vivos, mortalidad, ganancia de peso y calostrado'
                width={1080}
                height={1825}
                className='rounded-[2rem] border-4 border-zinc-900 shadow-2xl shadow-emerald-900/20 dark:border-zinc-700'
              />
            </div>
            <div className='order-1 md:order-2'>
              <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>Sin planillas ni cuadernos en el galpón</h2>
              <ol className='mt-10 flex flex-col gap-8'>
                {pasos.map((paso, i) => (
                  <li key={paso.titulo} className='grid grid-cols-[2.5rem_1fr] gap-4'>
                    <span className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600/10 text-base font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'>
                      {i + 1}
                    </span>
                    <div>
                      <h3 className='text-lg font-semibold'>{paso.titulo}</h3>
                      <p className='mt-1 max-w-[50ch] leading-relaxed text-zinc-600 dark:text-zinc-400'>{paso.texto}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Video (solo si hay URL) */}
        {VIDEO_URL && (
          <section className='mx-auto max-w-4xl px-4 py-16 md:py-24'>
            <h2 className='text-center text-3xl font-bold tracking-tight md:text-4xl'>Miralo en un minuto</h2>
            <div className='mt-10 aspect-video overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 dark:border-zinc-800'>
              <iframe
                src={VIDEO_URL}
                title='TerneData en un minuto'
                className='h-full w-full'
                loading='lazy'
                allow='accelerometer; encrypted-media; gyroscope; picture-in-picture'
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* Beneficios */}
        <section className='mx-auto max-w-6xl px-4 py-16 md:py-24'>
          <h2 className='max-w-[22ch] text-3xl font-bold tracking-tight md:text-4xl'>
            Sabés cómo viene cada ternero sin salir a preguntar
          </h2>
          <div className='mt-10 grid gap-4 md:grid-cols-3 md:grid-rows-2'>
            <article className='overflow-hidden rounded-2xl bg-zinc-900 text-zinc-100 md:col-span-2 md:row-span-2 dark:bg-zinc-900'>
              <div className='p-6 md:p-8'>
                <ClipboardList className='h-6 w-6 text-emerald-400' strokeWidth={2} aria-hidden />
                <h3 className='mt-4 text-xl font-semibold'>Mortalidad, diarreas y calostrado a la vista</h3>
                <p className='mt-2 max-w-[55ch] leading-relaxed text-zinc-400'>
                  El resumen de salud junta lo que carga tu equipo y te marca en rojo lo que necesita atención.
                </p>
              </div>
              <Image
                src='/images/landing/resumen-salud.png'
                alt='Resumen de salud del rodeo con mortalidad, morbilidad y terneros sanos'
                width={1399}
                height={573}
                className='w-full border-t border-zinc-800 object-cover object-top'
              />
            </article>
            <article className='rounded-2xl bg-emerald-600 p-6 text-white md:p-8'>
              <BellRing className='h-6 w-6' strokeWidth={2} aria-hidden />
              <h3 className='mt-4 text-xl font-semibold'>Alertas de bajo crecimiento</h3>
              <p className='mt-2 leading-relaxed text-emerald-50'>
                Con cada pesada calcula la ganancia diaria y te avisa qué terneros vienen atrasados.
              </p>
            </article>
            <article className='rounded-2xl border border-zinc-200 bg-white p-6 md:p-8 dark:border-zinc-800 dark:bg-zinc-900/60'>
              <Users className='h-6 w-6 text-emerald-600 dark:text-emerald-400' strokeWidth={2} aria-hidden />
              <h3 className='mt-4 text-xl font-semibold'>Todo el equipo, cada uno con su rol</h3>
              <p className='mt-2 leading-relaxed text-zinc-600 dark:text-zinc-400'>
                Dueño, veterinario y operarios en el mismo campo. Cada uno ve y carga lo que le toca.
              </p>
            </article>
          </div>
        </section>

        {/* Preguntas */}
        <section id='preguntas' className='scroll-mt-20 border-t border-zinc-200 dark:border-zinc-800'>
          <div className='mx-auto max-w-3xl px-4 py-16 md:py-24'>
            <h2 className='text-3xl font-bold tracking-tight md:text-4xl'>Preguntas frecuentes</h2>
            <div className='mt-8 divide-y divide-zinc-200 dark:divide-zinc-800'>
              {preguntas.map(({ p, r }) => (
                <details key={p} className='group py-5'>
                  <summary className='flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden'>
                    {p}
                    <Plus
                      className='h-5 w-5 shrink-0 text-zinc-500 transition-transform group-open:rotate-45'
                      strokeWidth={2}
                      aria-hidden
                    />
                  </summary>
                  <p className='mt-3 max-w-[60ch] leading-relaxed text-zinc-600 dark:text-zinc-400'>{r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className='px-4 pb-16 md:pb-24'>
          <div className='mx-auto max-w-6xl rounded-3xl bg-emerald-700 px-6 py-12 text-white md:px-12 md:py-16 dark:bg-emerald-800'>
            <h2 className='max-w-[20ch] text-3xl font-bold tracking-tight md:text-4xl'>
              Probalo con tu guachera esta semana
            </h2>
            <ul className='mt-6 flex flex-col gap-2 text-emerald-50 sm:flex-row sm:gap-6'>
              {["Sin tarjeta", "Te ayudamos a cargar los datos", "Sin compromiso"].map((t) => (
                <li key={t} className='flex items-center gap-2'>
                  <Check className='h-5 w-5' strokeWidth={2} aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <BotonProbar className={`${btnPrimario} !bg-white !text-emerald-800 hover:!bg-emerald-50`} />
              <BotonContacto
                className={`${btnSecundario} !border-white/40 !text-white hover:!bg-white/10`}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className='border-t border-zinc-200 dark:border-zinc-800'>
        <div className='mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between dark:text-zinc-400'>
          <p>© {new Date().getFullYear()} TerneData. Gestión de crianza de terneros.</p>
          <div className='flex flex-col gap-2 sm:flex-row sm:gap-6'>
            <Link href='/privacidad' className='hover:text-zinc-900 dark:hover:text-zinc-100'>
              Política de privacidad
            </Link>
            <a href={`mailto:${EMAIL_CONTACTO}`} className='hover:text-zinc-900 dark:hover:text-zinc-100'>
              {EMAIL_CONTACTO}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
