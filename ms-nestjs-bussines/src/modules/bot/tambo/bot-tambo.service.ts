import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MadreEntity } from '../../madres/entities/madre.entity';
import { TamboService } from '../../tambo/tambo.service';
import {
  ItemPendiente,
  Pendientes,
  TIPOS_EVENTO,
  TipoEvento,
} from '../../tambo/reproduccion.logic';

// Acciones del bot para el rodeo lechero: eventos reproductivos de una vaca
// ("tacto 331 preñada") y la consulta de pendientes ("qué vacas hay para tactar").

const NOMBRE_EVENTO: Record<TipoEvento, string> = {
  parto: 'Parto',
  inseminacion: 'Inseminación',
  tacto: 'Tacto',
  parche: 'Parche',
  secado: 'Secado',
  preparto: 'Preparto',
  aborto: 'Aborto',
  rechazo: 'Rechazo',
};

const NOMBRE_PENDIENTE: Record<keyof Pendientes, string> = {
  sin_inseminar: 'OK para inseminar',
  a_reconfirmar: 'Para reconfirmar preñez',
  a_tactar: 'Para tactar',
  reemparche: 'Para reemparchar',
  a_secar: 'Para secar',
  a_preparto: 'Para pasar a preparto',
  parto_proximo: 'Parto próximo',
};

const MAX_POR_GRUPO = 15;

export interface ContextoTambo {
  idEstablecimiento: number;
  idUsuario?: number;
  nombreEstablecimiento?: string;
  fecha: string; // ya validada: YYYY-MM-DD, no futura
}

export interface ResultadoTambo {
  success: boolean;
  accion: string;
  mensaje: string;
  data?: any;
}

// Claude a veces manda "inseminación", "preñez" o "vacía": se lleva al valor que espera el backend.
export function normalizarTipo(valor: any): TipoEvento | null {
  const t = String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
  if (!t) return null;
  if (t.startsWith('insemin') || t === 'servicio') return 'inseminacion';
  if (t.startsWith('tact') || t.startsWith('ecograf')) return 'tacto';
  if (
    t.startsWith('parch') ||
    t.startsWith('reparch') ||
    t.startsWith('reemparch')
  )
    return 'parche';
  if (t.startsWith('sec')) return 'secado';
  if (t.startsWith('prepart')) return 'preparto';
  if (t.startsWith('part') || t.startsWith('pari')) return 'parto';
  if (t.startsWith('abort')) return 'aborto';
  if (t.startsWith('rechaz') || t.startsWith('descart')) return 'rechazo';
  return (TIPOS_EVENTO as readonly string[]).includes(t)
    ? (t as TipoEvento)
    : null;
}

export function normalizarResultado(valor: any): 'preñada' | 'vacia' | null {
  const t = String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
  if (t.startsWith('pren') || t === 'positivo' || t === 'si') return 'preñada';
  if (t.startsWith('vaci') || t === 'negativo' || t === 'no') return 'vacia';
  return null;
}

export function formatearPendientes(
  p: Pendientes,
  grupo?: keyof Pendientes | null,
): string {
  const grupos = (
    grupo ? [grupo] : (Object.keys(NOMBRE_PENDIENTE) as (keyof Pendientes)[])
  ).filter((g) => p[g]?.length);
  if (grupos.length === 0) {
    return grupo
      ? `✅ No hay vacas en "${NOMBRE_PENDIENTE[grupo]}".`
      : '✅ No hay pendientes en el tambo.';
  }
  const lineas = grupos.map((g) => {
    const items = [...p[g]].sort((a, b) => b.dias - a.dias);
    const rps = items.slice(0, MAX_POR_GRUPO).map(etiquetaVaca).join(', ');
    const resto =
      items.length > MAX_POR_GRUPO
        ? ` y ${items.length - MAX_POR_GRUPO} más`
        : '';
    return `*${NOMBRE_PENDIENTE[g]}* (${items.length}): ${rps}${resto}`;
  });
  return `🐄 Pendientes del tambo\n${lineas.join('\n')}`;
}

function etiquetaVaca(i: ItemPendiente): string {
  return i.rp_madre != null ? `RP ${i.rp_madre}` : i.nombre || `#${i.id_madre}`;
}

const GRUPOS_VALIDOS = Object.keys(NOMBRE_PENDIENTE) as (keyof Pendientes)[];

@Injectable()
export class BotTamboService {
  constructor(
    private readonly tamboService: TamboService,
    @InjectRepository(MadreEntity)
    private readonly madreRepo: Repository<MadreEntity>,
  ) {}

  async registrarEvento(
    body: Record<string, any>,
    ctx: ContextoTambo,
  ): Promise<ResultadoTambo> {
    const accion = 'evento_tambo';
    const tipo = normalizarTipo(body.tipo);
    if (!tipo) {
      return {
        success: false,
        accion,
        mensaje:
          '🤔 No entendí qué evento es. Puede ser parto, inseminación, tacto, parche, secado, preparto, aborto o rechazo.',
      };
    }
    const rp = parseInt(body.rp_madre) || 0;
    if (rp <= 0) {
      return {
        success: false,
        accion,
        mensaje: '👂 Me falta el RP de la vaca. Decímelo y lo anoto.',
      };
    }
    const resultado =
      tipo === 'tacto' ? normalizarResultado(body.resultado) : null;
    if (tipo === 'tacto' && !resultado) {
      return {
        success: false,
        accion,
        mensaje: `👂 ¿El tacto de la RP ${rp} dio preñada o vacía? Mandámelo de nuevo con el resultado.`,
      };
    }

    const madre = await this.madreRepo.findOne({
      where: { rp_madre: rp, id_establecimiento: ctx.idEstablecimiento },
    });
    if (!madre) {
      return {
        success: false,
        accion,
        mensaje: `👀 No encontré la vaca RP ${rp} en tu establecimiento.`,
      };
    }

    const dias = parseInt(body.dias_gestacion);
    const dto: any = {
      id_madre: madre.id_madre,
      tipo,
      fecha: ctx.fecha,
      observacion: body.observacion
        ? String(body.observacion).slice(0, 500)
        : undefined,
    };
    if (resultado) dto.resultado = resultado;
    if (resultado === 'preñada' && dias >= 20 && dias <= 290)
      dto.dias_gestacion = dias;
    const toro = String(body.toro ?? '').trim();
    if (tipo === 'inseminacion' && toro && toro.toUpperCase() !== 'N/A')
      dto.toro = toro.slice(0, 100);

    let estado: any;
    try {
      ({ madre: estado } = await this.tamboService.crearEvento(
        ctx.idEstablecimiento,
        dto,
        ctx.idUsuario,
      ));
    } catch (err) {
      if (err instanceof HttpException) {
        return {
          success: false,
          accion,
          mensaje: `⚠️ No lo pude anotar: ${err.message}`,
        };
      }
      throw err;
    }

    let mensaje = `✅ Anotado: ${NOMBRE_EVENTO[tipo]}\n🐮 Vaca RP ${rp}\n📅 Fecha: ${ctx.fecha}`;
    if (resultado)
      mensaje += `\n🔎 Resultado: ${resultado === 'preñada' ? 'preñada' : 'vacía'}`;
    if (dto.dias_gestacion) mensaje += ` (${dto.dias_gestacion} días)`;
    if (dto.toro) mensaje += `\n🧬 Pajuela: ${dto.toro}`;
    if (
      estado?.fecha_parto_probable &&
      ['tacto', 'inseminacion'].includes(tipo)
    ) {
      mensaje += `\n🍼 Parto probable: ${estado.fecha_parto_probable}`;
    }
    if (estado?.numero_servicios && tipo === 'inseminacion') {
      mensaje += `\n🔁 Servicio n° ${estado.numero_servicios}`;
    }
    if (ctx.nombreEstablecimiento)
      mensaje += `\n🏠 Campo: ${ctx.nombreEstablecimiento}`;
    return { success: true, accion, mensaje, data: estado };
  }

  async consultarPendientes(
    body: Record<string, any>,
    ctx: ContextoTambo,
  ): Promise<ResultadoTambo> {
    const grupo = GRUPOS_VALIDOS.includes(body.grupo)
      ? (body.grupo as keyof Pendientes)
      : null;
    const { pendientes } = await this.tamboService.pendientes(
      ctx.idEstablecimiento,
    );
    let mensaje = formatearPendientes(pendientes, grupo);
    if (ctx.nombreEstablecimiento)
      mensaje += `\n🏠 Campo: ${ctx.nombreEstablecimiento}`;
    return { success: true, accion: 'consultar_tambo', mensaje };
  }
}
