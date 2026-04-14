// src/modules/bot/bot.controller.ts
import {
  Controller,
  Post,
  Get,
  Query,
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
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';

// ─────────────────────────────────────────────
// Body unificado que recibe del flow de n8n
// ─────────────────────────────────────────────
interface EstablecimientoInfo {
  id: number;
  nombre: string;
}

interface BotRequestBody {
  accion:
    | 'crear_ternero'
    | 'crear_madre'
    | 'crear_evento'
    | 'crear_multiples_eventos'
    | 'crear_tratamiento'
    | 'crear_diarrea'
    | 'seleccionar_establecimiento'
    | 'cambiar_establecimiento';
  phone?: string;
  seleccion?: string | number; // para selección de establecimiento
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
    @InjectRepository(Establecimiento)
    private readonly establecimientoRepo: Repository<Establecimiento>,
  ) {}

  // ─────────────────────────────────────────────
  // HELPER: Buscar usuario por teléfono (sin resolver establecimiento)
  // ─────────────────────────────────────────────
  private async buscarUsuarioPorTelefono(phone: string): Promise<UserEntity | null> {
    if (!phone) return null;

    const telefonoNormalizado = phone.replace(/[\s\-\+]/g, '');
    const variantes = [
      telefonoNormalizado,
      telefonoNormalizado.replace(/^54/, ''),
      `54${telefonoNormalizado}`,
      telefonoNormalizado.replace(/^549/, '54'),
      telefonoNormalizado.replace(/^549/, ''),
    ];

    for (const variante of variantes) {
      const users = await this.userRepo.find({ where: { telefono: variante } });
      if (users.length > 1) {
        console.warn(`⚠️ Teléfono duplicado: ${variante} — ${users.map(u => u.name).join(', ')}`);
        // Priorizar admin sobre operario si hay duplicados
        const admin = users.find(u => u.rol === 'admin');
        const elegido = admin || users[0];
        console.log(`📱 Usuario elegido (duplicado): ${elegido.name} (ID: ${elegido.id})`);
        return elegido;
      }
      if (users.length === 1) {
        console.log(`📱 Usuario encontrado: ${users[0].name} (ID: ${users[0].id})`);
        return users[0];
      }
    }

    console.warn(`📱 No se encontró usuario con teléfono: ${phone}`);
    return null;
  }

  // ─────────────────────────────────────────────
  // HELPER: Obtener establecimientos de un usuario
  // ─────────────────────────────────────────────
  private async obtenerEstablecimientosDeUsuario(userId: number): Promise<EstablecimientoInfo[]> {
    const asignaciones = await this.userEstRepo.find({ where: { userId } });
    if (!asignaciones.length) return [];

    const ids = asignaciones.map(a => a.establecimientoId);
    const establecimientos = await this.establecimientoRepo.findByIds(ids);

    return establecimientos.map(e => ({ id: e.id_establecimiento, nombre: e.nombre }));
  }

  // ─────────────────────────────────────────────
  // HELPER: Autenticar usuario por teléfono
  // ─────────────────────────────────────────────
  private async autenticarPorTelefono(phone: string): Promise<{
    userId: number;
    userName: string;
    establecimientoId: number | null;
    requiere_seleccion: boolean;
    establecimientos: EstablecimientoInfo[];
  } | null> {
    const user = await this.buscarUsuarioPorTelefono(phone);
    if (!user) return null;

    const establecimientos = await this.obtenerEstablecimientosDeUsuario(user.id);

    // Sin establecimientos asignados en tabla intermedia → usar campo directo
    if (establecimientos.length === 0) {
      if (!user.id_establecimiento) {
        console.warn(`⚠️ Usuario ${user.name} no tiene establecimiento asignado`);
        return null;
      }
      return {
        userId: user.id,
        userName: user.name,
        establecimientoId: user.id_establecimiento,
        requiere_seleccion: false,
        establecimientos: [],
      };
    }

    // Un solo establecimiento → directo, sin preguntar
    if (establecimientos.length === 1) {
      return {
        userId: user.id,
        userName: user.name,
        establecimientoId: establecimientos[0].id,
        requiere_seleccion: false,
        establecimientos,
      };
    }

    // Múltiples establecimientos → revisar si ya eligió uno para el bot
    if (user.bot_establecimiento_id) {
      const valido = establecimientos.find(e => e.id === user.bot_establecimiento_id);
      if (valido) {
        console.log(`🏠 Bot usando establecimiento guardado: ${valido.nombre}`);
        return {
          userId: user.id,
          userName: user.name,
          establecimientoId: user.bot_establecimiento_id,
          requiere_seleccion: false,
          establecimientos,
        };
      }
    }

    // Necesita seleccionar
    return {
      userId: user.id,
      userName: user.name,
      establecimientoId: null,
      requiere_seleccion: true,
      establecimientos,
    };
  }

  // ─────────────────────────────────────────────
  // HELPER: Formatear lista de establecimientos para WhatsApp
  // ─────────────────────────────────────────────
  private formatearListaEstablecimientos(establecimientos: EstablecimientoInfo[]): string {
    return establecimientos.map((e, i) => `${i + 1}. ${e.nombre}`).join('\n');
  }

  // ─────────────────────────────────────────────
  // HELPERS: Resolver RP → ID interno (ESTRICTO)
  // ─────────────────────────────────────────────
  private async resolverTerneroIdEstricto(
    rp: number,
    idEstablecimiento: number,
  ): Promise<{ id: number } | { error: string }> {
    if (!rp || rp === 0) {
      return { error: 'No se especificó el RP del ternero' };
    }
    const ternero = await this.terneroRepo.findOne({
      where: { rp_ternero: rp, id_establecimiento: idEstablecimiento },
    });
    if (ternero) {
      console.log(`🔍 RP ternero ${rp} → id_ternero ${ternero.id_ternero}`);
      return { id: ternero.id_ternero };
    }
    return { error: `No existe el ternero RP ${rp} en tu establecimiento` };
  }

  private async resolverMadreIdEstricto(
    rp: number,
    idEstablecimiento: number,
  ): Promise<{ id: number } | { error: string }> {
    if (!rp || rp === 0) {
      return { error: 'No se especificó el RP de la madre' };
    }
    const madre = await this.madreRepo.findOne({
      where: { rp_madre: rp, id_establecimiento: idEstablecimiento },
    });
    if (madre) {
      console.log(`🔍 RP madre ${rp} → id_madre ${madre.id_madre}`);
      return { id: madre.id_madre };
    }
    return { error: `No existe la madre RP ${rp} en tu establecimiento` };
  }

  private async resolverTerneroIdsEstricto(
    rps: number[],
    idEstablecimiento: number,
  ): Promise<{ ids: number[]; errores: string[] }> {
    const ids: number[] = [];
    const errores: string[] = [];
    for (const rp of rps) {
      if (!rp || rp === 0) continue;
      const resultado = await this.resolverTerneroIdEstricto(
        rp,
        idEstablecimiento,
      );
      if ('id' in resultado) {
        ids.push(resultado.id);
      } else {
        errores.push(resultado.error);
      }
    }
    return { ids, errores };
  }

  private async resolverMadreIdsEstricto(
    rps: number[],
    idEstablecimiento: number,
  ): Promise<{ ids: number[]; errores: string[] }> {
    const ids: number[] = [];
    const errores: string[] = [];
    for (const rp of rps) {
      if (!rp || rp === 0) continue;
      const resultado = await this.resolverMadreIdEstricto(
        rp,
        idEstablecimiento,
      );
      if ('id' in resultado) {
        ids.push(resultado.id);
      } else {
        errores.push(resultado.error);
      }
    }
    return { ids, errores };
  }

  // Helper: verificar si RP ya existe en el establecimiento
  private async existeRpTernero(
    rp: number,
    idEstablecimiento: number,
  ): Promise<boolean> {
    if (!rp || rp === 0) return false;
    const existe = await this.terneroRepo.findOne({
      where: { rp_ternero: rp, id_establecimiento: idEstablecimiento },
    });
    return !!existe;
  }

  private async existeRpMadre(
    rp: number,
    idEstablecimiento: number,
  ): Promise<boolean> {
    if (!rp || rp === 0) return false;
    const existe = await this.madreRepo.findOne({
      where: { rp_madre: rp, id_establecimiento: idEstablecimiento },
    });
    return !!existe;
  }

  // ════════════════════════════════════════════
  // ENDPOINT DE ESTADO — n8n consulta esto primero
  // ════════════════════════════════════════════
  @Get('estado')
  @ApiOperation({
    summary: 'Consulta si el usuario necesita seleccionar establecimiento',
    description: 'n8n llama esto antes de la IA para saber si el usuario está en flujo de selección.',
  })
  async estado(@Query('phone') phone: string, @Query('text') text?: string) {
    if (!phone) {
      return { requiere_seleccion: false, mensaje: null };
    }

    const user = await this.buscarUsuarioPorTelefono(phone);
    if (!user) {
      return { requiere_seleccion: false, usuario_no_encontrado: true };
    }

    // Detectar comando "cambiar_establecimiento" antes de ir a Claude
    const textNorm = (text || '').toLowerCase().trim().replace(/[_\s-]/g, '_');
    if (textNorm === 'cambiar_establecimiento' || textNorm === 'cambiar establecimiento') {
      await this.userRepo.update(user.id, { bot_establecimiento_id: null });
      const establecimientos = await this.obtenerEstablecimientosDeUsuario(user.id);
      if (establecimientos.length > 1) {
        const lista = this.formatearListaEstablecimientos(establecimientos);
        return {
          requiere_seleccion: true,
          establecimientos,
          mensaje: `🔄 ¿En qué establecimiento querés trabajar?\n${lista}\n\nRespondé con el número (1, 2...) o el nombre.`,
        };
      }
    }

    const establecimientos = await this.obtenerEstablecimientosDeUsuario(user.id);

    if (establecimientos.length <= 1) {
      return { requiere_seleccion: false };
    }

    // Tiene varios → verificar si ya eligió uno válido
    if (user.bot_establecimiento_id) {
      const valido = establecimientos.find(e => e.id === user.bot_establecimiento_id);
      if (valido) {
        return { requiere_seleccion: false, establecimiento_actual: valido };
      }
    }

    // Intentar procesar selección inline si el texto parece una selección válida
    if (text) {
      const selStr = text.trim();
      const numSel = parseInt(selStr);
      let elegido: EstablecimientoInfo | undefined;

      if (!isNaN(numSel) && numSel >= 1 && numSel <= establecimientos.length) {
        elegido = establecimientos[numSel - 1];
      } else if (selStr.length >= 2) {
        elegido = establecimientos.find(e =>
          e.nombre.toLowerCase().includes(selStr.toLowerCase())
        );
      }

      if (elegido) {
        await this.userRepo.update(user.id, { bot_establecimiento_id: elegido.id });
        return {
          requiere_seleccion: false,
          seleccion_exitosa: true,
          mensaje: `✅ Listo! Registrando en *${elegido.nombre}*.\nAhora podés enviar tus datos.`,
        };
      }
    }

    const lista = this.formatearListaEstablecimientos(establecimientos);
    return {
      requiere_seleccion: true,
      establecimientos,
      mensaje: `🏠 ¿En qué establecimiento querés registrar?\n${lista}\n\nRespondé con el número (1, 2...) o el nombre.`,
    };
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
      return {
        success: false,
        mensaje: `❌ Falta el campo "accion". Body recibido: ${JSON.stringify(body)}`,
      };
    }

    // ── Autenticación por teléfono ──
    let idEstablecimiento = body.id_establecimiento;
    let userName = 'Ganadero';
    let userEntity: UserEntity | null = null;

    if (phone) {
      userEntity = await this.buscarUsuarioPorTelefono(phone);
      if (!userEntity) {
        return {
          success: false,
          mensaje: `⚠️ Tu número (${phone}) no está vinculado a ninguna cuenta. Pedile al administrador que cargue tu celular en el sistema.`,
        };
      }
      userName = userEntity.name;
    }

    // ── Acciones de selección de establecimiento (se manejan antes del switch principal) ──
    if (accion === 'cambiar_establecimiento') {
      if (!userEntity) {
        return { success: false, mensaje: '⚠️ Necesito saber tu número de teléfono para cambiar el establecimiento.' };
      }
      // Si ya tiene un establecimiento activo, ignorar (probablemente es un eco procesado por Claude)
      // El cambio real se maneja en /bot/estado cuando el usuario escribe "cambiar establecimiento"
      if (userEntity.bot_establecimiento_id) {
        const establecimientos = await this.obtenerEstablecimientosDeUsuario(userEntity.id);
        const actual = establecimientos.find(e => e.id === userEntity.bot_establecimiento_id);
        if (actual) {
          return {
            success: true,
            mensaje: `✅ Registrando en *${actual.nombre}*. Para cambiar escribí "cambiar establecimiento".`,
          };
        }
      }
      await this.userRepo.update(userEntity.id, { bot_establecimiento_id: null });
      const establecimientos = await this.obtenerEstablecimientosDeUsuario(userEntity.id);
      const lista = this.formatearListaEstablecimientos(establecimientos);
      return {
        success: true,
        requiere_seleccion: true,
        establecimientos,
        mensaje: `🔄 ¿En qué establecimiento querés registrar?\n${lista}`,
      };
    }

    if (accion === 'seleccionar_establecimiento') {
      if (!userEntity) {
        return { success: false, mensaje: '⚠️ Necesito saber tu número de teléfono para seleccionar el establecimiento.' };
      }
      const establecimientos = await this.obtenerEstablecimientosDeUsuario(userEntity.id);
      const selStr = String(body.seleccion ?? '').trim();
      const numSel = parseInt(selStr);

      let elegido: EstablecimientoInfo | undefined;
      if (!isNaN(numSel) && numSel >= 1 && numSel <= establecimientos.length) {
        elegido = establecimientos[numSel - 1];
      } else {
        elegido = establecimientos.find(e =>
          e.nombre.toLowerCase().includes(selStr.toLowerCase())
        );
      }

      if (!elegido) {
        const lista = this.formatearListaEstablecimientos(establecimientos);
        return {
          success: false,
          requiere_seleccion: true,
          establecimientos,
          mensaje: `⚠️ No entendí la selección. Respondé con el número:\n${lista}`,
        };
      }

      await this.userRepo.update(userEntity.id, { bot_establecimiento_id: elegido.id });
      return {
        success: true,
        accion: 'seleccionar_establecimiento',
        mensaje: `✅ Listo! Registrando en *${elegido.nombre}*.\nAhora podés enviar tus datos.`,
        establecimiento: elegido,
      };
    }

    // ── Resolver establecimiento para acciones normales ──
    if (userEntity) {
      const auth = await this.autenticarPorTelefono(phone);
      if (!auth) {
        return {
          success: false,
          mensaje: `⚠️ No tenés ningún establecimiento asignado. Contactá al administrador.`,
        };
      }

      if (auth.requiere_seleccion) {
        const lista = this.formatearListaEstablecimientos(auth.establecimientos);
        return {
          success: false,
          requiere_seleccion: true,
          establecimientos: auth.establecimientos,
          mensaje: `🏠 ¿En qué establecimiento querés registrar?\n${lista}\n\nRespondé con el número (1, 2...) o el nombre.`,
        };
      }

      idEstablecimiento = auth.establecimientoId;
      console.log(`✅ Autenticado: ${userName} → Establecimiento ${idEstablecimiento}`);
    }

    if (!idEstablecimiento) {
      idEstablecimiento = 1;
    }

    const hoy = new Date().toISOString().split('T')[0];

    try {
      switch (accion) {
        // ──────────────────────────────────────
        case 'crear_ternero': {
          const rpTernero = parseInt(body.rp_ternero || body.caravana) || 0;

          // Validar RP duplicado (solo si RP > 0)
          if (rpTernero > 0) {
            const yaExiste = await this.existeRpTernero(
              rpTernero,
              idEstablecimiento,
            );
            if (yaExiste) {
              return {
                success: false,
                mensaje: `⚠️ Ya existe un ternero con RP ${rpTernero} en tu establecimiento. Verificá el número.`,
              };
            }
          }

          // Resolver madre si viene
          let idMadre = null;
          if (body.id_madre) {
            const madreResult = await this.resolverMadreIdEstricto(
              parseInt(body.id_madre),
              idEstablecimiento,
            );
            if ('error' in madreResult) {
              console.warn(
                `⚠️ Madre RP ${body.id_madre} no encontrada, se crea ternero sin madre`,
              );
            } else {
              idMadre = madreResult.id;
            }
          }

          const data = {
            rp_ternero: rpTernero,
            peso_nacer:
              parseFloat(body.peso_nacimiento || body.peso_nacer) || 0,
            peso_15d: parseFloat(body.peso_15d) || 0,
            peso_30d: parseFloat(body.peso_30d) || 0,
            peso_45d: parseFloat(body.peso_45d) || 0,
            peso_largado: parseFloat(body.peso_largado) || 0,
            sexo: body.sexo || 'Macho',
            estado: body.estado || 'Vivo',
            fecha_nacimiento: hoy,
            observaciones:
              body.observaciones || `Registrado por bot (${userName})`,
            semen: body.tipo_semen || body.semen || 'Sin datos',
            id_madre: idMadre,
            id_establecimiento: idEstablecimiento,
          };

          console.log('🐮 Creando ternero:', data);
          const ternero = await this.ternerosService.create(data as any);

          let mensaje = `✅ Ternero RP ${data.rp_ternero} registrado. Peso: ${data.peso_nacer} kg`;
          if (body.id_madre && !idMadre) {
            mensaje += `\n⚠️ La madre RP ${body.id_madre} no se encontró, se registró sin madre.`;
          }

          return {
            success: true,
            accion: 'crear_ternero',
            mensaje,
            data: ternero,
          };
        }

        // ──────────────────────────────────────
        case 'crear_madre': {
          const rpMadre = parseInt(body.rp_madre) || 0;

          // Validar RP duplicado
          if (rpMadre > 0) {
            const yaExiste = await this.existeRpMadre(
              rpMadre,
              idEstablecimiento,
            );
            if (yaExiste) {
              return {
                success: false,
                mensaje: `⚠️ Ya existe una madre con RP ${rpMadre} en tu establecimiento. Verificá el número.`,
              };
            }
          }

          const data = {
            rp_madre: rpMadre,
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
          const terneroRps = body.id_ternero
            ? Array.isArray(body.id_ternero)
              ? body.id_ternero
              : [body.id_ternero]
            : [];
          const madreRps = body.id_madre
            ? Array.isArray(body.id_madre)
              ? body.id_madre
              : [body.id_madre]
            : [];

          const terneroResult = await this.resolverTerneroIdsEstricto(
            terneroRps,
            idEstablecimiento,
          );
          const madreResult = await this.resolverMadreIdsEstricto(
            madreRps,
            idEstablecimiento,
          );

          // Si hay errores de RP, rechazar
          const todosErrores = [
            ...terneroResult.errores,
            ...madreResult.errores,
          ];
          if (todosErrores.length > 0) {
            return {
              success: false,
              mensaje: `⚠️ No se pudo registrar el evento:\n${todosErrores.join('\n')}\nVerificá los RP e intentá de nuevo.`,
            };
          }

          const data = {
            fecha_evento: hoy,
            observacion: body.observacion || 'Sin observación',
            id_ternero: terneroResult.ids,
            id_madre: madreResult.ids,
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
          const erroresGlobales: string[] = [];

          for (const evt of body.eventos || []) {
            const terneroRps = evt.id_ternero
              ? Array.isArray(evt.id_ternero)
                ? evt.id_ternero
                : [evt.id_ternero]
              : [];
            const madreRps = evt.id_madre
              ? Array.isArray(evt.id_madre)
                ? evt.id_madre
                : [evt.id_madre]
              : [];

            const terneroResult = await this.resolverTerneroIdsEstricto(
              terneroRps,
              idEstablecimiento,
            );
            const madreResult = await this.resolverMadreIdsEstricto(
              madreRps,
              idEstablecimiento,
            );

            const errores = [...terneroResult.errores, ...madreResult.errores];
            if (errores.length > 0) {
              erroresGlobales.push(...errores);
              continue;
            }

            eventosResueltos.push({
              fecha_evento: hoy,
              observacion: evt.observacion || 'Sin observación',
              id_ternero: terneroResult.ids,
              id_madre: madreResult.ids,
            });
          }

          if (eventosResueltos.length === 0) {
            return {
              success: false,
              mensaje: `⚠️ No se pudo registrar ningún evento:\n${erroresGlobales.join('\n')}`,
            };
          }

          const data = {
            id_establecimiento: idEstablecimiento,
            eventos: eventosResueltos,
          };

          console.log('📋 Creando múltiples eventos:', data);
          const eventos = await this.eventosService.createMultiple(data as any);

          let mensaje = `✅ ${eventos.length} eventos registrados`;
          if (erroresGlobales.length > 0) {
            mensaje += `\n⚠️ Algunos no se pudieron registrar:\n${erroresGlobales.join('\n')}`;
          }

          return {
            success: true,
            accion: 'crear_multiples_eventos',
            mensaje,
            data: eventos,
          };
        }

        // ──────────────────────────────────────
        case 'crear_tratamiento': {
          const rpTernero = parseInt(body.id_ternero) || 0;

          // Validar que se especificó un ternero
          if (!rpTernero || rpTernero === 0) {
            return {
              success: false,
              mensaje:
                '⚠️ No se especificó a qué ternero aplicar el tratamiento. Decí el RP del ternero.',
            };
          }

          // Validar que existe
          const terneroResult = await this.resolverTerneroIdEstricto(
            rpTernero,
            idEstablecimiento,
          );
          if ('error' in terneroResult) {
            return {
              success: false,
              mensaje: `⚠️ ${terneroResult.error}. No se registró el tratamiento.`,
            };
          }

          const data = {
            nombre: body.nombre || body.medicamento || 'Tratamiento sin nombre',
            descripcion:
              body.descripcion ||
              body.observaciones ||
              `Registrado por bot (${userName})`,
            tipo_enfermedad: body.tipo_enfermedad || 'General',
            turno: body.turno || 'mañana',
            fecha_tratamiento: hoy,
            id_establecimiento: idEstablecimiento,
            id_ternero: terneroResult.id,
          };

          console.log('💊 Creando tratamiento:', data);
          const tratamiento = await this.tratamientosService.create(
            data as any,
          );

          return {
            success: true,
            accion: 'crear_tratamiento',
            mensaje: `✅ Tratamiento "${data.nombre}" registrado para ternero RP ${rpTernero}`,
            data: tratamiento,
          };
        }

        // ──────────────────────────────────────
        case 'crear_diarrea': {
          const rpTernero = parseInt(body.id_ternero) || 0;

          // Validar que se especificó un ternero
          if (!rpTernero || rpTernero === 0) {
            return {
              success: false,
              mensaje:
                '⚠️ No se especificó a qué ternero registrar la diarrea. Decí el RP del ternero.',
            };
          }

          // Validar que existe
          const terneroResult = await this.resolverTerneroIdEstricto(
            rpTernero,
            idEstablecimiento,
          );
          if ('error' in terneroResult) {
            return {
              success: false,
              mensaje: `⚠️ ${terneroResult.error}. No se registró la diarrea.`,
            };
          }

          const data = {
            fecha_diarrea_ternero: hoy,
            severidad: body.severidad || 'Moderada',
            id_ternero: terneroResult.id,
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
                'seleccionar_establecimiento',
                'cambiar_establecimiento',
              ],
            },
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      const errorMsg =
        error?.response?.message ||
        error?.response?.error ||
        error?.message ||
        'Error desconocido';

      console.error('❌ Error en bot:', errorMsg, error);

      // Devolvemos 200 con success:false para que n8n pueda reenviar
      // el mensaje de error real al usuario por WhatsApp
      return {
        success: false,
        accion,
        mensaje: `❌ Error al procesar "${accion}": ${errorMsg}`,
      };
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

    if (!Array.isArray(acciones)) {
      return this.registrar(acciones as any);
    }

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
