// src/modules/bot/bot.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { BotApiKeyGuard } from './api-key.guard';
import { TernerosService } from '../terneros/terneros.service';
import { MadresService } from '../madres/madres.service';
import { EventosService } from '../eventos/eventos.service';
import { TratamientosService } from '../tratamientos/tratamientos.service';
import { DiarreaTernerosService } from '../diarrea-terneros/diarrea-terneros.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { MadreEntity } from '../madres/entities/madre.entity';

// ─────────────────────────────────────────────
// Body unificado que recibe del flow de n8n
// ─────────────────────────────────────────────
interface BotRequestBody {
  accion:
    | 'crear_ternero'
    | 'crear_madre'
    | 'crear_evento'
    | 'crear_multiples_eventos'
    | 'crear_tratamiento'
    | 'crear_diarrea';
  [key: string]: any;
}

@ApiTags('Bot - n8n Integration')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API Key del bot',
  required: true,
})
@UseGuards(BotApiKeyGuard)
@Controller('bot')
export class BotController {
  constructor(
    private readonly ternerosService: TernerosService,
    private readonly madresService: MadresService,
    private readonly eventosService: EventosService,
    private readonly tratamientosService: TratamientosService,
    private readonly diarreaTernerosService: DiarreaTernerosService,
    @InjectRepository(TerneroEntity)
    private readonly terneroRepo: Repository<TerneroEntity>,
    @InjectRepository(MadreEntity)
    private readonly madreRepo: Repository<MadreEntity>,
  ) {}

  // ─────────────────────────────────────────────
  // HELPERS: Resolver RP → ID interno
  // ─────────────────────────────────────────────
  private async resolverTerneroId(
    rp: number,
    idEstablecimiento: number,
  ): Promise<number | null> {
    const ternero = await this.terneroRepo.findOne({
      where: { rp_ternero: rp, id_establecimiento: idEstablecimiento },
    });
    if (ternero) {
      console.log(`🔍 RP ternero ${rp} → id_ternero ${ternero.id_ternero}`);
      return ternero.id_ternero;
    }
    console.warn(
      `⚠️ No se encontró ternero con RP ${rp} en establecimiento ${idEstablecimiento}`,
    );
    return null;
  }

  private async resolverMadreId(
    rp: number,
    idEstablecimiento: number,
  ): Promise<number | null> {
    const madre = await this.madreRepo.findOne({
      where: { rp_madre: rp, id_establecimiento: idEstablecimiento },
    });
    if (madre) {
      console.log(`🔍 RP madre ${rp} → id_madre ${madre.id_madre}`);
      return madre.id_madre;
    }
    console.warn(
      `⚠️ No se encontró madre con RP ${rp} en establecimiento ${idEstablecimiento}`,
    );
    return null;
  }

  private async resolverTerneroIds(
    rps: number[],
    idEstablecimiento: number,
  ): Promise<number[]> {
    const ids: number[] = [];
    for (const rp of rps) {
      const id = await this.resolverTerneroId(rp, idEstablecimiento);
      if (id) ids.push(id);
    }
    return ids;
  }

  private async resolverMadreIds(
    rps: number[],
    idEstablecimiento: number,
  ): Promise<number[]> {
    const ids: number[] = [];
    for (const rp of rps) {
      const id = await this.resolverMadreId(rp, idEstablecimiento);
      if (id) ids.push(id);
    }
    return ids;
  }

  // ════════════════════════════════════════════
  // ENDPOINT UNIFICADO — n8n manda todo acá
  // ════════════════════════════════════════════
  @Post('registrar')
  @ApiOperation({
    summary: 'Endpoint unificado para el bot de WhatsApp/Telegram',
    description:
      'Recibe el JSON parseado por la IA y ejecuta la acción correspondiente',
  })
  async registrar(@Body() body: BotRequestBody) {
    console.log('🤖 Bot Request recibido:', JSON.stringify(body, null, 2));

    const { accion } = body;

    if (!accion) {
      throw new HttpException(
        { error: 'Falta el campo "accion"', recibido: body },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Default establecimiento si no viene
    const idEstablecimiento = body.id_establecimiento || 1;
    const hoy = new Date().toISOString().split('T')[0];

    try {
      switch (accion) {
        // ──────────────────────────────────────
        case 'crear_ternero': {
          // Resolver madre por RP si viene
          let idMadre = null;
          if (body.id_madre) {
            idMadre = await this.resolverMadreId(
              parseInt(body.id_madre),
              idEstablecimiento,
            );
          }

          const data = {
            rp_ternero: parseInt(body.rp_ternero || body.caravana) || 0,
            peso_nacer:
              parseFloat(body.peso_nacimiento || body.peso_nacer) || 0,
            peso_15d: parseFloat(body.peso_15d) || 0,
            peso_30d: parseFloat(body.peso_30d) || 0,
            peso_45d: parseFloat(body.peso_45d) || 0,
            peso_largado: parseFloat(body.peso_largado) || 0,
            sexo: body.sexo || 'Macho',
            estado: body.estado || 'Vivo',
            fecha_nacimiento: body.fecha_nacimiento || hoy,
            observaciones: body.observaciones || 'Registrado por bot',
            semen: body.tipo_semen || body.semen || 'Sin datos',
            id_madre: idMadre,
            id_establecimiento: idEstablecimiento,
          };

          console.log('🐮 Creando ternero:', data);
          const ternero = await this.ternerosService.create(data as any);

          return {
            success: true,
            accion: 'crear_ternero',
            mensaje: `✅ Ternero RP ${data.rp_ternero} registrado. Peso: ${data.peso_nacer} kg`,
            data: ternero,
          };
        }

        // ──────────────────────────────────────
        case 'crear_madre': {
          const data = {
            rp_madre: parseInt(body.rp_madre) || 0,
            nombre: body.nombre || `Vaca ${body.rp_madre}`,
            estado: body.estado || 'En Tambo',
            fecha_nacimiento: body.fecha_nacimiento || '2020-01-01',
            observaciones: body.observaciones || 'Registrada por bot',
            id_establecimiento: idEstablecimiento,
          };

          console.log('🐄 Creando madre:', data);
          const madre = await this.madresService.create(data as any);

          return {
            success: true,
            accion: 'crear_madre',
            mensaje: `✅ Madre RP ${data.rp_madre} "${data.nombre}" registrada`,
            data: madre,
          };
        }

        // ──────────────────────────────────────
        case 'crear_evento': {
          // Resolver RPs a IDs internos
          const terneroIds = body.id_ternero
            ? await this.resolverTerneroIds(
                Array.isArray(body.id_ternero)
                  ? body.id_ternero
                  : [body.id_ternero],
                idEstablecimiento,
              )
            : [];
          const madreIds = body.id_madre
            ? await this.resolverMadreIds(
                Array.isArray(body.id_madre) ? body.id_madre : [body.id_madre],
                idEstablecimiento,
              )
            : [];

          const data = {
            fecha_evento: body.fecha_evento || hoy,
            observacion: body.observacion || 'Sin observación',
            id_ternero: terneroIds,
            id_madre: madreIds,
            id_establecimiento: idEstablecimiento,
          };

          console.log('📋 Creando evento:', data);
          const evento = await this.eventosService.create(data as any);

          return {
            success: true,
            accion: 'crear_evento',
            mensaje: `✅ Evento registrado: "${data.observacion}"`,
            data: evento,
          };
        }

        // ──────────────────────────────────────
        case 'crear_multiples_eventos': {
          const eventosResueltos = [];
          for (const evt of body.eventos || []) {
            const terneroIds = evt.id_ternero
              ? await this.resolverTerneroIds(
                  Array.isArray(evt.id_ternero)
                    ? evt.id_ternero
                    : [evt.id_ternero],
                  idEstablecimiento,
                )
              : [];
            const madreIds = evt.id_madre
              ? await this.resolverMadreIds(
                  Array.isArray(evt.id_madre) ? evt.id_madre : [evt.id_madre],
                  idEstablecimiento,
                )
              : [];
            eventosResueltos.push({
              fecha_evento: evt.fecha_evento || hoy,
              observacion: evt.observacion || 'Sin observación',
              id_ternero: terneroIds,
              id_madre: madreIds,
            });
          }

          const data = {
            id_establecimiento: idEstablecimiento,
            eventos: eventosResueltos,
          };

          console.log('📋 Creando múltiples eventos:', data);
          const eventos = await this.eventosService.createMultiple(data as any);

          return {
            success: true,
            accion: 'crear_multiples_eventos',
            mensaje: `✅ ${eventos.length} eventos registrados`,
            data: eventos,
          };
        }

        // ──────────────────────────────────────
        case 'crear_tratamiento': {
          // Resolver ternero por RP si viene
          let terneroObj = null;
          if (body.id_ternero) {
            const terneroId = await this.resolverTerneroId(
              parseInt(body.id_ternero),
              idEstablecimiento,
            );
            if (terneroId) terneroObj = { id_ternero: terneroId };
          }

          const data = {
            nombre: body.nombre || body.medicamento || 'Tratamiento sin nombre',
            descripcion:
              body.descripcion || body.observaciones || 'Registrado por bot',
            tipo_enfermedad: body.tipo_enfermedad || 'General',
            turno: body.turno || 'mañana',
            fecha_tratamiento: body.fecha_tratamiento || hoy,
            id_establecimiento: idEstablecimiento,
            ternero: terneroObj,
          };

          console.log('💊 Creando tratamiento:', data);
          const tratamiento = await this.tratamientosService.create(
            data as any,
          );

          return {
            success: true,
            accion: 'crear_tratamiento',
            mensaje: `✅ Tratamiento "${data.nombre}" registrado${body.id_ternero ? ` para ternero ${body.id_ternero}` : ''}`,
            data: tratamiento,
          };
        }

        // ──────────────────────────────────────
        case 'crear_diarrea': {
          // Resolver ternero por RP
          const rpTernero = parseInt(body.id_ternero) || 0;
          const terneroId = await this.resolverTerneroId(
            rpTernero,
            idEstablecimiento,
          );

          if (!terneroId) {
            throw new HttpException(
              {
                error: `No se encontró ternero con RP ${rpTernero} en el establecimiento`,
              },
              HttpStatus.BAD_REQUEST,
            );
          }

          const data = {
            fecha_diarrea_ternero: body.fecha_diarrea || body.fecha || hoy,
            severidad: body.severidad || 'Moderada',
            id_ternero: terneroId,
            observaciones: body.observaciones || 'Registrado por bot',
            id_establecimiento: idEstablecimiento,
          };

          console.log('🩺 Registrando diarrea:', data);
          const diarrea = await this.diarreaTernerosService.create(data as any);

          return {
            success: true,
            accion: 'crear_diarrea',
            mensaje: `✅ Diarrea registrada para ternero ${data.id_ternero}. Severidad: ${data.severidad}. Episodio #${diarrea.numero_episodio}`,
            data: diarrea,
          };
        }

        // ──────────────────────────────────────
        default:
          throw new HttpException(
            {
              error: `Acción desconocida: "${accion}"`,
              acciones_válidas: [
                'crear_ternero',
                'crear_madre',
                'crear_evento',
                'crear_multiples_eventos',
                'crear_tratamiento',
                'crear_diarrea',
              ],
            },
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      console.error('❌ Error en bot:', error.message);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: error.message,
          accion,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ════════════════════════════════════════════
  // ENDPOINT LOTE — múltiples acciones de un mensaje
  // ════════════════════════════════════════════
  @Post('registrar-lote')
  @ApiOperation({
    summary: 'Procesa múltiples acciones de un solo mensaje',
    description:
      'Recibe un array de acciones y las ejecuta secuencialmente. Devuelve un resumen consolidado.',
  })
  async registrarLote(@Body() body: { acciones: BotRequestBody[] }) {
    console.log('🤖 Bot LOTE recibido:', JSON.stringify(body, null, 2));

    const acciones = body.acciones || body;

    // Si viene un solo objeto (no array), redirigir al endpoint simple
    if (!Array.isArray(acciones)) {
      return this.registrar(acciones as any);
    }

    const resultados: any[] = [];
    const mensajes: string[] = [];

    for (const accion of acciones) {
      try {
        const resultado = await this.registrar(accion);
        resultados.push(resultado);
        mensajes.push(resultado.mensaje);
      } catch (error) {
        const errorMsg =
          error.response?.error || error.message || 'Error desconocido';
        resultados.push({
          success: false,
          accion: accion.accion,
          error: errorMsg,
        });
        mensajes.push(`❌ Error en ${accion.accion}: ${errorMsg}`);
      }
    }

    return {
      success: resultados.every((r) => r.success),
      total: acciones.length,
      exitosos: resultados.filter((r) => r.success).length,
      mensaje: mensajes.join('\n'),
      resultados,
    };
  }
}
