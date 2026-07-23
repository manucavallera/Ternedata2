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
import { adaptarPayload } from './webhook/adaptador';
import { ClaudeService } from './webhook/claude.service';
import { AudioService } from './webhook/audio.service';
import { MessagingService } from './webhook/messaging.service';
import { DedupeService } from './webhook/dedupe.service';
import { TernerosService } from '../terneros/terneros.service';
import { MadresService } from '../madres/madres.service';
import { EventosService } from '../eventos/eventos.service';
import { TratamientosService } from '../tratamientos/tratamientos.service';
import { DiarreaTernerosService } from '../diarrea-terneros/diarrea-terneros.service';
import { LitrosService } from '../litros/litros.service';
import { DietasService } from '../dietas/dietas.service';
import { ResumenSaludService } from '../resumen-salud/resumen-salud.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { EventoEntity } from '../eventos/entities/evento.entity';
import { DiarreaTerneroEntity } from '../diarrea-terneros/entities/diarrea-ternero.entity';
import { TratamientoEntity } from '../tratamientos/entities/tratamiento.entity';
import { UserEntity } from '../users/entity/users.entity';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Rodeos } from '../rodeos/entities/rodeos.entity';

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
    | 'cambiar_establecimiento'
    | 'consultar_resumen'
    | 'asignar_rodeo'
    | 'mover_rodeo'
    | 'crear_rodeo'
    | 'registrar_peso'
    | 'consultar_ternero'
    | 'actualizar_estado_ternero'
    | 'consultar_rodeo'
    | 'cambiar_perfil'
    | 'registrar_calostrado'
    | 'consultar_madre'
    | 'actualizar_estado_madre'
    | 'editar_diarrea'
    | 'editar_tratamiento'
    | 'editar_evento'
    | 'registrar_litros'
    | 'crear_dieta'
    | 'consultar_dieta'
    | 'desasignar_rodeo'
    | 'consultar_del'
    | 'consultar_salud'
    | 'eliminar_ternero'
    | 'eliminar_madre'
    | 'eliminar_evento'
    | 'eliminar_tratamiento'
    | 'eliminar_diarrea'
    | 'eliminar_litros';
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
    private readonly claudeService: ClaudeService,
    private readonly audioService: AudioService,
    private readonly messagingService: MessagingService,
    private readonly dedupeService: DedupeService,
    private readonly ternerosService: TernerosService,
    private readonly madresService: MadresService,
    private readonly eventosService: EventosService,
    private readonly tratamientosService: TratamientosService,
    private readonly diarreaTernerosService: DiarreaTernerosService,
    private readonly litrosService: LitrosService,
    private readonly dietasService: DietasService,
    private readonly resumenSaludService: ResumenSaludService,
    @InjectRepository(TerneroEntity)
    private readonly terneroRepo: Repository<TerneroEntity>,
    @InjectRepository(MadreEntity)
    private readonly madreRepo: Repository<MadreEntity>,
    @InjectRepository(EventoEntity)
    private readonly eventoRepo: Repository<EventoEntity>,
    @InjectRepository(DiarreaTerneroEntity)
    private readonly diarreaRepo: Repository<DiarreaTerneroEntity>,
    @InjectRepository(TratamientoEntity)
    private readonly tratamientoRepo: Repository<TratamientoEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstRepo: Repository<UserEstablecimientoEntity>,
    @InjectRepository(Establecimiento)
    private readonly establecimientoRepo: Repository<Establecimiento>,
    @InjectRepository(Rodeos)
    private readonly rodeosRepo: Repository<Rodeos>,
  ) {}

  // ─────────────────────────────────────────────
  // HELPER: Buscar usuario por teléfono (sin resolver establecimiento)
  // ─────────────────────────────────────────────
  private async buscarUsuarioPorTelefono(phone: string): Promise<UserEntity | null> {
    if (!phone) return null;

    // Solo dígitos: el teléfono en la DB puede venir con "+", espacios, guiones o paréntesis,
    // así que se normalizan los dos lados antes de comparar.
    const telefonoNormalizado = phone.replace(/\D/g, '');
    if (!telefonoNormalizado) return null;

    const variantes = Array.from(new Set([
      telefonoNormalizado,
      telefonoNormalizado.replace(/^54/, ''),
      `54${telefonoNormalizado}`,
      telefonoNormalizado.replace(/^549/, '54'),
      telefonoNormalizado.replace(/^549/, ''),
      `549${telefonoNormalizado}`,
    ].filter(Boolean)));

    // Últimos 10 dígitos = área + número local, lo que queda igual con o sin 54/9/15.
    const ultimos10 = telefonoNormalizado.slice(-10);

    const elegir = (users: UserEntity[], criterio: string): UserEntity | null => {
      if (!users.length) return null;
      if (users.length > 1) {
        console.warn(`⚠️ Teléfono duplicado (${criterio}): ${users.map(u => u.name).join(', ')}`);
        const admin = users.find(u => u.rol === 'admin');
        const elegido = admin || users[0];
        console.log(`📱 Usuario elegido (duplicado): ${elegido.name} (ID: ${elegido.id})`);
        return elegido;
      }
      console.log(`📱 Usuario encontrado (${criterio}): ${users[0].name} (ID: ${users[0].id})`);
      return users[0];
    };

    const soloDigitosCol = `regexp_replace(u.telefono, '\\D', '', 'g')`;

    const porVariante = await this.userRepo
      .createQueryBuilder('u')
      .where(`${soloDigitosCol} IN (:...variantes)`, { variantes })
      .getMany();
    const match = elegir(porVariante, 'variante');
    if (match) return match;

    if (ultimos10.length === 10) {
      const porSufijo = await this.userRepo
        .createQueryBuilder('u')
        .where(`length(${soloDigitosCol}) >= 10`)
        .andWhere(`right(${soloDigitosCol}, 10) = :ultimos10`, { ultimos10 })
        .getMany();
      const matchSufijo = elegir(porSufijo, 'últimos 10 dígitos');
      if (matchSufijo) return matchSufijo;
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
  ): Promise<{ id: number; estado: string } | { error: string }> {
    if (!rp || rp === 0) {
      return { error: 'Me falta el RP del ternero' };
    }
    const ternero = await this.terneroRepo.findOne({
      where: { rp_ternero: rp, id_establecimiento: idEstablecimiento },
    });
    if (ternero) {
      console.log(`🔍 RP ternero ${rp} → id_ternero ${ternero.id_ternero}`);
      return { id: ternero.id_ternero, estado: ternero.estado };
    }
    return { error: `No encontré el ternero RP ${rp} en tu establecimiento. Fijate el número` };
  }

  // Bloquea escrituras de salud (diarrea/tratamiento/peso/calostrado) sobre
  // animales en estado terminal (Muerto/Vendido). Devuelve el mensaje de
  // bloqueo o null si está habilitado.
  private bloqueoPorEstadoTerminal(rp: number, estado: string): string | null {
    if (estado === 'Muerto' || estado === 'Vendido') {
      return `⚠️ El ternero RP ${rp} está *${estado}*. No registré nada. Si fue un error, primero actualizá su estado a Vivo.`;
    }
    return null;
  }

  // ─────────────────────────────────────────────
  // HELPERS: acción pendiente de confirmación ("¿la doy de alta?")
  // ─────────────────────────────────────────────
  private readonly PENDIENTE_TTL_MS = 60 * 60 * 1000; // 1h

  private async guardarPendiente(userId: number, pendiente: any): Promise<void> {
    await this.userRepo.update(userId, {
      bot_pendiente: JSON.stringify(pendiente),
      bot_pendiente_at: new Date(),
    } as any);
  }

  private async limpiarPendiente(userId: number): Promise<void> {
    await this.userRepo.update(userId, {
      bot_pendiente: null,
      bot_pendiente_at: null,
    } as any);
  }

  private leerPendiente(user: UserEntity): any | null {
    if (!user.bot_pendiente || !user.bot_pendiente_at) return null;
    const vencido =
      Date.now() - new Date(user.bot_pendiente_at).getTime() >
      this.PENDIENTE_TTL_MS;
    if (vencido) return null;
    try {
      return JSON.parse(user.bot_pendiente);
    } catch {
      return null;
    }
  }

  // Si hay una pregunta pendiente y el texto la contesta, la resuelve y devuelve
  // el mensaje para el usuario. Devuelve null si no había nada que resolver.
  // Con texto vacío (audio sin transcribir todavía) no toca nada: se vuelve a
  // llamar más adelante con la transcripción.
  private async resolverPendiente(
    user: UserEntity,
    text?: string,
  ): Promise<string | null> {
    const resp = (text || '').toLowerCase().trim().replace(/[.!¡¿?]/g, '');
    if (!resp) return null;

    const pendiente = this.leerPendiente(user);
    if (
      pendiente?.tipo !== 'alta_madre' &&
      pendiente?.tipo !== 'confirmar_borrado'
    )
      return null;

    const SI = ['si', 'sí', 'sip', 'sisi', 'si si', 'dale', 'ok', 'oka', 'obvio', 'claro', 'correcto', 'exacto', 'borra', 'borralo', 'borrala', 'eliminalo'];
    const NO = ['no', 'nop', 'nel', 'negativo', 'dejalo', 'no gracias', 'nada', 'cancelar', 'cancela'];

    if (pendiente.tipo === 'confirmar_borrado') {
      if (SI.includes(resp)) {
        await this.limpiarPendiente(user.id);
        return this.ejecutarBorrado(user, pendiente);
      }
      if (NO.includes(resp)) {
        await this.limpiarPendiente(user.id);
        return `👍 Listo, no borré nada. ${pendiente.desc} sigue como estaba.`;
      }
      // Contestó otra cosa: se descarta la pregunta y sigue normal.
      await this.limpiarPendiente(user.id);
      return null;
    }

    if (SI.includes(resp)) {
      await this.limpiarPendiente(user.id);
      return this.confirmarAltaMadre(user, pendiente);
    }
    if (NO.includes(resp)) {
      await this.limpiarPendiente(user.id);
      return `👍 Listo, el ternero RP ${pendiente.rp_ternero} queda sin madre. Si querés, cargala después y se la asignás.`;
    }

    // Contestó otra cosa: era un mensaje nuevo. Se descarta la pregunta y sigue normal.
    await this.limpiarPendiente(user.id);
    return null;
  }

  // Ejecuta el borrado que quedó confirmado. El id concreto ya se resolvió
  // cuando se pidió la confirmación, así que acá solo se llama al service.
  private async ejecutarBorrado(
    user: UserEntity,
    pendiente: any,
  ): Promise<string> {
    const { recurso, id, idEstablecimiento } = pendiente;
    const esAdmin = user.rol === 'admin';
    try {
      switch (recurso) {
        case 'ternero':
          await this.ternerosService.remove(id, idEstablecimiento, esAdmin);
          break;
        case 'madre':
          await this.madresService.remove(id, idEstablecimiento, esAdmin);
          break;
        case 'evento':
          await this.eventosService.remove(id, idEstablecimiento, esAdmin);
          break;
        case 'tratamiento':
          await this.tratamientosService.remove(id, idEstablecimiento, esAdmin);
          break;
        case 'diarrea':
          await this.diarreaTernerosService.remove(
            id,
            idEstablecimiento,
            esAdmin,
          );
          break;
        case 'litros':
          await this.litrosService.remove(id, idEstablecimiento);
          break;
        default:
          return '😕 No supe qué borrar. Probá de nuevo.';
      }
      return `🗑️ Borré ${pendiente.desc}.`;
    } catch (error) {
      console.error('❌ Error al borrar:', error?.message, error);
      return `😕 No pude borrar ${pendiente.desc}. Puede que ya no exista o que tenga datos asociados. Avisale al encargado si sigue.`;
    }
  }

  // Da de alta la madre que quedó pendiente y se la asigna al ternero ya anotado.
  private async confirmarAltaMadre(
    user: UserEntity,
    pendiente: any,
  ): Promise<string> {
    const { rp_madre, id_ternero, rp_ternero, id_establecimiento } = pendiente;

    // Pudo haberla cargado desde la web mientras tanto.
    const yaExiste = await this.madreRepo.findOne({
      where: { rp_madre, id_establecimiento },
    });

    const madre =
      yaExiste ||
      (await this.madresService.create({
        rp_madre,
        nombre: `Vaca ${rp_madre}`,
        estado: 'En Tambo',
        id_establecimiento,
        observaciones: `Alta por bot al anotar el parto (${user.name})`,
      } as any));

    if (id_ternero) {
      await this.ternerosService.update(
        id_ternero,
        { id_madre: madre.id_madre } as any,
        id_establecimiento,
        false,
      );
    }

    return yaExiste
      ? `✅ La madre RP ${rp_madre} ya estaba. Se la asigné al ternero RP ${rp_ternero}.`
      : `✅ Di de alta la madre RP ${rp_madre} y se la asigné al ternero RP ${rp_ternero}.`;
  }

  private async resolverMadreIdEstricto(
    rp: number,
    idEstablecimiento: number,
  ): Promise<{ id: number } | { error: string }> {
    if (!rp || rp === 0) {
      return { error: 'Me falta el RP de la madre' };
    }
    const madre = await this.madreRepo.findOne({
      where: { rp_madre: rp, id_establecimiento: idEstablecimiento },
    });
    if (madre) {
      console.log(`🔍 RP madre ${rp} → id_madre ${madre.id_madre}`);
      return { id: madre.id_madre };
    }
    return { error: `No encontré la madre RP ${rp} en tu establecimiento. Fijate el número` };
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

    // Detectar código de vinculación de Telegram (8 dígitos, ver generarTokenBot)
    const textTrim = (text || '').trim();
    if (/^\d{8}$/.test(textTrim)) {
      const candidato = await this.userRepo.findOne({
        where: { bot_link_token: textTrim },
      });
      if (candidato && candidato.bot_link_token_expires && candidato.bot_link_token_expires > new Date()) {
        // Desasignar phone de cualquier otro usuario que lo tenga
        await this.userRepo.update({ telefono: phone } as any, { telefono: null });
        await this.userRepo.update(candidato.id, {
          telefono: phone,
          bot_link_token: null,
          bot_link_token_expires: null,
        });
        return {
          requiere_seleccion: false,
          seleccion_exitosa: true,
          mensaje: `✅ ¡Listo, ${candidato.name}! Tu Telegram quedó vinculado. Ya podés usar el bot normalmente.`,
        };
      } else if (candidato) {
        return {
          requiere_seleccion: false,
          seleccion_exitosa: true,
          mensaje: `⏰ Ese código ya no sirve. Generá uno nuevo desde la app.`,
        };
      }
    }

    if (!user) {
      return { requiere_seleccion: false, usuario_no_encontrado: true };
    }

    // ¿Está respondiendo un "¿la doy de alta?" que dejamos pendiente?
    const respPendiente = await this.resolverPendiente(user, text);
    if (respPendiente) {
      return { requiere_seleccion: false, seleccion_exitosa: true, mensaje: respPendiente };
    }

    // Detectar comando "cambiar_establecimiento" antes de ir a Claude
    const textNorm = (text || '').toLowerCase().trim().replace(/[_\s-]/g, '_');
    if (textNorm === 'cambiar_establecimiento' || textNorm === 'cambiar establecimiento') {
      await this.userRepo.update(user.id, {
        bot_establecimiento_id: null,
        bot_establecimiento_at: null,
      });
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

    // Tiene varios establecimientos.
    const RECORDAR_MS = 6 * 60 * 60 * 1000; // re-preguntar tras 6h de inactividad
    const valido = user.bot_establecimiento_id
      ? establecimientos.find(e => e.id === user.bot_establecimiento_id)
      : undefined;
    const ultima = user.bot_establecimiento_at?.getTime() ?? 0;
    const vencido = !valido || Date.now() - ultima > RECORDAR_MS;

    // Camino rápido: campo válido + actividad reciente → seguir sin molestar.
    // Refresca la marca para que el recordatorio sea "6h desde el último mensaje".
    if (valido && !vencido) {
      await this.userRepo.update(user.id, { bot_establecimiento_at: new Date() });
      return { requiere_seleccion: false, establecimiento_actual: valido };
    }

    // Acá: no hay campo válido, o venció el recordatorio. Solo en este contexto
    // interpretamos el texto como selección (evita cambiar de campo por accidente
    // si un mensaje normal contiene el nombre de otro establecimiento).
    const textoNorm = (text || '').toLowerCase().trim();
    const confirmaSeguir =
      !!valido && ['si', 'sí', 'sip', 'dale', 'sigo', 'sigue'].includes(textoNorm);

    if (confirmaSeguir) {
      await this.userRepo.update(user.id, { bot_establecimiento_at: new Date() });
      return {
        requiere_seleccion: false,
        seleccion_exitosa: true,
        mensaje: `✅ Seguimos en *${valido!.nombre}*. Mandá tus datos.`,
      };
    }

    // ¿Eligió un campo por número o nombre?
    let elegido: EstablecimientoInfo | undefined;
    if (text) {
      const selStr = text.trim();
      const numSel = parseInt(selStr);
      if (!isNaN(numSel) && numSel >= 1 && numSel <= establecimientos.length) {
        elegido = establecimientos[numSel - 1];
      } else if (selStr.length >= 2) {
        elegido = establecimientos.find(e =>
          e.nombre.toLowerCase().includes(selStr.toLowerCase())
        );
      }
    }
    if (elegido) {
      await this.userRepo.update(user.id, {
        bot_establecimiento_id: elegido.id,
        bot_establecimiento_at: new Date(),
      });
      return {
        requiere_seleccion: false,
        seleccion_exitosa: true,
        mensaje: `✅ Listo! Registrando en *${elegido.nombre}*.\nAhora podés enviar tus datos.`,
      };
    }

    // No interpretó selección → preguntar.
    const lista = this.formatearListaEstablecimientos(establecimientos);
    if (valido) {
      // Recordatorio bloqueante tras >6h. Mantiene la selección previa por si
      // responde "sí". El mensaje que disparó esto hay que re-enviarlo.
      return {
        requiere_seleccion: true,
        establecimientos,
        mensaje: `🏠 ¿Seguís trabajando en *${valido.nombre}*?\nRespondé *sí* para seguir, o elegí otro:\n${lista}`,
      };
    }
    return {
      requiere_seleccion: true,
      establecimientos,
      mensaje: `🏠 ¿En qué establecimiento querés registrar?\n${lista}\n\nRespondé con el número (1, 2...) o el nombre.`,
    };
  }

  // ════════════════════════════════════════════
  // WEBHOOK unificado del bot (Telegram / WhatsApp-Evolution).
  // Responde 200 al instante y procesa en background: si tardáramos
  // (Claude + registrar + envío ~3-5s) Telegram reintenta el update y
  // duplicaría el registro. Dedupe por update_id / messageId evita
  // reprocesar el mismo mensaje. WEBHOOK_MODE='live' ejecuta y responde;
  // 'shadow' (default) solo parsea y loguea (procesa sincrónico para
  // poder inspeccionar el resultado en la respuesta HTTP).
  // ════════════════════════════════════════════
  @Post('webhook')
  @ApiOperation({
    summary: 'Webhook unificado del bot (Telegram / WhatsApp)',
    description:
      'Recibe el payload crudo, deduplica, responde 200 al instante y procesa el mensaje en background.',
  })
  async webhook(@Body() body: any) {
    const esLive = process.env.WEBHOOK_MODE === 'live';

    // Dedupe: mismo update reintentado por Telegram/Evolution → ignorar.
    const clave = this.dedupeService.extraerClave(body);
    if (this.dedupeService.esDuplicado(clave)) {
      console.log('♻️ [webhook] duplicado ignorado:', clave);
      return { ok: true, duplicado: true };
    }

    // Live: responder 200 ya y procesar en background (evita reintentos).
    if (esLive) {
      this.procesarMensaje(body, true).catch((err) =>
        console.error('❌ [webhook] error async:', err?.message || err),
      );
      return { ok: true };
    }

    // Shadow: sincrónico, devuelve el detalle para diagnóstico.
    return this.procesarMensaje(body, false);
  }

  /**
   * Pipeline del bot: adaptar → verificar estado → transcribir (audio) →
   * Claude → registrar/registrar-lote → responder. En shadow no escribe
   * ni responde (solo loguea y devuelve el parseo).
   */
  private async procesarMensaje(body: any, esLive: boolean): Promise<any> {
    const MODE = esLive ? 'live' : 'shadow';

    const msg = adaptarPayload(body);
    if (!msg) {
      console.log('📥 [webhook] descartado (eco/grupo/status/tipo no soportado)');
      return { ok: true, modo: MODE, descartado: true };
    }
    console.log(
      `📥 [webhook:${MODE}] ${msg._origen} | ${msg.phone} | ${msg.type} | "${msg.text ?? ''}"`,
    );

    // 1) Verificar estado (selección de establecimiento / vinculación TG).
    //    Mismo orden que n8n: corre con el texto actual (null en audio).
    const estado: any = await this.estado(msg.phone, msg.text ?? '');
    if (estado?.mensaje) {
      console.log('🏠 [webhook] estado terminal:', estado.mensaje);
      if (esLive) {
        await this.messagingService.responder(msg._origen, msg.phone, estado.mensaje);
      }
      return { ok: true, modo: MODE, estado: estado.mensaje };
    }

    // 2) Resolver texto (transcribir si es audio).
    let texto = msg.text || '';
    if (msg.type === 'audio') {
      try {
        texto = await this.audioService.transcribirMensaje(msg);
        console.log(`🎙️ [webhook] transcripción: "${texto}"`);
      } catch (err: any) {
        console.error('❌ [webhook] error transcribiendo:', err.message);
        if (esLive) {
          await this.messagingService.responder(
            msg._origen,
            msg.phone,
            '🎙️ No pude escuchar bien el audio. Grabalo de nuevo o escribime lo que querés registrar.',
          );
        }
        return { ok: true, modo: MODE, error: 'transcripcion: ' + err.message };
      }
    }
    if (!texto) return { ok: true, modo: MODE, recibido: true };

    // 2.b) Si era audio, recién ahora tenemos el texto: puede ser el "sí" de una
    //      pregunta pendiente (en el paso 1 el texto todavía estaba vacío).
    if (msg.type === 'audio') {
      const user = await this.buscarUsuarioPorTelefono(msg.phone);
      const respPendiente = user
        ? await this.resolverPendiente(user, texto)
        : null;
      if (respPendiente) {
        console.log('🐄 [webhook] pendiente resuelto por audio:', respPendiente);
        if (esLive) {
          await this.messagingService.responder(msg._origen, msg.phone, respPendiente);
        }
        return { ok: true, modo: MODE, pendiente: respPendiente };
      }
    }

    // 3) Parsear con Claude.
    let parsed: any;
    try {
      parsed = await this.claudeService.parsearMensaje(texto, msg.phone);
      console.log('🧠 [webhook] Claude parseó:', JSON.stringify(parsed, null, 2));
    } catch (err: any) {
      console.error('❌ [webhook] error parseando:', err.message);
      if (esLive) {
        await this.messagingService.responder(
          msg._origen,
          msg.phone,
          '🤔 No te entendí bien. Probá de nuevo, más simple. Por ejemplo: "nació ternero RP 500 macho".',
        );
      }
      return { ok: true, modo: MODE, error: 'parseo: ' + err.message };
    }

    // SHADOW: hasta acá. No escribe DB ni responde (evita duplicar con n8n).
    if (!esLive) {
      return { ok: true, modo: 'shadow', parsed };
    }

    // 4) LIVE: ejecutar la(s) acción(es) in-process.
    const resultado: any = parsed._esLote
      ? await this.registrarLote({ acciones: parsed.acciones, phone: msg.phone })
      : await this.registrar(parsed as BotRequestBody);

    // 5) Responder al usuario.
    const mensaje =
      resultado?.mensaje || 'Algo salió mal. Probá de nuevo.';
    await this.messagingService.responder(msg._origen, msg.phone, mensaje);
    return { ok: true, modo: 'live', mensaje };
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

    const NORMALIZAR_ACCION: Record<string, string> = {
      crearrodeo: 'crear_rodeo', crearternero: 'crear_ternero', crearmadre: 'crear_madre',
      crearevento: 'crear_evento', creartratamiento: 'crear_tratamiento', creardiarrea: 'crear_diarrea',
      asignarrodeo: 'asignar_rodeo', moverrodeo: 'mover_rodeo', cambiarestablecimiento: 'cambiar_establecimiento',
      consultarresumen: 'consultar_resumen', registrarpeso: 'registrar_peso',
      consultarternero: 'consultar_ternero', actualizarestadoternero: 'actualizar_estado_ternero',
      consultarrodeo: 'consultar_rodeo', cambiarperfil: 'cambiar_perfil',
      registrarcalostrado: 'registrar_calostrado',
      consultarmadre: 'consultar_madre', actualizarestadomadre: 'actualizar_estado_madre',
      editardiarrea: 'editar_diarrea', editartratamiento: 'editar_tratamiento', editarevento: 'editar_evento',
    };
    if (body.accion && NORMALIZAR_ACCION[body.accion]) body.accion = NORMALIZAR_ACCION[body.accion] as any;

    const { accion, phone } = body;

    if (!accion) {
      return {
        success: false,
        mensaje: `🤔 No entendí bien qué querés hacer. Probá de nuevo diciéndolo simple, por ejemplo: "nació ternero RP 500 macho".`,
      };
    }

    // ── Autenticación por teléfono ──
    let idEstablecimiento: number | null = null; // nunca confiar en body.id_establecimiento
    let userName = 'Ganadero';
    let nombreEstablecimiento = '';
    let userEntity: UserEntity | null = null;

    if (phone) {
      userEntity = await this.buscarUsuarioPorTelefono(phone);
      if (!userEntity) {
        return {
          success: false,
          mensaje: `👋 Tu número todavía no está en el sistema. Pedile al encargado que te dé de alta y listo, ya podés registrar.`,
        };
      }
      userName = userEntity.name;
    }

    // ── Acciones de selección de establecimiento (se manejan antes del switch principal) ──
    if (accion === 'cambiar_establecimiento') {
      if (!userEntity) {
        return { success: false, mensaje: '🤔 No pude reconocer tu número. Escribime desde el teléfono que tenés registrado.' };
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
        return { success: false, mensaje: '🤔 No pude reconocer tu número. Escribime desde el teléfono que tenés registrado.' };
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
          mensaje: `🤔 No entendí cuál elegiste. Respondé con el número:\n${lista}`,
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

    // ── Cambio de perfil (login por email+password → reasigna teléfono) ──
    // Se maneja ANTES de resolver el establecimiento, porque el campo del
    // usuario nuevo no tiene nada que ver con el del usuario anterior.
    if (accion === 'cambiar_perfil') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || body.contrasena || '').trim();

      if (!email || !password) {
        return { success: false, mensaje: '🔑 Para entrar con otra cuenta necesito tu email y contraseña. Ejemplo: "cambiar perfil juan@mail.com miclave"' };
      }

      const nuevoUser = await this.userRepo.findOne({ where: { email } });
      if (!nuevoUser) return { success: false, mensaje: '🤔 No encontré ninguna cuenta con ese email. Fijate que esté bien escrito.' };

      const { compare } = await import('bcrypt');
      const valida = await compare(password, nuevoUser.password);
      if (!valida) return { success: false, mensaje: '🔒 La contraseña no coincide. Probá de nuevo.' };

      // Liberar teléfono del usuario anterior y asignarlo al nuevo
      if (phone) {
        const telefonoNorm = phone.replace(/[\s\-\+]/g, '');
        await this.userRepo
          .createQueryBuilder()
          .update()
          .set({ telefono: null })
          .where('telefono IN (:...variantes)', {
            variantes: [telefonoNorm, telefonoNorm.replace(/^54/, ''), `54${telefonoNorm}`],
          })
          .andWhere('id != :id', { id: nuevoUser.id })
          .execute();

        await this.userRepo.update(nuevoUser.id, { telefono: telefonoNorm } as any);
      }

      const encabezado = `✅ ¡Listo! Entraste como *${nuevoUser.name}*.`;

      // Resolver el establecimiento del NUEVO usuario (auto-switch de campo)
      const auth = await this.autenticarPorTelefono(phone);
      if (!auth) {
        return { success: true, accion: 'cambiar_perfil', mensaje: `${encabezado}\n🏠 Todavía no tenés un establecimiento asignado. Pedile al encargado que te asigne uno.` };
      }
      if (auth.requiere_seleccion) {
        const lista = this.formatearListaEstablecimientos(auth.establecimientos);
        return {
          success: true,
          accion: 'cambiar_perfil',
          requiere_seleccion: true,
          establecimientos: auth.establecimientos,
          mensaje: `${encabezado}\n🏠 ¿En qué establecimiento querés registrar?\n${lista}\n\nRespondé con el número (1, 2...) o el nombre.`,
        };
      }

      let nombreNuevoEst = auth.establecimientos.find(e => e.id === auth.establecimientoId)?.nombre;
      if (!nombreNuevoEst && auth.establecimientoId) {
        const est = await this.establecimientoRepo.findOne({ where: { id_establecimiento: auth.establecimientoId } });
        if (est) nombreNuevoEst = est.nombre;
      }

      return {
        success: true,
        accion: 'cambiar_perfil',
        mensaje: `${encabezado}${nombreNuevoEst ? '\n🏠 Campo: ' + nombreNuevoEst : ''}`,
      };
    }

    // ── Resolver establecimiento para acciones normales ──
    if (userEntity) {
      const auth = await this.autenticarPorTelefono(phone);
      if (!auth) {
        return {
          success: false,
          mensaje: `🏠 Todavía no tenés un establecimiento asignado. Pedile al encargado que te asigne uno.`,
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
      const estInfo = auth.establecimientos.find(e => e.id === auth.establecimientoId);
      if (estInfo) {
        nombreEstablecimiento = estInfo.nombre;
      } else if (idEstablecimiento) {
        const est = await this.establecimientoRepo.findOne({ where: { id_establecimiento: idEstablecimiento } });
        if (est) nombreEstablecimiento = est.nombre;
      }
    }

    if (!idEstablecimiento) {
      return {
        success: false,
        accion,
        mensaje: '🤔 No pude ubicar tu establecimiento. Fijate que tu número esté registrado, o pedile al encargado.',
      };
    }

    const hoy = new Date().toISOString().split('T')[0];

    // Valida fecha ISO YYYY-MM-DD del body; si es futura o inválida, usa hoy
    const parsearFecha = (valor: any): string => {
      if (!valor) return hoy;
      const s = String(valor).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return hoy;
      const d = new Date(s);
      if (isNaN(d.getTime())) return hoy;
      if (d > new Date()) return hoy;
      return s;
    };

    try {
      switch (accion) {
        // ──────────────────────────────────────
        case 'crear_ternero': {
          const rpTernero = parseInt(body.rp_ternero || body.caravana) || 0;

          if (!rpTernero || rpTernero <= 0) {
            return {
              success: false,
              mensaje: '👂 Me falta el RP del ternero. Decímelo (el número de caravana) y lo anoto.',
            };
          }

          // Validar RP duplicado
          const yaExiste = await this.existeRpTernero(rpTernero, idEstablecimiento);
          if (yaExiste) {
            return {
              success: false,
              mensaje: `👀 Ya hay un ternero con RP ${rpTernero} en tu establecimiento. Fijate el número.`,
            };
          }

          // Resolver madre si viene
          let idMadre = null;
          let rpMadreFaltante: number | null = null;
          if (body.id_madre) {
            const rpMadre = parseInt(body.id_madre);
            const madreResult = await this.resolverMadreIdEstricto(
              rpMadre,
              idEstablecimiento,
            );
            if ('error' in madreResult) {
              // No la damos de alta por las nuestras: un RP mal tipeado crearía una
              // vaca fantasma. Anotamos el ternero igual y preguntamos después.
              console.warn(
                `⚠️ Madre RP ${rpMadre} no encontrada, se pregunta antes de crearla`,
              );
              rpMadreFaltante = rpMadre;
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
            fecha_nacimiento: parsearFecha(body.fecha_nacimiento),
            observaciones:
              body.observaciones || `Registrado por bot (${userName})`,
            semen: body.tipo_semen || body.semen || 'Sin datos',
            id_madre: idMadre,
            id_establecimiento: idEstablecimiento,
          };

          console.log('🐮 Creando ternero:', data);
          const ternero = await this.ternerosService.create(data as any);

          let mensaje = `✅ Ternero anotado\n📋 RP: ${data.rp_ternero}\n⚖️ Peso: ${data.peso_nacer} kg\n🐄 Sexo: ${data.sexo}\n📅 Nacimiento: ${data.fecha_nacimiento}`;
          if (data.semen && data.semen !== 'Sin datos' && data.semen !== 'N/A') mensaje += `\n🧬 Semen: ${data.semen}`;
          if (rpMadreFaltante && userEntity) {
            await this.guardarPendiente(userEntity.id, {
              tipo: 'alta_madre',
              rp_madre: rpMadreFaltante,
              id_ternero: ternero.id_ternero,
              rp_ternero: data.rp_ternero,
              id_establecimiento: idEstablecimiento,
            });
            mensaje += `\n\n🤔 No tengo la madre RP ${rpMadreFaltante}. ¿La doy de alta y se la asigno? Respondé *sí* o *no*.`;
          }
          if (nombreEstablecimiento) mensaje += `\n🏠 Campo: ${nombreEstablecimiento}`;

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
                mensaje: `👀 Ya hay una madre con RP ${rpMadre} en tu establecimiento. Fijate el número.`,
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
            mensaje: `✅ Madre anotada\n📋 RP: ${data.rp_madre}\n🐄 Nombre: ${data.nombre}\n📊 Estado: ${data.estado}${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
            data: madre,
          };
        }

        // ──────────────────────────────────────
        case 'registrar_litros': {
          const litrosVendido = parseFloat(body.litros_vendido) || 0;
          const litrosTerneros = parseFloat(body.litros_terneros) || 0;

          if (litrosVendido <= 0 && litrosTerneros <= 0) {
            return {
              success: false,
              mensaje:
                '👂 ¿Cuántos litros? Decime algo como "litros vendidos 2141, terneros 80".',
            };
          }

          // cantidad_vacas: solo si el usuario la dijo. Sino, el service toma
          // el conteo del rodeo ('En Tambo') como snapshot del día.
          const vacas = parseInt(body.cantidad_vacas);
          const dto: any = {
            fecha: parsearFecha(body.fecha),
            litros_vendido: litrosVendido,
            litros_terneros: litrosTerneros,
            observaciones:
              body.observaciones || `Registrado por bot (${userName})`,
          };
          if (!isNaN(vacas) && vacas > 0) dto.cantidad_vacas = vacas;

          console.log('🥛 Registrando litros:', dto);
          const registro = await this.litrosService.registrar(
            dto,
            idEstablecimiento,
          );

          const promedio =
            registro.cantidad_vacas > 0
              ? Math.round((registro.total / registro.cantidad_vacas) * 100) /
                100
              : null;

          let mensaje = `✅ Litros anotados\n🥛 Vendidos: ${registro.litros_vendido} L\n🐮 Terneros: ${registro.litros_terneros} L\n📊 Total: ${registro.total} L`;
          if (registro.cantidad_vacas)
            mensaje += `\n🐄 Vacas: ${registro.cantidad_vacas}`;
          if (promedio != null) mensaje += `\n📈 Promedio: ${promedio} L/vaca`;
          if (nombreEstablecimiento)
            mensaje += `\n🏠 Campo: ${nombreEstablecimiento}`;

          return {
            success: true,
            accion: 'registrar_litros',
            mensaje,
            data: registro,
          };
        }

        // ──────────────────────────────────────
        case 'crear_dieta': {
          const nombreRodeo = String(
            body.nombre_rodeo || body.rodeo || '',
          ).trim();
          if (!nombreRodeo) {
            return {
              success: false,
              mensaje: '👂 ¿A qué rodeo le cargo la dieta? Decime el nombre.',
            };
          }
          const rodeo = await this.rodeosRepo
            .createQueryBuilder('r')
            .where('r.id_establecimiento = :id', { id: idEstablecimiento })
            .andWhere('LOWER(r.nombre) LIKE :nombre', {
              nombre: `%${nombreRodeo.toLowerCase()}%`,
            })
            .getOne();
          if (!rodeo) {
            return {
              success: false,
              mensaje: `🤔 No encontré el rodeo "${nombreRodeo}".`,
            };
          }

          const modo = ['nota', 'formula', 'mezcla'].includes(body.modo)
            ? body.modo
            : 'nota';
          const dto: any = {
            id_rodeo: rodeo.id_rodeo,
            modo,
            nombre: body.nombre_dieta || undefined,
          };
          if (modo === 'nota') {
            dto.nota = String(body.nota || body.observaciones || '').trim();
            if (!dto.nota) {
              return {
                success: false,
                mensaje: '👂 ¿Qué come el rodeo? Decime la dieta.',
              };
            }
          } else if (modo === 'formula') {
            dto.kg_por_animal = parseFloat(body.kg_por_animal) || 0;
            if (dto.kg_por_animal <= 0) {
              return { success: false, mensaje: '👂 ¿Cuántos kg por animal?' };
            }
          } else {
            const ingr = Array.isArray(body.ingredientes)
              ? body.ingredientes
                  .map((i: any) => ({
                    nombre: String(i?.nombre || '').trim(),
                    kg: parseFloat(i?.kg) || 0,
                  }))
                  .filter((i: any) => i.nombre && i.kg > 0)
              : [];
            if (!ingr.length) {
              return {
                success: false,
                mensaje:
                  '👂 Decime los ingredientes y los kg (ej: 400 de soja, 300 de maíz).',
              };
            }
            dto.ingredientes = ingr;
          }

          console.log('🍽️ Creando dieta:', dto);
          const dieta: any = await this.dietasService.crear(
            dto,
            idEstablecimiento,
          );

          let mensaje = `✅ Dieta cargada al rodeo *${rodeo.nombre}*`;
          if (modo === 'nota') mensaje += `\n📝 ${dieta.nota}`;
          if (modo === 'formula')
            mensaje += `\n⚖️ ${dieta.kg_por_animal} kg/animal × ${dieta.cantidad_animales} = ${dieta.total_rodeo} kg`;
          if (modo === 'mezcla') {
            mensaje +=
              '\n' +
              dieta.ingredientes
                .map((i: any) => `  • ${i.nombre}: ${i.kg} kg`)
                .join('\n');
            mensaje += `\n📊 Total: ${dieta.total_rodeo} kg (${dieta.cantidad_animales} animales${dieta.kg_por_animal != null ? ', ' + dieta.kg_por_animal + ' kg/animal' : ''})`;
          }
          if (nombreEstablecimiento)
            mensaje += `\n🏠 Campo: ${nombreEstablecimiento}`;

          return {
            success: true,
            accion: 'crear_dieta',
            mensaje,
            data: dieta,
          };
        }

        // ──────────────────────────────────────
        case 'consultar_dieta': {
          const nombreRodeo = String(
            body.nombre_rodeo || body.rodeo || '',
          ).trim();
          if (!nombreRodeo) {
            return {
              success: false,
              mensaje: '👂 ¿De qué rodeo querés ver la dieta? Decime el nombre.',
            };
          }
          const rodeo = await this.rodeosRepo
            .createQueryBuilder('r')
            .where('r.id_establecimiento = :id', { id: idEstablecimiento })
            .andWhere('LOWER(r.nombre) LIKE :nombre', {
              nombre: `%${nombreRodeo.toLowerCase()}%`,
            })
            .getOne();
          if (!rodeo) {
            return {
              success: false,
              mensaje: `🤔 No encontré el rodeo "${nombreRodeo}".`,
            };
          }

          const dietas: any[] = await this.dietasService.listarPorRodeo(
            rodeo.id_rodeo,
            idEstablecimiento,
          );
          if (!dietas.length) {
            return {
              success: true,
              accion: 'consultar_dieta',
              mensaje: `🍽️ El rodeo *${rodeo.nombre}* no tiene dieta cargada.`,
            };
          }

          const bloques = dietas.map((d) => {
            const etq = d.nombre ? `${d.nombre}: ` : '';
            if (d.modo === 'nota') return `📝 ${etq}${d.nota}`;
            if (d.modo === 'formula')
              return `⚖️ ${etq}${d.kg_por_animal} kg/animal × ${d.cantidad_animales} = ${d.total_rodeo} kg`;
            return (
              `🥣 ${etq}\n` +
              d.ingredientes
                .map((i: any) => `  • ${i.nombre}: ${i.kg} kg`)
                .join('\n') +
              `\n  📊 Total: ${d.total_rodeo} kg`
            );
          });

          return {
            success: true,
            accion: 'consultar_dieta',
            mensaje: `🍽️ Dieta del rodeo *${rodeo.nombre}*:\n${bloques.join('\n\n')}`,
          };
        }

        // ──────────────────────────────────────
        case 'desasignar_rodeo': {
          const rpTerneros: number[] = (
            Array.isArray(body.rp_terneros)
              ? body.rp_terneros
              : body.rp_ternero != null
                ? [body.rp_ternero]
                : []
          )
            .map(Number)
            .filter((n) => n > 0);
          const rpMadres: number[] = (
            Array.isArray(body.rp_madres)
              ? body.rp_madres
              : body.rp_madre != null
                ? [body.rp_madre]
                : []
          )
            .map(Number)
            .filter((n) => n > 0);

          if (!rpTerneros.length && !rpMadres.length) {
            return {
              success: false,
              mensaje:
                '👂 Decime el RP del ternero o la vaca que querés sacar del rodeo.',
            };
          }

          const sacados: string[] = [];
          const noEncontrados: string[] = [];

          if (rpTerneros.length) {
            const { ids, errores } = await this.resolverTerneroIdsEstricto(
              rpTerneros,
              idEstablecimiento,
            );
            if (ids.length) {
              await this.rodeosRepo.query(
                `UPDATE terneros SET id_rodeo = NULL WHERE id_ternero = ANY($1) AND id_establecimiento = $2`,
                [ids, idEstablecimiento],
              );
              sacados.push(`🐄 Terneros: ${rpTerneros.join(', ')}`);
            }
            if (errores.length) noEncontrados.push(...errores);
          }

          if (rpMadres.length) {
            const madres = await this.madreRepo
              .createQueryBuilder('m')
              .where('m.id_establecimiento = :est', { est: idEstablecimiento })
              .andWhere('m.rp_madre IN (:...rps)', { rps: rpMadres })
              .getMany();
            const encontradasRps = madres.map((m) => m.rp_madre);
            if (madres.length) {
              await this.madreRepo.query(
                `UPDATE madres SET id_rodeo = NULL WHERE id_madre = ANY($1) AND id_establecimiento = $2`,
                [madres.map((m) => m.id_madre), idEstablecimiento],
              );
              sacados.push(`🐮 Vacas: ${encontradasRps.join(', ')}`);
            }
            rpMadres
              .filter((rp) => !encontradasRps.includes(rp))
              .forEach((rp) => noEncontrados.push(`RP ${rp} (vaca) no encontrada`));
          }

          if (!sacados.length) {
            return {
              success: false,
              mensaje: `🤔 No pude sacar nada del rodeo:\n${noEncontrados.join('\n')}`,
            };
          }
          let mensaje = `✅ Sacado(s) del rodeo\n${sacados.join('\n')}`;
          if (noEncontrados.length)
            mensaje += `\n⚠️ No encontrados:\n${noEncontrados.join('\n')}`;
          if (nombreEstablecimiento)
            mensaje += `\n🏠 Campo: ${nombreEstablecimiento}`;
          return { success: true, accion: 'desasignar_rodeo', mensaje };
        }

        // ──────────────────────────────────────
        case 'consultar_del': {
          const rpMadre = parseInt(body.rp_madre) || 0;
          const esAdmin = userEntity?.rol === 'admin';

          if (rpMadre > 0) {
            const m = await this.madreRepo.findOne({
              where: { rp_madre: rpMadre, id_establecimiento: idEstablecimiento },
            });
            if (!m) {
              return {
                success: false,
                mensaje: `👀 No encontré la madre RP ${rpMadre} en tu establecimiento.`,
              };
            }
            if (m.estado !== 'En Tambo') {
              return {
                success: true,
                accion: 'consultar_del',
                mensaje: `🐮 La vaca RP ${rpMadre} está *${m.estado}*, no está en ordeñe (sin días en leche).`,
              };
            }
            const ultimoTernero = await this.terneroRepo
              .createQueryBuilder('t')
              .where('t.id_madre = :id', { id: m.id_madre })
              .andWhere('t.id_establecimiento = :est', { est: idEstablecimiento })
              .orderBy('t.fecha_nacimiento', 'DESC')
              .getOne();
            if (!ultimoTernero || !ultimoTernero.fecha_nacimiento) {
              return {
                success: true,
                accion: 'consultar_del',
                mensaje: `🐮 La vaca RP ${rpMadre} está En Tambo pero no tiene parto registrado, no puedo calcular los días en leche.`,
              };
            }
            const dias = Math.max(
              0,
              Math.floor(
                (Date.now() -
                  new Date(ultimoTernero.fecha_nacimiento).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            );
            return {
              success: true,
              accion: 'consultar_del',
              mensaje: `🐮 Vaca RP *${rpMadre}*\n🥛 Días en leche: *${dias}*${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
            };
          }

          // Sin RP → promedio del tambo
          const stats = await this.madresService.getEstadisticas(
            idEstablecimiento,
            esAdmin,
            null,
          );
          if (stats.promedio_dias_en_leche == null) {
            return {
              success: true,
              accion: 'consultar_del',
              mensaje:
                '🥛 Todavía no hay vacas en ordeñe con parto registrado para sacar el promedio de días en leche.',
            };
          }
          return {
            success: true,
            accion: 'consultar_del',
            mensaje: `🥛 Promedio de días en leche del tambo: *${stats.promedio_dias_en_leche}* días\n🐄 Vacas en tambo: ${stats.en_tambo}${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
          };
        }

        // ──────────────────────────────────────
        case 'consultar_salud': {
          const esAdmin = userEntity?.rol === 'admin';
          const r = await this.resumenSaludService.obtenerResumenSalud(
            idEstablecimiento,
            esAdmin,
            idEstablecimiento,
          );
          const mensaje =
            `🩺 Salud — ${nombreEstablecimiento || 'tu campo'}\n` +
            `🐄 Terneros: ${r.totalTerneros} (vivos ${r.ternerosVivos}, muertos ${r.ternerosMuertos})\n` +
            `💀 Mortalidad: ${r.porcentajeMortalidad}%\n` +
            `🤒 Enfermos: ${r.porcentajeTernerosEnfermos}% (sanos ${r.ternerosCompletamenteSanos})\n` +
            `💉 Con tratamientos: ${r.ternerosConTratamientos} (${r.tratamientosTotal} en total)\n` +
            `💩 Con diarrea: ${r.ternerosConDiarreas} (${r.episodiosDiarrea} episodios)`;
          return { success: true, accion: 'consultar_salud', mensaje };
        }

        // ──────────────────────────────────────
        // BORRAR (con confirmación: se resuelve el target y se pide "sí")
        // ──────────────────────────────────────
        case 'eliminar_ternero': {
          if (!userEntity)
            return { success: false, mensaje: '🤔 No pude identificar tu usuario.' };
          const rpTernero = parseInt(body.rp_ternero) || 0;
          if (!rpTernero)
            return {
              success: false,
              mensaje: '👂 Me falta el RP del ternero que querés borrar.',
            };
          const t = await this.terneroRepo.findOne({
            where: { rp_ternero: rpTernero, id_establecimiento: idEstablecimiento },
          });
          if (!t)
            return {
              success: false,
              mensaje: `👀 No encontré el ternero RP ${rpTernero} en tu establecimiento.`,
            };
          const desc = `el ternero RP ${rpTernero}`;
          await this.guardarPendiente(userEntity.id, {
            tipo: 'confirmar_borrado',
            recurso: 'ternero',
            id: t.id_ternero,
            idEstablecimiento,
            desc,
          });
          return {
            success: true,
            accion: 'eliminar_ternero',
            mensaje: `⚠️ ¿Seguro que borro ${desc}? Se borra para siempre.\nRespondé *sí* para confirmar o *no* para cancelar.`,
          };
        }

        // ──────────────────────────────────────
        case 'eliminar_madre': {
          if (!userEntity)
            return { success: false, mensaje: '🤔 No pude identificar tu usuario.' };
          const rpMadre = parseInt(body.rp_madre) || 0;
          if (!rpMadre)
            return {
              success: false,
              mensaje: '👂 Me falta el RP de la vaca que querés borrar.',
            };
          const m = await this.madreRepo.findOne({
            where: { rp_madre: rpMadre, id_establecimiento: idEstablecimiento },
          });
          if (!m)
            return {
              success: false,
              mensaje: `👀 No encontré la vaca RP ${rpMadre} en tu establecimiento.`,
            };
          const desc = `la vaca RP ${rpMadre}`;
          await this.guardarPendiente(userEntity.id, {
            tipo: 'confirmar_borrado',
            recurso: 'madre',
            id: m.id_madre,
            idEstablecimiento,
            desc,
          });
          return {
            success: true,
            accion: 'eliminar_madre',
            mensaje: `⚠️ ¿Seguro que borro ${desc}? Se borra para siempre.\nRespondé *sí* para confirmar o *no* para cancelar.`,
          };
        }

        // ──────────────────────────────────────
        case 'eliminar_tratamiento': {
          if (!userEntity)
            return { success: false, mensaje: '🤔 No pude identificar tu usuario.' };
          const rpTernero = parseInt(body.rp_ternero) || 0;
          if (!rpTernero)
            return { success: false, mensaje: '👂 Me falta el RP del ternero.' };
          const terneroResult = await this.resolverTerneroIdEstricto(
            rpTernero,
            idEstablecimiento,
          );
          if ('error' in terneroResult)
            return { success: false, mensaje: `⚠️ ${terneroResult.error}` };
          const last = await this.tratamientoRepo
            .createQueryBuilder('tr')
            .leftJoin('tr.ternero', 't')
            .where('t.id_ternero = :id', { id: terneroResult.id })
            .andWhere('tr.id_establecimiento = :est', { est: idEstablecimiento })
            .orderBy('tr.fecha_tratamiento', 'DESC')
            .getOne();
          if (!last)
            return {
              success: false,
              mensaje: `🤔 El ternero RP ${rpTernero} no tiene tratamientos anotados.`,
            };
          const desc = `el último tratamiento${last.nombre ? ` (${last.nombre})` : ''} del ternero RP ${rpTernero}`;
          await this.guardarPendiente(userEntity.id, {
            tipo: 'confirmar_borrado',
            recurso: 'tratamiento',
            id: last.id_tratamiento,
            idEstablecimiento,
            desc,
          });
          return {
            success: true,
            accion: 'eliminar_tratamiento',
            mensaje: `⚠️ ¿Seguro que borro ${desc}? Se borra para siempre.\nRespondé *sí* para confirmar o *no* para cancelar.`,
          };
        }

        // ──────────────────────────────────────
        case 'eliminar_diarrea': {
          if (!userEntity)
            return { success: false, mensaje: '🤔 No pude identificar tu usuario.' };
          const rpTernero = parseInt(body.rp_ternero) || 0;
          if (!rpTernero)
            return { success: false, mensaje: '👂 Me falta el RP del ternero.' };
          const terneroResult = await this.resolverTerneroIdEstricto(
            rpTernero,
            idEstablecimiento,
          );
          if ('error' in terneroResult)
            return { success: false, mensaje: `⚠️ ${terneroResult.error}` };
          const last = await this.diarreaRepo
            .createQueryBuilder('d')
            .leftJoin('d.ternero', 't')
            .where('t.id_ternero = :id', { id: terneroResult.id })
            .andWhere('d.id_establecimiento = :est', { est: idEstablecimiento })
            .orderBy('d.numero_episodio', 'DESC')
            .getOne();
          if (!last)
            return {
              success: false,
              mensaje: `🤔 El ternero RP ${rpTernero} no tiene diarreas anotadas.`,
            };
          const desc = `la última diarrea (episodio #${last.numero_episodio}) del ternero RP ${rpTernero}`;
          await this.guardarPendiente(userEntity.id, {
            tipo: 'confirmar_borrado',
            recurso: 'diarrea',
            id: last.id_diarrea_ternero,
            idEstablecimiento,
            desc,
          });
          return {
            success: true,
            accion: 'eliminar_diarrea',
            mensaje: `⚠️ ¿Seguro que borro ${desc}? Se borra para siempre.\nRespondé *sí* para confirmar o *no* para cancelar.`,
          };
        }

        // ──────────────────────────────────────
        case 'eliminar_evento': {
          if (!userEntity)
            return { success: false, mensaje: '🤔 No pude identificar tu usuario.' };
          const rpTernero = parseInt(body.rp_ternero) || 0;
          const rpMadre = parseInt(body.rp_madre) || 0;
          if (!rpTernero && !rpMadre)
            return {
              success: false,
              mensaje: '👂 Decime el RP del ternero o de la vaca.',
            };
          let lastEvento: EventoEntity | null = null;
          let label = '';
          if (rpTernero) {
            const r = await this.resolverTerneroIdEstricto(
              rpTernero,
              idEstablecimiento,
            );
            if ('error' in r) return { success: false, mensaje: `⚠️ ${r.error}` };
            lastEvento = await this.eventoRepo
              .createQueryBuilder('e')
              .innerJoin('e.terneros', 't')
              .where('t.id_ternero = :id', { id: r.id })
              .andWhere('e.id_establecimiento = :est', { est: idEstablecimiento })
              .orderBy('e.fecha_evento', 'DESC')
              .getOne();
            label = `ternero RP ${rpTernero}`;
          } else {
            const r = await this.resolverMadreIdEstricto(
              rpMadre,
              idEstablecimiento,
            );
            if ('error' in r) return { success: false, mensaje: `⚠️ ${r.error}` };
            lastEvento = await this.eventoRepo
              .createQueryBuilder('e')
              .innerJoin('e.madres', 'm')
              .where('m.id_madre = :id', { id: r.id })
              .andWhere('e.id_establecimiento = :est', { est: idEstablecimiento })
              .orderBy('e.fecha_evento', 'DESC')
              .getOne();
            label = `vaca RP ${rpMadre}`;
          }
          if (!lastEvento)
            return {
              success: false,
              mensaje: `🤔 El ${label} no tiene eventos anotados.`,
            };
          const desc = `el último evento del ${label}`;
          await this.guardarPendiente(userEntity.id, {
            tipo: 'confirmar_borrado',
            recurso: 'evento',
            id: lastEvento.id_evento,
            idEstablecimiento,
            desc,
          });
          return {
            success: true,
            accion: 'eliminar_evento',
            mensaje: `⚠️ ¿Seguro que borro ${desc}? Se borra para siempre.\nRespondé *sí* para confirmar o *no* para cancelar.`,
          };
        }

        // ──────────────────────────────────────
        case 'eliminar_litros': {
          if (!userEntity)
            return { success: false, mensaje: '🤔 No pude identificar tu usuario.' };
          const registros: any[] =
            await this.litrosService.findAll(idEstablecimiento);
          if (!registros.length)
            return {
              success: false,
              mensaje: '🤔 No hay registros de litros para borrar.',
            };
          const ultimo = registros[0];
          const desc = `el último registro de litros (${ultimo.fecha ? new Date(ultimo.fecha).toLocaleDateString('es-AR') : 's/f'}, total ${ultimo.total} L)`;
          await this.guardarPendiente(userEntity.id, {
            tipo: 'confirmar_borrado',
            recurso: 'litros',
            id: ultimo.id_registro,
            idEstablecimiento,
            desc,
          });
          return {
            success: true,
            accion: 'eliminar_litros',
            mensaje: `⚠️ ¿Seguro que borro ${desc}? Se borra para siempre.\nRespondé *sí* para confirmar o *no* para cancelar.`,
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
              mensaje: `🤔 No pude anotar el evento:\n${todosErrores.join('\n')}\nRevisá los RP y probá de nuevo.`,
            };
          }

          const data = {
            fecha_evento: parsearFecha(body.fecha_evento),
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
            mensaje: `✅ Evento anotado: "${data.observacion}"${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
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
              fecha_evento: parsearFecha(evt.fecha_evento),
              observacion: evt.observacion || 'Sin observación',
              id_ternero: terneroResult.ids,
              id_madre: madreResult.ids,
            });
          }

          if (eventosResueltos.length === 0) {
            return {
              success: false,
              mensaje: `🤔 No pude anotar ningún evento:\n${erroresGlobales.join('\n')}`,
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
                '👂 ¿A qué ternero le doy el tratamiento? Decime el RP.',
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
              mensaje: `⚠️ ${terneroResult.error}\nNo anoté el tratamiento.`,
            };
          }
          const bloqueoTrat = this.bloqueoPorEstadoTerminal(
            rpTernero,
            terneroResult.estado,
          );
          if (bloqueoTrat) return { success: false, mensaje: bloqueoTrat };

          const data = {
            nombre: body.nombre || body.medicamento || 'Tratamiento sin nombre',
            descripcion:
              body.descripcion ||
              body.observaciones ||
              `Registrado por bot (${userName})`,
            tipo_enfermedad: body.tipo_enfermedad || 'General',
            // El enum de la DB usa 'mañana' (con ñ); Claude manda 'manana'.
            turno: /tarde|noche|pm/i.test(body.turno || '') ? 'tarde' : 'mañana',
            fecha_tratamiento: parsearFecha(body.fecha_tratamiento),
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
            mensaje: `✅ Tratamiento anotado\n💊 ${data.nombre}\n🐄 Ternero RP: ${rpTernero}\n🏥 Tipo: ${data.tipo_enfermedad}\n⏰ Turno: ${data.turno}${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
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
                '👂 ¿A qué ternero le anoto la diarrea? Decime el RP.',
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
              mensaje: `⚠️ ${terneroResult.error}\nNo anoté la diarrea.`,
            };
          }
          const bloqueoDiarrea = this.bloqueoPorEstadoTerminal(
            rpTernero,
            terneroResult.estado,
          );
          if (bloqueoDiarrea) return { success: false, mensaje: bloqueoDiarrea };

          const data = {
            fecha_diarrea_ternero: parsearFecha(body.fecha_diarrea_ternero || body.fecha_diarrea),
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
            mensaje: `✅ Diarrea anotada\n🐄 Ternero RP: ${rpTernero}\n🔴 Severidad: ${data.severidad}\n📋 Episodio #${diarrea.numero_episodio}\n📅 Fecha: ${data.fecha_diarrea_ternero}${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
            data: diarrea,
          };
        }

        // ──────────────────────────────────────
        case 'consultar_resumen': {
          const periodo = body.periodo || 'semana';
          const desde = new Date();
          if (periodo === 'hoy') {
            desde.setHours(0, 0, 0, 0);
          } else if (periodo === 'semana') {
            desde.setDate(desde.getDate() - 7);
          } else {
            desde.setMonth(desde.getMonth() - 1);
          }
          const desdeStr = desde.toISOString().split('T')[0];

          const [ternerosVivos, ternerosNuevos, madresTotales, cantEventos, cantTratamientos, cantDiarreas] =
            await Promise.all([
              this.terneroRepo.count({ where: { id_establecimiento: idEstablecimiento, estado: 'Vivo' } }),
              this.terneroRepo.createQueryBuilder('t')
                .where('t.id_establecimiento = :id', { id: idEstablecimiento })
                .andWhere('t.fecha_nacimiento >= :desde', { desde: desdeStr })
                .getCount(),
              this.madreRepo.count({ where: { id_establecimiento: idEstablecimiento } }),
              this.eventoRepo.createQueryBuilder('e')
                .where('e.id_establecimiento = :id', { id: idEstablecimiento })
                .andWhere('e.fecha_evento >= :desde', { desde: desdeStr })
                .getCount(),
              this.tratamientoRepo.createQueryBuilder('t')
                .where('t.id_establecimiento = :id', { id: idEstablecimiento })
                .andWhere('t.fecha_tratamiento >= :desde', { desde: desdeStr })
                .getCount(),
              this.diarreaRepo.createQueryBuilder('d')
                .where('d.id_establecimiento = :id', { id: idEstablecimiento })
                .andWhere('d.fecha_diarrea_ternero >= :desde', { desde: desdeStr })
                .getCount(),
            ]);

          const periodoLabel = periodo === 'hoy' ? 'hoy' : periodo === 'semana' ? 'esta semana' : 'este mes';
          const mensaje = [
            `📊 *Resumen ${periodoLabel}*${nombreEstablecimiento ? ` — ${nombreEstablecimiento}` : ''}`,
            ``,
            `🐄 Terneros vivos: ${ternerosVivos}`,
            `🐣 Terneros nacidos ${periodoLabel}: ${ternerosNuevos}`,
            `🐮 Madres totales: ${madresTotales}`,
            `📋 Eventos registrados: ${cantEventos}`,
            `💊 Tratamientos aplicados: ${cantTratamientos}`,
            `🩺 Casos de diarrea: ${cantDiarreas}`,
          ].join('\n');

          return { success: true, accion: 'consultar_resumen', mensaje };
        }

        // ──────────────────────────────────────
        case 'asignar_rodeo':
        case 'mover_rodeo': {
          const rps: number[] = Array.isArray(body.rp_terneros)
            ? body.rp_terneros.map(Number)
            : body.rp_ternero
              ? [Number(body.rp_ternero)]
              : [];

          if (!rps.length) {
            return { success: false, mensaje: '👂 Decime el RP del ternero (o los RPs) que querés mover.' };
          }

          const nombreRodeo = String(body.nombre_rodeo || body.rodeo || '').trim();
          if (!nombreRodeo) {
            return { success: false, mensaje: '👂 ¿A qué rodeo los mando? Decime el nombre.' };
          }

          const rodeo = await this.rodeosRepo.createQueryBuilder('r')
            .where('r.id_establecimiento = :id', { id: idEstablecimiento })
            .andWhere('LOWER(r.nombre) LIKE :nombre', { nombre: `%${nombreRodeo.toLowerCase()}%` })
            .andWhere('r.estado = :estado', { estado: 'activo' })
            .getOne();

          if (!rodeo) {
            return { success: false, mensaje: `🤔 No encontré el rodeo "${nombreRodeo}" en tu establecimiento.` };
          }

          const { ids: terneroIds, errores } = await this.resolverTerneroIdsEstricto(rps, idEstablecimiento);

          if (terneroIds.length === 0) {
            return { success: false, mensaje: `🤔 No encontré esos terneros:\n${errores.join('\n')}` };
          }

          await this.rodeosRepo.query(
            `UPDATE terneros SET id_rodeo = $1 WHERE id_ternero = ANY($2) AND id_establecimiento = $3`,
            [rodeo.id_rodeo, terneroIds, idEstablecimiento],
          );

          let mensaje = `✅ ${accion === 'mover_rodeo' ? 'Movido' : 'Asignado'} al rodeo *${rodeo.nombre}*\n🐄 RP(s): ${rps.join(', ')}`;
          if (errores.length > 0) mensaje += `\n⚠️ No encontrados:\n${errores.join('\n')}`;
          if (nombreEstablecimiento) mensaje += `\n🏠 Campo: ${nombreEstablecimiento}`;

          return { success: true, accion, mensaje };
        }

        // ──────────────────────────────────────
        case 'crear_rodeo': {
          if (userEntity?.rol !== 'admin') {
            return { success: false, mensaje: '⛔ Esto lo hace solo el encargado (crear rodeos).' };
          }

          const nombreRodeoNuevo = String(body.nombre_rodeo || body.nombre || '').trim();
          if (!nombreRodeoNuevo) {
            return { success: false, mensaje: '👂 Decime el nombre del rodeo que querés crear.' };
          }

          const existe = await this.rodeosRepo.findOne({
            where: { nombre: nombreRodeoNuevo, id_establecimiento: idEstablecimiento },
          });
          if (existe) {
            return { success: false, mensaje: `👀 Ya hay un rodeo llamado "${nombreRodeoNuevo}" en ${nombreEstablecimiento}.` };
          }

          const nuevoRodeo = this.rodeosRepo.create({
            nombre: nombreRodeoNuevo,
            descripcion: String(body.descripcion || '').trim() || null,
            tipo: String(body.tipo || '').trim() || null,
            estado: 'activo',
            id_establecimiento: idEstablecimiento,
          });
          await this.rodeosRepo.save(nuevoRodeo);

          return {
            success: true,
            accion: 'crear_rodeo',
            mensaje: `✅ Rodeo *${nombreRodeoNuevo}* creado en ${nombreEstablecimiento}.`,
          };
        }

        // ──────────────────────────────────────
        case 'registrar_peso': {
          const rpTernero = parseInt(body.rp_ternero) || 0;
          const peso = parseFloat(body.peso) || 0;

          if (!rpTernero || rpTernero <= 0) {
            return { success: false, mensaje: '👂 Me falta el RP del ternero.' };
          }
          if (!peso || peso <= 0) {
            return { success: false, mensaje: '👂 Me falta el peso (en kg).' };
          }

          const ternero = await this.terneroRepo.findOne({
            where: { rp_ternero: rpTernero, id_establecimiento: idEstablecimiento },
          });
          if (!ternero) {
            return { success: false, mensaje: `👀 No encontré el ternero RP ${rpTernero} en tu establecimiento. Fijate el número.` };
          }
          const bloqueoPeso = this.bloqueoPorEstadoTerminal(rpTernero, ternero.estado);
          if (bloqueoPeso) return { success: false, mensaje: bloqueoPeso };

          const fechaNac = new Date(ternero.fecha_nacimiento);
          const hoyDate = new Date();
          const diasVida = Math.floor((hoyDate.getTime() - fechaNac.getTime()) / (1000 * 60 * 60 * 24));

          let columna: string;
          let etiqueta: string;
          if (diasVida <= 7) {
            columna = 'peso_nacer'; etiqueta = 'Nacimiento';
          } else if (diasVida <= 22) {
            columna = 'peso_15d'; etiqueta = '15 días';
          } else if (diasVida <= 37) {
            columna = 'peso_30d'; etiqueta = '30 días';
          } else if (diasVida <= 52) {
            columna = 'peso_45d'; etiqueta = '45 días';
          } else {
            columna = 'peso_largado'; etiqueta = 'Largado';
          }

          // Además de la columna hito, guardamos cada pesaje en el historial
          // (columna `estimativo`, formato "fecha:peso|...") para no perder
          // pesajes — sobre todo pasados los 52 días, donde antes todo pisaba
          // peso_largado.
          const fechaHoy = new Date().toISOString().split('T')[0];
          const nuevoPesaje = `${fechaHoy}:${peso}`;
          const estimativoNuevo =
            ternero.estimativo && ternero.estimativo.trim() !== ''
              ? `${ternero.estimativo}|${nuevoPesaje}`
              : nuevoPesaje;
          const totalPesajes = estimativoNuevo.split('|').length;

          await this.terneroRepo.update(ternero.id_ternero, {
            [columna]: peso,
            estimativo: estimativoNuevo,
          } as any);

          return {
            success: true,
            accion: 'registrar_peso',
            mensaje: `✅ Peso anotado\n🐄 Ternero RP: ${rpTernero}\n⚖️ ${peso} kg (${etiqueta})\n📅 Días de vida: ${diasVida}\n📈 Pesajes totales: ${totalPesajes}${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
          };
        }

        // ──────────────────────────────────────
        case 'registrar_calostrado': {
          const rpTernero = parseInt(body.rp_ternero) || 0;
          if (!rpTernero || rpTernero <= 0) {
            return {
              success: false,
              mensaje:
                '👂 Me falta el RP del ternero para anotar el calostrado.',
            };
          }

          const ternero = await this.terneroRepo.findOne({
            where: { rp_ternero: rpTernero, id_establecimiento: idEstablecimiento },
          });
          if (!ternero) {
            return {
              success: false,
              mensaje: `👀 No encontré el ternero RP ${rpTernero} en tu establecimiento. Fijate el número.`,
            };
          }
          const bloqueoCal = this.bloqueoPorEstadoTerminal(rpTernero, ternero.estado);
          if (bloqueoCal) return { success: false, mensaje: bloqueoCal };

          // Método: el enum DB es 'sonda' | 'mamadera'. Normalizamos por las dudas.
          const metodoRaw = String(
            body.metodo_calostrado || body.metodo || '',
          ).toLowerCase();
          let metodo: string | null = null;
          if (/sonda/.test(metodoRaw)) metodo = 'sonda';
          else if (/mamadera|mamila|biber|teta/.test(metodoRaw))
            metodo = 'mamadera';

          const litros =
            parseFloat(body.litros_calostrado ?? body.litros) || null;
          const gradoBrix = parseFloat(body.grado_brix ?? body.brix) || null;

          const updateData: any = {
            fecha_hora_calostrado: body.fecha_hora_calostrado
              ? new Date(body.fecha_hora_calostrado)
              : new Date(),
            observaciones_calostrado:
              body.observaciones_calostrado ||
              body.observaciones ||
              `Registrado por bot (${userName})`,
          };
          if (metodo) updateData.metodo_calostrado = metodo;
          if (litros !== null) updateData.litros_calostrado = litros;
          if (gradoBrix !== null) updateData.grado_brix = gradoBrix;

          await this.terneroRepo.update(ternero.id_ternero, updateData);

          // Calidad por grado Brix (misma escala que evaluarCalidadCalostro de la entity).
          const brixFinal =
            gradoBrix ??
            (ternero.grado_brix ? Number(ternero.grado_brix) : null);
          let calidad = 'No medido';
          if (brixFinal) {
            if (brixFinal >= 22) calidad = 'Excelente';
            else if (brixFinal >= 18) calidad = 'Bueno';
            else if (brixFinal >= 15) calidad = 'Regular';
            else calidad = 'Bajo';
          }

          const lineas = [
            '✅ Calostrado anotado',
            `🐄 Ternero RP: ${rpTernero}`,
          ];
          if (metodo) lineas.push(`🍼 Método: ${metodo}`);
          if (litros !== null) lineas.push(`🥛 Litros: ${litros} L`);
          if (brixFinal) lineas.push(`📈 Brix: ${brixFinal} (${calidad})`);
          if (nombreEstablecimiento)
            lineas.push(`🏠 Campo: ${nombreEstablecimiento}`);

          return {
            success: true,
            accion: 'registrar_calostrado',
            mensaje: lineas.join('\n'),
          };
        }

        // ──────────────────────────────────────
        case 'consultar_ternero': {
          const rpTernero = parseInt(body.rp_ternero) || 0;
          if (!rpTernero) return { success: false, mensaje: '👂 Me falta el RP del ternero.' };

          const t = await this.terneroRepo.findOne({
            where: { rp_ternero: rpTernero, id_establecimiento: idEstablecimiento },
            relations: ['rodeo'],
          });
          if (!t) return { success: false, mensaje: `👀 No encontré el ternero RP ${rpTernero} en tu establecimiento. Fijate el número.` };

          const fechaNac = new Date(t.fecha_nacimiento);
          const diasVida = Math.floor((new Date().getTime() - fechaNac.getTime()) / (1000 * 60 * 60 * 24));
          const ultimoPeso = t.peso_largado || t.peso_45d || t.peso_30d || t.peso_15d || t.peso_nacer || 0;

          // Evolución de pesajes desde el historial (columna estimativo).
          const histPesajes = (t.estimativo || '')
            .split('|')
            .filter(Boolean)
            .map((p) => parseFloat(p.split(':')[1]))
            .filter((n) => !isNaN(n));
          const lineaPesajes = histPesajes.length
            ? `📈 Pesajes (${histPesajes.length}): ${histPesajes.slice(-4).join(' → ')} kg`
            : '';

          const lineas = [
            `🐄 Ternero RP *${t.rp_ternero}*`,
            `📊 Estado: ${t.estado}`,
            `⚧ Sexo: ${t.sexo}`,
            `📅 Nacimiento: ${t.fecha_nacimiento} (${diasVida} días)`,
            `⚖️ Último peso: ${ultimoPeso} kg`,
            lineaPesajes,
            t.rodeo ? `🏟️ Rodeo: ${t.rodeo.nombre}` : `🏟️ Rodeo: sin asignar`,
            nombreEstablecimiento ? `🏠 Campo: ${nombreEstablecimiento}` : '',
          ].filter(Boolean);

          return { success: true, accion: 'consultar_ternero', mensaje: lineas.join('\n') };
        }

        // ──────────────────────────────────────
        case 'actualizar_estado_ternero': {
          const rpTernero = parseInt(body.rp_ternero) || 0;
          if (!rpTernero) return { success: false, mensaje: '👂 Me falta el RP del ternero.' };

          const estadoNuevo = String(body.estado || '').trim();
          if (!['Vivo', 'Muerto'].includes(estadoNuevo)) {
            return { success: false, mensaje: '🤔 Ese estado no va. Poné *Vivo* o *Muerto*.' };
          }

          const t = await this.terneroRepo.findOne({
            where: { rp_ternero: rpTernero, id_establecimiento: idEstablecimiento },
          });
          if (!t) return { success: false, mensaje: `👀 No encontré el ternero RP ${rpTernero} en tu establecimiento. Fijate el número.` };

          await this.terneroRepo.update(t.id_ternero, { estado: estadoNuevo } as any);

          return {
            success: true,
            accion: 'actualizar_estado_ternero',
            mensaje: `✅ Ternero RP ${rpTernero} actualizado a *${estadoNuevo}*${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
          };
        }

        // ──────────────────────────────────────
        case 'consultar_madre': {
          const rpMadre = parseInt(body.rp_madre) || 0;
          if (!rpMadre) return { success: false, mensaje: '👂 Me falta el RP de la madre.' };

          const m = await this.madreRepo.findOne({
            where: { rp_madre: rpMadre, id_establecimiento: idEstablecimiento },
          });
          if (!m) return { success: false, mensaje: `👀 No encontré la madre RP ${rpMadre} en tu establecimiento. Fijate el número.` };

          const crias = await this.terneroRepo
            .createQueryBuilder('t')
            .where('t.id_madre = :idMadre', { idMadre: m.id_madre })
            .andWhere('t.id_establecimiento = :est', { est: idEstablecimiento })
            .getCount();

          const lineas = [
            `🐮 Madre RP *${m.rp_madre}*`,
            m.nombre && m.nombre !== 'Sin nombre' ? `🏷️ Nombre: ${m.nombre}` : '',
            `📊 Estado: ${m.estado}`,
            `🐄 Crías registradas: ${crias}`,
            nombreEstablecimiento ? `🏠 Campo: ${nombreEstablecimiento}` : '',
          ].filter(Boolean);

          return { success: true, accion: 'consultar_madre', mensaje: lineas.join('\n') };
        }

        // ──────────────────────────────────────
        case 'actualizar_estado_madre': {
          const rpMadre = parseInt(body.rp_madre) || 0;
          if (!rpMadre) return { success: false, mensaje: '👂 Me falta el RP de la madre.' };

          const estadoNuevo = String(body.estado || '').trim();
          // El sistema solo maneja Seca / En Tambo para madres (la preñez es un
          // evento de tacto, NO un estado de madre).
          const ESTADOS_MADRE = ['Seca', 'En Tambo'];
          if (!ESTADOS_MADRE.includes(estadoNuevo)) {
            return { success: false, mensaje: `🤔 Ese estado no va para la madre. Solo puede ser *${ESTADOS_MADRE.join('* o *')}*.` };
          }

          const m = await this.madreRepo.findOne({
            where: { rp_madre: rpMadre, id_establecimiento: idEstablecimiento },
          });
          if (!m) return { success: false, mensaje: `👀 No encontré la madre RP ${rpMadre} en tu establecimiento. Fijate el número.` };

          await this.madreRepo.update(m.id_madre, { estado: estadoNuevo } as any);

          return {
            success: true,
            accion: 'actualizar_estado_madre',
            mensaje: `✅ Madre RP ${rpMadre} actualizada a *${estadoNuevo}*${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
          };
        }

        // ──────────────────────────────────────
        case 'consultar_rodeo': {
          const nombreRodeoQ = String(body.nombre_rodeo || body.rodeo || '').trim();
          if (!nombreRodeoQ) return { success: false, mensaje: '👂 Decime el nombre del rodeo.' };

          const rodeo = await this.rodeosRepo.createQueryBuilder('r')
            .where('r.id_establecimiento = :id', { id: idEstablecimiento })
            .andWhere('LOWER(r.nombre) LIKE :nombre', { nombre: `%${nombreRodeoQ.toLowerCase()}%` })
            .getOne();

          if (!rodeo) return { success: false, mensaje: `🤔 No encontré el rodeo "${nombreRodeoQ}".` };

          const terneros = await this.terneroRepo.find({
            where: { id_rodeo: rodeo.id_rodeo, id_establecimiento: idEstablecimiento },
            select: ['rp_ternero', 'sexo', 'estado', 'peso_nacer'],
          });

          if (!terneros.length) {
            return { success: true, accion: 'consultar_rodeo', mensaje: `🏟️ Rodeo *${rodeo.nombre}* — sin terneros asignados.` };
          }

          const lista = terneros.map(t => `  • RP ${t.rp_ternero} (${t.sexo}, ${t.estado})`).join('\n');
          return {
            success: true,
            accion: 'consultar_rodeo',
            mensaje: `🏟️ Rodeo *${rodeo.nombre}* — ${terneros.length} ternero(s):\n${lista}${nombreEstablecimiento ? '\n🏠 Campo: ' + nombreEstablecimiento : ''}`,
          };
        }

        // ──────────────────────────────────────
        case 'editar_diarrea': {
          const rpTernero = parseInt(body.rp_ternero) || 0;
          if (!rpTernero) return { success: false, mensaje: '👂 Me falta el RP del ternero.' };

          const terneroResult = await this.resolverTerneroIdEstricto(rpTernero, idEstablecimiento);
          if ('error' in terneroResult) {
            return { success: false, mensaje: `⚠️ ${terneroResult.error}` };
          }

          const lastDiarrea = await this.diarreaRepo
            .createQueryBuilder('d')
            .leftJoin('d.ternero', 't')
            .where('t.id_ternero = :id', { id: terneroResult.id })
            .andWhere('d.id_establecimiento = :est', { est: idEstablecimiento })
            .orderBy('d.numero_episodio', 'DESC')
            .getOne();

          if (!lastDiarrea) {
            return { success: false, mensaje: `🤔 El ternero RP ${rpTernero} no tiene diarreas anotadas todavía.` };
          }

          const cambiosDiarrea: Record<string, any> = {};
          if (body.severidad) cambiosDiarrea.severidad = body.severidad;
          if (body.fecha_diarrea_ternero) cambiosDiarrea.fecha_diarrea_ternero = parsearFecha(body.fecha_diarrea_ternero);
          if (body.observaciones != null) cambiosDiarrea.observaciones = body.observaciones;

          if (!Object.keys(cambiosDiarrea).length) {
            return { success: false, mensaje: '🤔 ¿Qué querés corregir? Decime la severidad, la fecha o la observación.' };
          }

          await this.diarreaRepo.update(lastDiarrea.id_diarrea_ternero, cambiosDiarrea);

          const lineasDiarrea = [
            `✅ Diarrea del ternero RP ${rpTernero} corregida (episodio #${lastDiarrea.numero_episodio})`,
          ];
          if (cambiosDiarrea.severidad) lineasDiarrea.push(`🔴 Severidad: ${cambiosDiarrea.severidad}`);
          if (cambiosDiarrea.fecha_diarrea_ternero) lineasDiarrea.push(`📅 Fecha: ${cambiosDiarrea.fecha_diarrea_ternero}`);
          if (nombreEstablecimiento) lineasDiarrea.push(`🏠 Campo: ${nombreEstablecimiento}`);

          return { success: true, accion: 'editar_diarrea', mensaje: lineasDiarrea.join('\n') };
        }

        // ──────────────────────────────────────
        case 'editar_tratamiento': {
          const rpTernero = parseInt(body.rp_ternero) || 0;
          if (!rpTernero) return { success: false, mensaje: '👂 Me falta el RP del ternero.' };

          const terneroResult = await this.resolverTerneroIdEstricto(rpTernero, idEstablecimiento);
          if ('error' in terneroResult) {
            return { success: false, mensaje: `⚠️ ${terneroResult.error}` };
          }

          const lastTratamiento = await this.tratamientoRepo
            .createQueryBuilder('tr')
            .leftJoin('tr.ternero', 't')
            .where('t.id_ternero = :id', { id: terneroResult.id })
            .andWhere('tr.id_establecimiento = :est', { est: idEstablecimiento })
            .orderBy('tr.fecha_tratamiento', 'DESC')
            .getOne();

          if (!lastTratamiento) {
            return { success: false, mensaje: `🤔 El ternero RP ${rpTernero} no tiene tratamientos anotados todavía.` };
          }

          const cambiosTrat: Record<string, any> = {};
          if (body.nombre) cambiosTrat.nombre = body.nombre;
          if (body.tipo_enfermedad) cambiosTrat.tipo_enfermedad = body.tipo_enfermedad;
          if (body.turno) cambiosTrat.turno = /tarde|noche|pm/i.test(body.turno) ? 'tarde' : 'mañana';
          if (body.fecha_tratamiento) cambiosTrat.fecha_tratamiento = parsearFecha(body.fecha_tratamiento);
          if (body.descripcion || body.observaciones) cambiosTrat.descripcion = body.descripcion || body.observaciones;

          if (!Object.keys(cambiosTrat).length) {
            return { success: false, mensaje: '🤔 ¿Qué querés corregir? Decime el medicamento, el tipo, el turno o la fecha.' };
          }

          await this.tratamientoRepo.update(lastTratamiento.id_tratamiento, cambiosTrat);

          const lineasTrat = [
            `✅ Tratamiento del ternero RP ${rpTernero} corregido`,
          ];
          if (cambiosTrat.nombre) lineasTrat.push(`💊 Medicamento: ${cambiosTrat.nombre}`);
          if (cambiosTrat.tipo_enfermedad) lineasTrat.push(`🏥 Tipo: ${cambiosTrat.tipo_enfermedad}`);
          if (cambiosTrat.turno) lineasTrat.push(`⏰ Turno: ${cambiosTrat.turno}`);
          if (cambiosTrat.fecha_tratamiento) lineasTrat.push(`📅 Fecha: ${cambiosTrat.fecha_tratamiento}`);
          if (nombreEstablecimiento) lineasTrat.push(`🏠 Campo: ${nombreEstablecimiento}`);

          return { success: true, accion: 'editar_tratamiento', mensaje: lineasTrat.join('\n') };
        }

        // ──────────────────────────────────────
        case 'editar_evento': {
          const rpTernero = parseInt(body.rp_ternero) || 0;
          const rpMadre = parseInt(body.rp_madre) || 0;

          if (!rpTernero && !rpMadre) {
            return { success: false, mensaje: '👂 Decime el RP del ternero o de la madre.' };
          }

          let lastEvento: EventoEntity | null = null;

          if (rpTernero) {
            const terneroResult = await this.resolverTerneroIdEstricto(rpTernero, idEstablecimiento);
            if ('error' in terneroResult) {
              return { success: false, mensaje: `⚠️ ${terneroResult.error}` };
            }
            lastEvento = await this.eventoRepo
              .createQueryBuilder('e')
              .innerJoin('e.terneros', 't')
              .where('t.id_ternero = :id', { id: terneroResult.id })
              .andWhere('e.id_establecimiento = :est', { est: idEstablecimiento })
              .orderBy('e.fecha_evento', 'DESC')
              .getOne();
          } else {
            const madreResult = await this.resolverMadreIdEstricto(rpMadre, idEstablecimiento);
            if ('error' in madreResult) {
              return { success: false, mensaje: `⚠️ ${madreResult.error}` };
            }
            lastEvento = await this.eventoRepo
              .createQueryBuilder('e')
              .innerJoin('e.madres', 'm')
              .where('m.id_madre = :id', { id: madreResult.id })
              .andWhere('e.id_establecimiento = :est', { est: idEstablecimiento })
              .orderBy('e.fecha_evento', 'DESC')
              .getOne();
          }

          if (!lastEvento) {
            const label = rpTernero ? `ternero RP ${rpTernero}` : `madre RP ${rpMadre}`;
            return { success: false, mensaje: `🤔 El ${label} no tiene eventos anotados todavía.` };
          }

          const cambiosEvento: Record<string, any> = {};
          if (body.observacion) cambiosEvento.observacion = body.observacion;
          if (body.fecha_evento) cambiosEvento.fecha_evento = parsearFecha(body.fecha_evento);

          if (!Object.keys(cambiosEvento).length) {
            return { success: false, mensaje: '🤔 ¿Qué querés corregir? Decime la observación o la fecha.' };
          }

          await this.eventoRepo.update(lastEvento.id_evento, cambiosEvento);

          const lineasEvento = [`✅ Evento corregido`];
          if (cambiosEvento.observacion) lineasEvento.push(`📋 Descripción: ${cambiosEvento.observacion}`);
          if (cambiosEvento.fecha_evento) lineasEvento.push(`📅 Fecha: ${cambiosEvento.fecha_evento}`);
          if (nombreEstablecimiento) lineasEvento.push(`🏠 Campo: ${nombreEstablecimiento}`);

          return { success: true, accion: 'editar_evento', mensaje: lineasEvento.join('\n') };
        }

        // ──────────────────────────────────────
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
                'consultar_resumen',
                'asignar_rodeo',
                'mover_rodeo',
                'crear_rodeo',
                'registrar_peso',
                'consultar_ternero',
                'actualizar_estado_ternero',
                'consultar_rodeo',
                'cambiar_perfil',
                'registrar_calostrado',
                'consultar_madre',
                'actualizar_estado_madre',
                'editar_diarrea',
                'editar_tratamiento',
                'editar_evento',
                'registrar_litros',
                'crear_dieta',
                'consultar_dieta',
                'desasignar_rodeo',
                'consultar_del',
                'consultar_salud',
                'eliminar_ternero',
                'eliminar_madre',
                'eliminar_evento',
                'eliminar_tratamiento',
                'eliminar_diarrea',
                'eliminar_litros',
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
        mensaje: `😕 Uf, algo salió mal. Probá de nuevo y si sigue pasando avisale al encargado.`,
      };
    }
  }

  // ════════════════════════════════════════════
  // ENDPOINT LOTE — múltiples acciones de un mensaje
  // ════════════════════════════════════════════
  // Etiqueta amigable de cada acción para los mensajes de error del lote.
  private etiquetaAccion(accion: string): string {
    const ETIQUETAS: Record<string, string> = {
      crear_tratamiento: 'tratamiento',
      crear_diarrea: 'diarrea',
      crear_evento: 'evento',
      registrar_peso: 'registro de peso',
      actualizar_estado_ternero: 'cambio de estado',
      asignar_rodeo: 'asignación de rodeo',
      mover_rodeo: 'movimiento de rodeo',
    };
    return ETIQUETAS[accion] || accion;
  }

  /**
   * Pre-chequeo del lote: para una acción, indica si exige un ternero EXISTENTE
   * y qué RPs referencia. Las acciones que CREAN un ternero (crear_ternero) no
   * entran acá. crear_evento valida los RPs que tenga pero no los exige (puede
   * ser un evento de madre).
   */
  private rpsTerneroRequeridos(accion: BotRequestBody): {
    exigirRp: boolean;
    rps: number[];
  } {
    const aArray = (v: any): number[] =>
      (Array.isArray(v) ? v : v != null ? [v] : [])
        .map((x) => parseInt(x))
        .filter((n) => n > 0);

    switch (accion.accion) {
      case 'crear_tratamiento':
      case 'crear_diarrea':
        return { exigirRp: true, rps: aArray(accion.id_ternero) };
      case 'registrar_peso':
      case 'actualizar_estado_ternero':
        return { exigirRp: true, rps: aArray(accion.rp_ternero) };
      case 'asignar_rodeo':
      case 'mover_rodeo':
        return {
          exigirRp: true,
          rps: aArray(accion.rp_terneros ?? accion.rp_ternero),
        };
      case 'crear_evento':
        return { exigirRp: false, rps: aArray(accion.id_ternero) };
      default:
        return { exigirRp: false, rps: [] };
    }
  }

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

    // Resolver auth una sola vez para todo el lote (evitar N+1 de queries por phone)
    let idEstablecimientoLote: number | null = null;
    let _userNameLote = 'Ganadero';
    let _nombreEstablecimientoLote = '';

    if (phone) {
      const auth = await this.autenticarPorTelefono(phone);
      if (!auth) {
        return {
          success: false,
          mensaje: `👋 Tu número todavía no está en el sistema (o no tenés establecimiento asignado). Pedile al encargado que te dé de alta.`,
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
      idEstablecimientoLote = auth.establecimientoId;
      _userNameLote = auth.userName;
      const estInfo = auth.establecimientos.find(e => e.id === auth.establecimientoId);
      if (estInfo) {
        _nombreEstablecimientoLote = estInfo.nombre;
      } else if (idEstablecimientoLote) {
        const est = await this.establecimientoRepo.findOne({ where: { id_establecimiento: idEstablecimientoLote } });
        if (est) _nombreEstablecimientoLote = est.nombre;
      }
    }

    // Inyectar phone en cada accion; registrar delega al handler completo si no hay phone
    const accionesConPhone = acciones.map((a) => ({
      ...a,
      phone: a.phone || phone,
    }));

    // ── Pre-validación: todo-o-nada liviano ──
    // Si alguna acción del lote referencia un ternero inexistente o le falta el
    // RP, abortamos TODO el lote ANTES de escribir nada. Así evitamos dejar
    // datos a medias (ej: diarrea registrada pero el tratamiento falla).
    // Solo aplica cuando hay establecimiento resuelto (flujo real del bot).
    if (idEstablecimientoLote) {
      // RPs que se CREAN dentro de este mismo lote (crear_ternero): no exigir
      // que ya existan — la acción de creación corre antes en el loop.
      const rpsCreadosEnLote = new Set<number>(
        accionesConPhone
          .filter((a) => a.accion === 'crear_ternero')
          .map((a) => parseInt((a as any).rp_ternero))
          .filter((n) => n > 0),
      );

      const fallos: string[] = [];
      for (const accion of accionesConPhone) {
        const { exigirRp, rps } = this.rpsTerneroRequeridos(accion);
        if (exigirRp && rps.length === 0) {
          fallos.push(
            `• ${this.etiquetaAccion(accion.accion)}: falta el RP del ternero`,
          );
          continue;
        }
        for (const rp of rps) {
          if (rpsCreadosEnLote.has(rp)) continue; // se crea en este lote
          const res = await this.resolverTerneroIdEstricto(
            rp,
            idEstablecimientoLote,
          );
          if ('error' in res) {
            fallos.push(`• ${this.etiquetaAccion(accion.accion)}: ${res.error}`);
          }
        }
      }
      if (fallos.length > 0) {
        return {
          success: false,
          abortado: true,
          total: acciones.length,
          exitosos: 0,
          mensaje: `⚠️ No anoté nada para no dejar datos a medias.\n\n${fallos.join('\n')}\n\nCorregilo y mandámelo de nuevo.`,
        };
      }
    }

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
