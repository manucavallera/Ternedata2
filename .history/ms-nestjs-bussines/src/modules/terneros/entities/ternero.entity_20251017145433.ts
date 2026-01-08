// ms-nestjs-business/src/modules/terneros/entities/ternero.entity.ts
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
//import { TerneroTratamientoEntity } from 'src/modules/terneros-tratamientos/entities/terneros-tratamiento.entity';
import { DiarreaTerneroEntity } from 'src/modules/diarrea-terneros/entities/diarrea-ternero.entity';
import { TratamientoEntity } from 'src/modules/tratamientos/entities/tratamiento.entity';
import { Rodeos } from 'src/modules/rodeos/entities/rodeos.entity'; // ⬅️ AGREGAR ESTO

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
  estimativo: string;

  @Column({ type: 'float', nullable: true })
  peso_ideal: number;

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

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
    comment: 'Grado Brix del calostrado (concentración de azúcares)',
  })
  grado_brix: number;

  // 🆕 NUEVO CAMPO: Relación con establecimiento
  @Column({ type: 'int', nullable: true })
  id_establecimiento: number;

  // 🆕 NUEVO CAMPO: Relación con establecimiento
  @Column({ type: 'int', nullable: true })
  id_establecimiento: number;

  // 🆕 NUEVO CAMPO: Relación con rodeo  ⬅️ AGREGAR ESTO
  @Column({ type: 'int', nullable: true })
  id_rodeo: number;

  // ==================== RELACIONES ====================
  @ManyToOne(() => MadreEntity, (madre) => madre.terneros, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'id_madre' })
  madre: MadreEntity;

  @ManyToMany(() => EventoEntity, (evento) => evento.terneros)
  eventos: EventoEntity[];

  //@OneToMany(
  //() => TerneroTratamientoEntity,
  //(tratamiento) => tratamiento.ternero,
  //)
  //ternerosTratamientos: TerneroTratamientoEntity[];

  @OneToMany(() => DiarreaTerneroEntity, (diarrea) => diarrea.ternero)
  diarreas: DiarreaTerneroEntity[];

  @OneToMany(() => TratamientoEntity, (tratamiento) => tratamiento.ternero)
  tratamientos: TratamientoEntity[];

  // ==================== CAMPOS CALCULADOS ====================
  dias_desde_nacimiento?: number;
  aumento_diario_promedio?: number;
  ultimo_peso?: number;
  ultimo_pesaje_fecha?: string;
  peso_esperado_15d?: number;
  peso_esperado_30d?: number;
  peso_esperado_45d?: number;
  peso_esperado_60d?: number;
  rendimiento_15d?: string;
  rendimiento_30d?: string;
  rendimiento_45d?: string;
  porcentaje_crecimiento_15d?: number;
  porcentaje_crecimiento_30d?: number;
  porcentaje_crecimiento_45d?: number;

  // ==================== MÉTODOS ====================
  evaluarCalidadCalostro(): string {
    try {
      if (!this.grado_brix) return 'No medido';
      if (this.grado_brix >= 22) return 'Excelente';
      if (this.grado_brix >= 18) return 'Bueno';
      if (this.grado_brix >= 15) return 'Regular';
      return 'Bajo';
    } catch (error) {
      console.error('Error evaluando calidad del calostro:', error);
      return 'Error';
    }
  }

  obtenerColorCalidadCalostro(): string {
    const calidad = this.evaluarCalidadCalostro();
    switch (calidad) {
      case 'Excelente':
        return 'success';
      case 'Bueno':
        return 'primary';
      case 'Regular':
        return 'warning';
      case 'Bajo':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  calcularDiasDesdeNacimiento(): number {
    try {
      if (!this.fecha_nacimiento) return 0;
      const fechaActual = new Date();
      const fechaNacimiento = new Date(this.fecha_nacimiento);
      if (isNaN(fechaNacimiento.getTime())) return 0;
      const diferenciaTiempo =
        fechaActual.getTime() - fechaNacimiento.getTime();
      const dias = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));
      if (dias < 0 || dias > 10000) return 0;
      return dias;
    } catch (error) {
      console.error('Error calculando días desde nacimiento:', error);
      return 0;
    }
  }

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

  obtenerHistorialPesajes(): Array<{ fecha: string; peso: number }> {
    try {
      if (!this.estimativo || this.estimativo.trim() === '') return [];
      return this.estimativo
        .split('|')
        .map((pesaje) => {
          const [fecha, peso] = pesaje.split(':');
          return { fecha: fecha, peso: parseFloat(peso) };
        })
        .filter((pesaje) => !isNaN(pesaje.peso));
    } catch (error) {
      console.error('Error obteniendo historial de pesajes:', error);
      return [];
    }
  }

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
      const factor = Math.pow(2, dias / 60);
      return parseFloat((this.peso_nacer * factor).toFixed(2));
    } catch (error) {
      console.error('Error calculando peso esperado:', error);
      return 0;
    }
  }

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

  calcularIndicadoresCrecimiento(): void {
    try {
      this.dias_desde_nacimiento = this.calcularDiasDesdeNacimiento();
      this.aumento_diario_promedio = this.calcularAumentoDiarioPromedio();
      const ultimoPesaje = this.obtenerUltimoPeso();
      this.ultimo_peso = ultimoPesaje.peso;
      this.ultimo_pesaje_fecha = ultimoPesaje.fecha;
      this.peso_esperado_15d = this.calcularPesoEsperado(15);
      this.peso_esperado_30d = this.calcularPesoEsperado(30);
      this.peso_esperado_45d = this.calcularPesoEsperado(45);
      this.peso_esperado_60d = this.calcularPesoEsperado(60);
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
