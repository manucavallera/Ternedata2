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
import { UserEntity } from '../users/entity/users.entity';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';

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
  phone?: string; // Número de teléfono del remitente (viene del adaptador n8n)
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
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstRepo: Repository<UserEstablecimientoEntity>,
  ) {}

  // ─────────────────────────────────────────────
  // HELPER: Autenticar usuario por teléfono
  // ─────────────────────────────────────────────
  private async autenticarPorTelefono(phone: string): Promise<{
    userId: number;
    userName: string;
    establecimientoId: number;
  } | null> {
    if (!phone) return null;

    // Normalizar: sacar +, espacios, guiones
    const telefonoNormalizado = phone.replace(/[\s\-\+]/g, '');

    // Buscar usuario por teléfono (probar variantes comunes)
    const variantes = [
      telefonoNormalizado,
      // Sin código de país (Argentina: 54)
      telefonoNormalizado.replace(/^54/, ''),
      // Con código de país
      `54${telefonoNormalizado}`,
      // Sin 9 después del código de país (WhatsApp agrega 9)
      telefonoNormalizado.replace(/^549/, '54'),
      telefonoNormalizado.replace(/^549/, ''),
    ];

    let user: UserEntity | null = null;

    for (const variante of variantes) {
      user = await this.userRepo.findOne({
        where: { telefono: variante },
      });
      if (user) break;
    }

    if (!user) {
      console.warn(
        `📱 No se encontró usuario con teléfono: ${phone} (variantes: ${variantes.join(', ')})`,
      );
      return null;
    }

    console.log(
      `📱 Usuario encontrado: ${user.name} (ID: ${user.id}) para teléfono ${phone}`,
    );

    // Buscar su establecimiento asignado
    // Si tiene varios, usar el primero (o el que tenga en id_establecimiento)
    let establecimientoId = user.id_establecimiento;

    if (!establecimientoId) {
      // Buscar en la tabla intermedia
      const asignacion = await this.userEstRepo.findOne({
        where: { userId: user.id },
        order: { id: 'ASC' },
      });

      if (asignacion) {
        establecimientoId = asignacion.establecimientoId;
      }
    }

    if (!establecimientoId) {
      console.warn(`⚠️ Usuario ${user.name} no tiene establecimiento asignado`);
      return null;
    }

    console.log(
      `🏠 Establecimiento resuelto: ${establecimientoId} para ${user.name}`,
    );

    return {
      userId: user.id,
      userName: user.name,
      establecimientoId,
    };
  }

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
      'Recibe el JSON parseado por la IA y ejecuta la acción correspondiente. Autentica al usuario por teléfono.',
  })
  async registrar(@Body() body: BotRequestBody) {
    console.log('🤖 Bot Request recibido:', JSON.stringify(body, null, 2));

    const { accion, phone } = body;

    if (!accion) {
      throw new HttpException(
        { error: 'Falta el campo "accion"', recibido: body },
        HttpStatus.BAD_REQUEST,
      );
    }

    // ── Autenticación por teléfono ──
    let idEstablecimiento = body.id_establecimiento;
    let userName = 'Ganadero';

    if (phone) {
      const auth = await this.autenticarPorTelefono(phone);
      if (!auth) {
        return {
          success: false,
          mensaje: `⚠️ Tu número (${phone}) no está vinculado a ninguna cuenta. Pedile al administrador que cargue tu celular en el sistema.`,
        };
      }
      idEstablecimiento = auth.establecimientoId;
      userName = auth.userName;
      console.log(
        `✅ Autenticado: ${userName} → Establecimiento ${idEstablecimiento}`,
      );
    }

    // Fallback si no viene phone ni id_establecimiento
    if (!idEstablecimiento) {
      idEstablecimiento = 1;
    }

    const hoy = new Date().toISOString().split('T')[0];

    try {
      switch (accion) {
        // ──────────────────────────────────────
        case 'crear_ternero': {
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
            observaciones:
              body.observaciones || `Registrado por bot (${userName})`,
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
            observaciones:
              body.observaciones || `Registrada por bot (${userName})`,
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
              body.descripcion ||
              body.observaciones ||
              `Registrado por bot (${userName})`,
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
            observaciones:
              body.observaciones || `Registrado por bot (${userName})`,
            id_establecimiento: idEstablecimiento,
          };

          console.log('🩺 Registrando diarrea:', data);
          const diarrea = await this.diarreaTernerosService.create(data as any);

          return {
            success: true,
            accion: 'crear_diarrea',
            mensaje: `✅ Diarrea registrada para ternero RP ${rpTernero}. Severidad: ${data.severidad}. Episodio #${diarrea.numero_episodio}`,
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
  async registrarLote(
    @Body() body: { acciones: BotRequestBody[]; phone?: string },
  ) {
    console.log('🤖 Bot LOTE recibido:', JSON.stringify(body, null, 2));

    const acciones = body.acciones || body;
    const phone = body.phone;

    // Si viene un solo objeto (no array), redirigir al endpoint simple
    if (!Array.isArray(acciones)) {
      return this.registrar(acciones as any);
    }

    // Propagar el phone a cada acción del lote
    const accionesConPhone = acciones.map((a) => ({
      ...a,
      phone: a.phone || phone,
    }));

    const resultados: any[] = [];
    const mensajes: string[] = [];

    for (const accion of accionesConPhone) {
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
