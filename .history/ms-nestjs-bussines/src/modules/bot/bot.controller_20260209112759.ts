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
  ) {}

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
          const data = {
            fecha_evento: body.fecha_evento || hoy,
            observacion: body.observacion || 'Sin observación',
            id_ternero: body.id_ternero || [],
            id_madre: body.id_madre || [],
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
          const data = {
            id_establecimiento: idEstablecimiento,
            eventos: (body.eventos || []).map((evt: any) => ({
              fecha_evento: evt.fecha_evento || hoy,
              observacion: evt.observacion || 'Sin observación',
              id_ternero: evt.id_ternero || [],
              id_madre: evt.id_madre || [],
            })),
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
          const data = {
            nombre: body.nombre || body.medicamento || 'Tratamiento sin nombre',
            descripcion:
              body.descripcion || body.observaciones || 'Registrado por bot',
            tipo_enfermedad: body.tipo_enfermedad || 'General',
            turno: body.turno || 'mañana',
            fecha_tratamiento: body.fecha_tratamiento || hoy,
            id_establecimiento: idEstablecimiento,
            // Relación con ternero si viene
            ternero: body.id_ternero
              ? { id_ternero: parseInt(body.id_ternero) }
              : null,
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
          const data = {
            fecha_diarrea_ternero: body.fecha_diarrea || body.fecha || hoy,
            severidad: body.severidad || 'Moderada',
            id_ternero: parseInt(body.id_ternero) || 0,
            observaciones: body.observaciones || 'Registrado por bot',
            id_establecimiento: idEstablecimiento,
          };

          if (!data.id_ternero) {
            throw new HttpException(
              { error: 'Se requiere id_ternero para registrar diarrea' },
              HttpStatus.BAD_REQUEST,
            );
          }

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
}
