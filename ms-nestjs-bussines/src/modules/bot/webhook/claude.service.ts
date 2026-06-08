import { Injectable, Logger } from '@nestjs/common';

// ─────────────────────────────────────────────
// Servicio que llama a Claude para parsear el mensaje del ganadero
// a JSON de acción. Portado de los nodos "Preparar Body Claude",
// "Claude API (Texto → JSON)" y "Limpiar JSON" del workflow n8n.
// ─────────────────────────────────────────────

const ACCIONES_VALIDAS = [
  'crear_ternero', 'crear_madre', 'crear_evento', 'crear_multiples_eventos',
  'crear_tratamiento', 'crear_diarrea', 'seleccionar_establecimiento',
  'cambiar_establecimiento', 'consultar_resumen', 'asignar_rodeo', 'mover_rodeo',
  'crear_rodeo', 'registrar_peso', 'consultar_ternero', 'actualizar_estado_ternero',
  'consultar_rodeo', 'cambiar_perfil', 'registrar_calostrado',
  'consultar_madre', 'actualizar_estado_madre',
];

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export type AccionParseada = Record<string, any>;

export interface ResultadoParseo {
  _esLote: boolean;
  phone?: string;
  acciones?: AccionParseada[];
  accion?: string;
  [key: string]: any;
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  private construirSystemPrompt(): string {
    const hoy = new Date().toISOString().split('T')[0];
    return (
      'Eres un asistente veterinario para una app ganadera argentina. Analizá el mensaje del usuario y devolvé JSON estructurado.\n\n' +
      'FECHA HOY: ' + hoy + '\n\n' +
      '=== REGLAS ===\n' +
      '1. SOLO JSON válido. Sin markdown, sin texto extra, sin explicaciones.\n' +
      '2. NUNCA inventes RPs. Sin RP mencionado → usa 0.\n' +
      '3. Una acción = objeto JSON. Varias acciones = ARRAY.\n' +
      '4. Fechas en YYYY-MM-DD. Sin fecha explícita → hoy. Si el usuario dice "ayer" → resta 1 día.\n' +
      '5. Números como palabras → entero: cien=100, doscientos=200, trescientos=300, cuatrocientos=400, quinientos=500, seiscientos=600, setecientos=700, ochocientos=800, novecientos=900, mil=1000.\n' +
      '6. Sexo: macho/toro/bull → Macho. hembra/vaca/ternera/vaquillona → Hembra. Default: Macho.\n' +
      '7. Turno: mañana/temprano/AM → manana. tarde/noche/PM → tarde. Default: manana.\n' +
      '8. Peso (peso_nacer/peso_nacimiento/peso) → siempre campo peso_nacimiento.\n' +
      '9. Semen/toro/pajuela/tipo_semen → campo tipo_semen. Sin dato → N/A.\n' +
      '10. Estado ternero: default Vivo. murió/muerto/falleció → Muerto. vendido → Vendido.\n' +
      '11. Estado madre: SOLO Seca o En Tambo. seca/secó → Seca. en tambo/ordeñe/parió y da leche → En Tambo. La preñez NO es estado de madre (es evento de tacto). Para "vaca/madre" usá actualizar_estado_madre (rp_madre); para "ternero" usá actualizar_estado_ternero (rp_ternero).\n' +
      '12. Severidad diarrea: leve/poca → Leve. moderada/regular → Moderada. grave/fuerte/severa → Severa. crítica/muy grave → Critica.\n' +
      '13. El campo id_madre en crear_ternero es el RP de la madre, NO su ID interno.\n' +
      '14. NUNCA incluyas el campo id_establecimiento en el JSON — el backend lo resuelve automáticamente.\n' +
      '15. Método calostrado: sonda/sondaje → sonda. mamadera/mamila/biberón/teta → mamadera. Sin dato → omití el campo. grado_brix solo si lo dicen (número).\n\n' +
      '=== ACCIONES ===\n' +
      'crear_ternero CUANDO nacio pario parto cria ternero nuevo nacio hoy vaca pario tuvo cria: {"accion":"crear_ternero","rp_ternero":0,"peso_nacimiento":0,"sexo":"Macho","estado":"Vivo","fecha_nacimiento":"YYYY-MM-DD","observaciones":"","tipo_semen":"N/A","id_madre":null}\n' +
      'crear_madre CUANDO ingrese vaca compre madre nueva vaca entro vaca registrar madre: {"accion":"crear_madre","rp_madre":0,"nombre":"Sin nombre","estado":"En Tambo","observaciones":""}\n' +
      'crear_evento CUANDO vacune tacte insemina pese marque castre desmame destete revise sanidad pesaje bane: {"accion":"crear_evento","fecha_evento":"YYYY-MM-DD","observacion":"","id_ternero":[],"id_madre":[]}\n' +
      'crear_tratamiento CUANDO le di aplique inyecte puse medicamento antibiotico antiparasitario suero vitamina desparasitante ivermectina oxitetraciclina enrofloxacina penicilina hierro: {"accion":"crear_tratamiento","nombre":"","descripcion":"","tipo_enfermedad":"General","turno":"manana","fecha_tratamiento":"YYYY-MM-DD","id_ternero":0}\n' +
      'crear_diarrea CUANDO diarrea cagadera deposiciones liquidas deshidratado flojo suelto debil: {"accion":"crear_diarrea","id_ternero":0,"severidad":"Leve","fecha_diarrea_ternero":"YYYY-MM-DD","observaciones":""}\n' +
      'consultar_resumen CUANDO resumen cuantos tengo que se registro que hubo dame un resumen cuantos terneros: {"accion":"consultar_resumen","periodo":"hoy" o "semana" o "mes"}\n' +
      'asignar_rodeo CUANDO asignar a rodeo poner en rodeo agregar al grupo metelo en: {"accion":"asignar_rodeo","rp_terneros":[1,2,3],"nombre_rodeo":"nombre del rodeo"}\n' +
      'mover_rodeo CUANDO mover a rodeo cambiar de rodeo pasar al grupo pasarlo a otro: {"accion":"mover_rodeo","rp_terneros":[1,2,3],"nombre_rodeo":"nombre del rodeo destino"}\n' +
      'crear_rodeo CUANDO crear rodeo nuevo grupo nuevo lote nuevo: {"accion":"crear_rodeo","nombre_rodeo":"nombre","descripcion":"opcional","tipo":"opcional"}\n' +
      'registrar_peso CUANDO pesa peso ternero pesaje kg pesar: {"accion":"registrar_peso","rp_ternero":0,"peso":0}\n' +
      'registrar_calostrado CUANDO calostro calostrado calostre encalostrar le di calostro tomo calostro mamadera sonda brix: {"accion":"registrar_calostrado","rp_ternero":0,"metodo_calostrado":"sonda","litros_calostrado":0,"grado_brix":0,"observaciones_calostrado":""}\n' +
      'consultar_ternero CUANDO como esta el ternero info ternero ver ternero consultar ternero: {"accion":"consultar_ternero","rp_ternero":0}\n' +
      'consultar_madre CUANDO como esta la madre info madre ver madre consultar madre datos de la vaca: {"accion":"consultar_madre","rp_madre":0}\n' +
      'actualizar_estado_madre CUANDO la vaca madre se seco quedo seca paso a tambo entro en ordeñe: {"accion":"actualizar_estado_madre","rp_madre":0,"estado":"Seca"}\n' +
      'actualizar_estado_ternero CUANDO murio se murio fallecio muerto mato: {"accion":"actualizar_estado_ternero","rp_ternero":0,"estado":"Muerto"}\n' +
      'consultar_rodeo CUANDO que tiene el rodeo terneros del rodeo ver rodeo listar rodeo: {"accion":"consultar_rodeo","nombre_rodeo":"nombre"}\n' +
      'cambiar_perfil CUANDO cambiar usuario cambiar perfil login otro usuario soy otro: {"accion":"cambiar_perfil","email":"email@x.com","password":"contraseña"}\n' +
      'cambiar_establecimiento CUANDO cambiar establecimiento cambiar campo otro campo cambiar tambo: {"accion":"cambiar_establecimiento"}\n\n' +
      '=== DIFERENCIACION ===\n' +
      '- Enfermedad SIN medicamento → crear_evento\n' +
      '- Solo medicamento → crear_tratamiento\n' +
      '- Enfermedad + medicamento → ARRAY [crear_evento, crear_tratamiento]\n' +
      '- Diarrea sola → crear_diarrea\n' +
      '- Diarrea + medicamento → ARRAY [crear_diarrea, crear_tratamiento]'
    );
  }

  /**
   * Llama a Claude y devuelve el texto crudo de respuesta (JSON sin parsear).
   */
  async llamarClaude(texto: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada');

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: this.construirSystemPrompt(),
        messages: [
          { role: 'user', content: '<user_message>' + texto + '</user_message>' },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Claude API ${res.status}: ${errBody.substring(0, 300)}`);
    }

    const data: any = await res.json();
    return data?.content?.[0]?.text || '';
  }

  /**
   * Valida y sanea una acción. Portado de validarAccion() del nodo "Limpiar JSON".
   */
  private validarAccion(obj: AccionParseada): AccionParseada {
    if (!obj.accion) throw new Error('Falta campo "accion"');
    if (!ACCIONES_VALIDAS.includes(obj.accion))
      throw new Error('Acción inválida: "' + obj.accion + '"');

    delete obj.id_establecimiento;

    if (obj.rp_ternero !== undefined) {
      const rp = parseInt(obj.rp_ternero);
      if (isNaN(rp) || rp < 0) throw new Error('rp_ternero inválido: ' + obj.rp_ternero);
      obj.rp_ternero = rp;
    }
    if (obj.rp_madre !== undefined) {
      const rp = parseInt(obj.rp_madre);
      if (isNaN(rp) || rp < 0) throw new Error('rp_madre inválido: ' + obj.rp_madre);
      obj.rp_madre = rp;
    }
    if (obj.id_ternero !== undefined && !Array.isArray(obj.id_ternero)) {
      const rp = parseInt(obj.id_ternero);
      if (isNaN(rp) || rp < 0) throw new Error('id_ternero inválido: ' + obj.id_ternero);
      obj.id_ternero = rp;
    }
    if (
      obj.id_madre !== undefined &&
      !Array.isArray(obj.id_madre) &&
      obj.accion !== 'crear_evento' &&
      obj.accion !== 'crear_multiples_eventos'
    ) {
      if (obj.id_madre !== null) {
        const rp = parseInt(obj.id_madre);
        if (isNaN(rp)) throw new Error('id_madre inválido: ' + obj.id_madre);
        obj.id_madre = rp;
      }
    }
    if (
      obj.severidad &&
      !['Leve', 'Moderada', 'Severa', 'Crítica', 'Critica'].includes(obj.severidad)
    ) {
      obj.severidad = 'Moderada';
    }
    return obj;
  }

  /**
   * Pipeline completo: texto → Claude → JSON limpio y validado.
   * Portado de "Limpiar JSON". Detecta lote (array) vs simple.
   */
  async parsearMensaje(texto: string, phone: string): Promise<ResultadoParseo> {
    // Atajo: comando cambiar_establecimiento sin pasar por Claude
    const textoNorm = (texto || '').toLowerCase().trim().replace(/[\s_-]+/g, '_');
    if (textoNorm === 'cambiar_establecimiento' || textoNorm === 'cambiar_campo') {
      return { _esLote: false, phone, accion: 'cambiar_establecimiento' };
    }

    const respuestaClaude = await this.llamarClaude(texto);
    if (!respuestaClaude) throw new Error('Claude sin respuesta');

    const jsonLimpio = respuestaClaude.replace(/```json|```/g, '').trim();

    let parsed = JSON.parse(jsonLimpio);

    if (Array.isArray(parsed)) {
      parsed = parsed.map((a) => this.validarAccion(a));
      return { _esLote: true, acciones: parsed, phone };
    }

    parsed = this.validarAccion(parsed);
    if (parsed.accion === 'cambiar_establecimiento') {
      return { _esLote: false, phone, accion: 'cambiar_establecimiento' };
    }
    return { _esLote: false, phone, ...parsed };
  }
}
