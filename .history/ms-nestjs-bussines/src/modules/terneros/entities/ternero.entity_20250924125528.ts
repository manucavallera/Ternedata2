import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MadreEntity } from 'src/modules/madres/entities/madre.entity';
import { EventoEntity } from 'src/modules/eventos/entities/evento.entity';
import { TerneroTratamientoEntity } from 'src/modules/terneros-tratamientos/entities/terneros-tratamiento.entity';
import { DiarreaTerneroEntity } from 'src/modules/diarrea-terneros/entities/diarrea-ternero.entity';
import { DiarreaTerneroEntity } from 'src/modules/diarrea-terneros/entities/diarrea-ternero.entity';
import { TratamientoEntity } from 'src/modules/tratamientos/entities/tratamiento.entity'; // ← AGREGAR ESTA LÍNEA

@Entity('terneros')
export class TerneroEntity {
  @PrimaryGeneratedColumn()
  id_ternero: number;

  @Column({ type: 'integer', nullable: false })
  rp_ternero: number;

  @Column({ type: 'enum', enum: ['Macho', 'Hembra'] })
  sexo: string;

  @Column({ type: 'enum', enum: ['Vivo', 'Muerto'] })
  estado: string;

  @Column({ type: 'float', nullable: false })
  peso_nacer: number;

  @Column({ type: 'float', nullable: false })
  peso_15d: number;

  @Column({ type: 'float', nullable: false })
  peso_30d: number;

  @Column({ type: 'float', nullable: false })
  peso_45d: number;

  @Column({ type: 'float', nullable: false })
  peso_largado: number;

  @Column({ type: 'text', nullable: true })
  estimativo: string; // Historial de pesajes: "04/07:37.5|05/07:38.1|06/07:38.7"

  @Column({ type: 'float', nullable: true })
  peso_ideal: number; // Doble del peso al nacer

  @Column({ type: 'varchar', nullable: false })
  observaciones: string;

  @Column({ type: 'date', nullable: false })
  fecha_nacimiento: Date;

  @Column({ type: 'varchar', nullable: false })
  semen: string;

  // ==================== CAMPOS DE CALOSTRADO ====================
  @Column({
    type: 'enum',
    enum: ['sonda', 'mamadera'],
    nullable: true,
  })
  metodo_calostrado: string;

  @Column({ type: 'float', nullable: true })
  litros_calostrado: number;

  @Column({ type: 'timestamp', nullable: true })
  fecha_hora_calostrado: Date;

  @Column({ type: 'text', nullable: true })
  observaciones_calostrado: string;

  // ==================== NUEVO CAMPO: GRADO BRIX ====================
  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
    comment: 'Grado Brix del calostrado (concentración de azúcares)',
  })
  grado_brix: number;
  // ================================================================

  @ManyToOne(() => MadreEntity, (madre) => madre.terneros, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'id_madre' })
  madre: MadreEntity;

  @ManyToMany(() => EventoEntity, (evento) => evento.terneros)
  eventos: EventoEntity[];

  @OneToMany(
    () => TerneroTratamientoEntity,
    (tratamiento) => tratamiento.ternero,
  )
  ternerosTratamientos: TerneroTratamientoEntity[];

  @OneToMany(() => DiarreaTerneroEntity, (diarrea) => diarrea.ternero)
  diarreas: DiarreaTerneroEntity[];

  @OneToMany(() => TratamientoEntity, (tratamiento) => tratamiento.ternero)
  tratamientos: TratamientoEntity[];

  // Campos calculados - no se guardan en la base de datos
  dias_desde_nacimiento?: number;
  aumento_diario_promedio?: number; // Calculado desde historial de pesajes
  ultimo_peso?: number; // Último peso registrado
  ultimo_pesaje_fecha?: string; // Fecha del último pesaje
  peso_esperado_15d?: number;
  peso_esperado_30d?: number;
  peso_esperado_45d?: number;
  peso_esperado_60d?: number;
  rendimiento_15d?: string; // "Excelente", "Bueno", "Regular", "Bajo"
  rendimiento_30d?: string;
  rendimiento_45d?: string;
  porcentaje_crecimiento_15d?: number;
  porcentaje_crecimiento_30d?: number;
  porcentaje_crecimiento_45d?: number;

  // ==================== NUEVO MÉTODO: EVALUAR CALIDAD CALOSTRO ====================
  /**
   * Evalúa la calidad del calostro basada en el grado Brix
   * @returns string - Calidad del calostro
   */
  evaluarCalidadCalostro(): string {
    try {
      if (!this.grado_brix) return 'No medido';

      if (this.grado_brix >= 22) return 'Excelente'; // >= 22° Brix
      if (this.grado_brix >= 18) return 'Bueno'; // 18-21.9° Brix
      if (this.grado_brix >= 15) return 'Regular'; // 15-17.9° Brix
      return 'Bajo'; // < 15° Brix
    } catch (error) {
      console.error('Error evaluando calidad del calostro:', error);
      return 'Error';
    }
  }

  /**
   * Obtiene el color del indicador de calidad del calostro para UI
   * @returns string - Clase CSS o color
   */
  obtenerColorCalidadCalostro(): string {
    const calidad = this.evaluarCalidadCalostro();
    switch (calidad) {
      case 'Excelente':
        return 'success'; // Verde
      case 'Bueno':
        return 'primary'; // Azul
      case 'Regular':
        return 'warning'; // Amarillo
      case 'Bajo':
        return 'danger'; // Rojo
      default:
        return 'secondary'; // Gris
    }
  }
  // ================================================================

  // Método para calcular los días desde nacimiento - ROBUSTO
  calcularDiasDesdeNacimiento(): number {
    try {
      // Verificar que la fecha exista
      if (!this.fecha_nacimiento) {
        return 0;
      }

      const fechaActual = new Date();
      const fechaNacimiento = new Date(this.fecha_nacimiento);

      // Verificar que la fecha sea válida
      if (isNaN(fechaNacimiento.getTime())) {
        return 0;
      }

      const diferenciaTiempo =
        fechaActual.getTime() - fechaNacimiento.getTime();
      const dias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));

      // Verificar que el resultado sea razonable (entre 0 y 10000 días = ~27 años)
      if (dias < 0 || dias > 10000) {
        return 0;
      }

      return dias;
    } catch (error) {
      console.error('Error calculando días desde nacimiento:', error);
      return 0;
    }
  }

  // Método para agregar un nuevo pesaje
  agregarPesaje(fecha: string, peso: number): void {
    try {
      const nuevoPesaje = `${fecha}:${peso}`;

      if (!this.estimativo || this.estimativo.trim() === '') {
        this.estimativo = nuevoPesaje;
      } else {
        this.estimativo = this.estimativo + '|' + nuevoPesaje;
      }
    } catch (error) {
      console.error('Error agregando pesaje:', error);
    }
  }

  // Método para obtener historial de pesajes como array
  obtenerHistorialPesajes(): Array<{ fecha: string; peso: number }> {
    try {
      if (!this.estimativo || this.estimativo.trim() === '') {
        return [];
      }

      return this.estimativo
        .split('|')
        .map((pesaje) => {
          const [fecha, peso] = pesaje.split(':');
          return {
            fecha: fecha,
            peso: parseFloat(peso),
          };
        })
        .filter((pesaje) => !isNaN(pesaje.peso));
    } catch (error) {
      console.error('Error obteniendo historial de pesajes:', error);
      return [];
    }
  }

  // Método para obtener el último peso registrado
  obtenerUltimoPeso(): { peso: number; fecha: string } {
    try {
      const historial = this.obtenerHistorialPesajes();
      if (historial.length === 0) {
        return { peso: this.peso_nacer, fecha: 'Nacimiento' };
      }

      const ultimo = historial[historial.length - 1];
      return { peso: ultimo.peso, fecha: ultimo.fecha };
    } catch (error) {
      console.error('Error obteniendo último peso:', error);
      return { peso: this.peso_nacer, fecha: 'Nacimiento' };
    }
  }

  // Método para calcular aumento diario promedio desde historial
  calcularAumentoDiarioPromedio(): number {
    try {
      const historial = this.obtenerHistorialPesajes();
      if (historial.length === 0) return 0;

      const ultimoPeso = historial[historial.length - 1].peso;
      const dias = this.calcularDiasDesdeNacimiento();

      if (dias <= 0) return 0;

      const aumentoTotal = ultimoPeso - this.peso_nacer;
      return parseFloat((aumentoTotal / dias).toFixed(3));
    } catch (error) {
      console.error('Error calculando aumento diario promedio:', error);
      return 0;
    }
  }

  calcularPesoEsperado(dias: number): number {
    try {
      if (!this.peso_nacer || this.peso_nacer <= 0) return 0;

      // Fórmula: Peso = peso_nacer × (2)^(días/60)
      // A los 60 días debe tener el doble del peso
      const factor = Math.pow(2, dias / 60);
      return parseFloat((this.peso_nacer * factor).toFixed(2));
    } catch (error) {
      console.error('Error calculando peso esperado:', error);
      return 0;
    }
  }

  // Método para calcular porcentaje de rendimiento
  calcularPorcentajeRendimiento(
    pesoReal: number,
    pesoEsperado: number,
  ): number {
    try {
      if (!pesoEsperado || pesoEsperado <= 0) return 0;
      return parseFloat(((pesoReal / pesoEsperado) * 100).toFixed(1));
    } catch (error) {
      console.error('Error calculando porcentaje de rendimiento:', error);
      return 0;
    }
  }

  // Método para evaluar rendimiento
  evaluarRendimiento(porcentaje: number): string {
    try {
      if (porcentaje >= 110) return 'Excelente';
      if (porcentaje >= 95) return 'Bueno';
      if (porcentaje >= 80) return 'Regular';
      return 'Bajo';
    } catch (error) {
      console.error('Error evaluando rendimiento:', error);
      return 'N/A';
    }
  }

  // Método principal para calcular todos los indicadores de crecimiento
  calcularIndicadoresCrecimiento(): void {
    try {
      // Calcular días desde nacimiento
      this.dias_desde_nacimiento = this.calcularDiasDesdeNacimiento();

      // Calcular aumento diario promedio desde historial de pesajes
      this.aumento_diario_promedio = this.calcularAumentoDiarioPromedio();

      // Obtener último peso y fecha
      const ultimoPesaje = this.obtenerUltimoPeso();
      this.ultimo_peso = ultimoPesaje.peso;
      this.ultimo_pesaje_fecha = ultimoPesaje.fecha;

      // Calcular pesos esperados
      this.peso_esperado_15d = this.calcularPesoEsperado(15);
      this.peso_esperado_30d = this.calcularPesoEsperado(30);
      this.peso_esperado_45d = this.calcularPesoEsperado(45);
      this.peso_esperado_60d = this.calcularPesoEsperado(60);

      // Calcular porcentajes de rendimiento
      this.porcentaje_crecimiento_15d = this.calcularPorcentajeRendimiento(
        this.peso_15d,
        this.peso_esperado_15d,
      );
      this.porcentaje_crecimiento_30d = this.calcularPorcentajeRendimiento(
        this.peso_30d,
        this.peso_esperado_30d,
      );
      this.porcentaje_crecimiento_45d = this.calcularPorcentajeRendimiento(
        this.peso_45d,
        this.peso_esperado_45d,
      );

      // Evaluar rendimientos
      this.rendimiento_15d = this.evaluarRendimiento(
        this.porcentaje_crecimiento_15d,
      );
      this.rendimiento_30d = this.evaluarRendimiento(
        this.porcentaje_crecimiento_30d,
      );
      this.rendimiento_45d = this.evaluarRendimiento(
        this.porcentaje_crecimiento_45d,
      );
    } catch (error) {
      console.error('Error calculando indicadores de crecimiento:', error);
    }
  }
}
