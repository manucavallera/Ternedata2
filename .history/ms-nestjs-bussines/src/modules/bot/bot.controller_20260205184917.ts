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

// ─────────────────────────────────────────────
// DTOs internos para el bot (sin class-validator
// porque Gemini ya parsea y el Code node limpia)
// ─────────────────────────────────────────────

interface BotCrearTerneroDto {
  rp_ternero: string | number;
  peso_nacimiento?: number;
  peso_nacer?: number;
  sexo?: string;
  estado?: string;
  fecha_nacimiento?: string;
  id_madre?: number;
  id_establecimiento?: number;
  nombre_establecimiento?: string;
  observaciones?: string;
  tipo_semen?: string;
}

interface BotCrearMadreDto {
  rp_madre: string | number;
  nombre?: string;
  estado?: string;
  fecha_nacimiento?: string;
  id_establecimiento?: number;
  nombre_establecimiento?: string;
}

interface BotCrearEventoDto {
  fecha_evento: string;
  observacion: string;
  id_ternero?: number[];
  id_madre?: number[];
  id_establecimiento?: number;
  nombre_establecimiento?: string;
}

interface BotCrearMultiplesEventosDto {
  id_establecimiento?: number;
  nombre_establecimiento?: string;
  eventos: {
    fecha_evento: string;
    observacion: string;
    id_ternero?: number[];
    id_madre?: number[];
  }[];
}

// ─────────────────────────────────────────────
// Body unificado que recibe del flow de n8n
// ─────────────────────────────────────────────
interface BotRequestBody {
  accion:
    | 'crear_ternero'
    | 'crear_madre'
    | 'crear_evento'
    | 'crear_multiples_eventos';
  // El resto de campos depende de la acción
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
  ) {}

  // ════════════════════════════════════════════
  // ENDPOINT UNIFICADO — n8n manda todo acá
  // ════════════════════════════════════════════
  @Post('registrar')
  @ApiOperation({
    summary: 'Endpoint unificado para el bot de WhatsApp/Telegram',
    description:
      'Recibe el JSON parseado por la IA y ejecuta la acción correspondiente (crear_ternero, crear_madre, crear_evento, crear_multiples_eventos)',
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

    try {
      switch (accion) {
        // ──────────────────────────────────────
        case 'crear_ternero': {
          const data = {
            rp_ternero: body.rp_ternero || body.caravana,
            peso_nacer: body.peso_nacimiento || body.peso_nacer || 0,
            sexo: body.sexo || 'Macho',
            estado: body.estado || 'Vivo',
            fecha_nacimiento:
              body.fecha_nacimiento || new Date().toISOString().split('T')[0],
            id_madre: body.id_madre || null,
            id_establecimiento: idEstablecimiento,
            observaciones: body.observaciones || null,
            tipo_semen: body.tipo_semen || null,
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
            rp_madre: body.rp_madre,
            nombre: body.nombre || `Vaca ${body.rp_madre}`,
            estado: body.estado || 'En Tambo',
            fecha_nacimiento: body.fecha_nacimiento || '2020-01-01',
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
            fecha_evento:
              body.fecha_evento || new Date().toISOString().split('T')[0],
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
              fecha_evento:
                evt.fecha_evento || new Date().toISOString().split('T')[0],
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
        default:
          throw new HttpException(
            {
              error: `Acción desconocida: "${accion}"`,
              acciones_válidas: [
                'crear_ternero',
                'crear_madre',
                'crear_evento',
                'crear_multiples_eventos',
              ],
            },
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      console.error('❌ Error en bot:', error.message);

      // Si ya es HttpException, re-lanzar
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
