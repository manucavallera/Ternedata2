// src/modules/resumen-salud/resumen-salud.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { TratamientoEntity } from '../tratamientos/entities/tratamiento.entity';
import { DiarreaTerneroEntity } from '../diarrea-terneros/entities/diarrea-ternero.entity';

export interface ResumenSaludDto {
  // Datos generales
  totalTerneros: number;
  ternerosMuertos: number;
  ternerosVivos: number;

  // Métricas principales
  porcentajeMortalidad: number;
  porcentajeMorbilidad: number;

  // Tratamientos
  ternerosConTratamientos: number;
  tratamientosTotal: number;
  desgloseTratamientos: { tipo_enfermedad: string; cantidad: number }[];

  // Diarreas
  ternerosConDiarreas: number;
  episodiosDiarrea: number;
  desgloseDiarreas: {
    moderada: number;
    critica: number;
    severa: number;
  };

  // Análisis cruzado
  ternerosConAmbosProblemas: number;
  ternerosUnicosSinProblemas: number;
  porcentajeTernerosEnfermos: number;
}

@Injectable()
export class ResumenSaludService {
  constructor(
    @InjectRepository(TerneroEntity)
    private readonly terneroRepository: Repository<TerneroEntity>,
    @InjectRepository(TratamientoEntity)
    private readonly tratamientoRepository: Repository<TratamientoEntity>,
    @InjectRepository(DiarreaTerneroEntity)
    private readonly diarreaRepository: Repository<DiarreaTerneroEntity>,
  ) {}

  async obtenerResumenSalud(): Promise<ResumenSaludDto> {
    console.log('🏥 Iniciando cálculo de resumen de salud...');

    try {
      // 1. Datos básicos de terneros
      const totalTerneros = await this.terneroRepository.count();
      const ternerosMuertos = await this.terneroRepository.count({
        where: { estado: 'Muerto' },
      });
      const ternerosVivos = totalTerneros - ternerosMuertos;

      console.log(
        `📊 Terneros: Total=${totalTerneros}, Vivos=${ternerosVivos}, Muertos=${ternerosMuertos}`,
      );

      // 2. Tratamientos: terneros únicos con tratamientos
      const ternerosConTratamientosQuery = await this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .select('DISTINCT tratamiento.ternero.id_ternero', 'id_ternero')
        .where('tratamiento.ternero IS NOT NULL')
        .getRawMany();

      const ternerosConTratamientos = ternerosConTratamientosQuery.length;
      const tratamientosTotal = await this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .where('tratamiento.ternero IS NOT NULL')
        .getCount();

      console.log(
        `💊 Tratamientos: ${ternerosConTratamientos} terneros únicos, ${tratamientosTotal} tratamientos total`,
      );

      // 3. Desglose de tratamientos por tipo
      const desgloseTratamientos = await this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .select([
          'tratamiento.tipo_enfermedad as tipo_enfermedad',
          'COUNT(*) as cantidad',
        ])
        .where('tratamiento.ternero IS NOT NULL')
        .andWhere('tratamiento.tipo_enfermedad IS NOT NULL')
        .groupBy('tratamiento.tipo_enfermedad')
        .orderBy('cantidad', 'DESC')
        .getRawMany();

      // 4. Diarreas: terneros únicos con diarreas
      const ternerosConDiarreasQuery = await this.diarreaRepository
        .createQueryBuilder('diarrea')
        .select('DISTINCT diarrea.ternero.id_ternero', 'id_ternero')
        .getRawMany();

      const ternerosConDiarreas = ternerosConDiarreasQuery.length;
      const episodiosDiarrea = await this.diarreaRepository.count();

      console.log(
        `🤧 Diarreas: ${ternerosConDiarreas} terneros únicos, ${episodiosDiarrea} episodios total`,
      );

      // 5. Desglose de diarreas por severidad
      const diarreasPorSeveridad = await this.diarreaRepository
        .createQueryBuilder('diarrea')
        .select(['diarrea.severidad as severidad', 'COUNT(*) as cantidad'])
        .groupBy('diarrea.severidad')
        .getRawMany();

      // Procesar severidades con valores por defecto
      const desgloseDiarreas = {
        moderada: 0,
        critica: 0,
        severa: 0,
      };

      diarreasPorSeveridad.forEach((item) => {
        const severidad = item.severidad?.toLowerCase();
        const cantidad = parseInt(item.cantidad);

        if (severidad === 'moderada') desgloseDiarreas.moderada = cantidad;
        else if (severidad === 'crítica' || severidad === 'critica')
          desgloseDiarreas.critica = cantidad;
        else if (severidad === 'severa') desgloseDiarreas.severa = cantidad;
      });

      // 6. Análisis cruzado: terneros con ambos problemas
      const idsConTratamientos = ternerosConTratamientosQuery.map(
        (t) => t.id_ternero,
      );
      const idsConDiarreas = ternerosConDiarreasQuery.map((d) => d.id_ternero);

      // Intersección: terneros que tienen TANTO tratamientos como diarreas
      const ternerosConAmbosProblemas = idsConTratamientos.filter((id) =>
        idsConDiarreas.includes(id),
      ).length;

      // Unión: terneros únicos con al menos un problema
      const ternerosUnicosEnfermos = new Set([
        ...idsConTratamientos,
        ...idsConDiarreas,
      ]).size;

      // Terneros completamente sanos
      const ternerosUnicosSinProblemas = totalTerneros - ternerosUnicosEnfermos;

      // 7. Cálculo de métricas
      const porcentajeMortalidad =
        totalTerneros > 0
          ? Number(((ternerosMuertos / totalTerneros) * 100).toFixed(2))
          : 0;

      const porcentajeMorbilidad =
        totalTerneros > 0
          ? Number(((ternerosUnicosEnfermos / totalTerneros) * 100).toFixed(2))
          : 0;

      const porcentajeTernerosEnfermos = porcentajeMorbilidad; // Mismo valor

      console.log('📈 Métricas calculadas:', {
        mortalidad: `${porcentajeMortalidad}%`,
        morbilidad: `${porcentajeMorbilidad}%`,
        ambos_problemas: ternerosConAmbosProblemas,
        sin_problemas: ternerosUnicosSinProblemas,
      });

      // 8. Preparar respuesta
      const resumen: ResumenSaludDto = {
        // Datos generales
        totalTerneros,
        ternerosMuertos,
        ternerosVivos,

        // Métricas principales
        porcentajeMortalidad,
        porcentajeMorbilidad,

        // Tratamientos
        ternerosConTratamientos,
        tratamientosTotal,
        desgloseTratamientos: desgloseTratamientos.map((item) => ({
          tipo_enfermedad: item.tipo_enfermedad,
          cantidad: parseInt(item.cantidad),
        })),

        // Diarreas
        ternerosConDiarreas,
        episodiosDiarrea,
        desgloseDiarreas,

        // Análisis cruzado
        ternerosConAmbosProblemas,
        ternerosUnicosSinProblemas,
        porcentajeTernerosEnfermos,
      };

      console.log('✅ Resumen de salud calculado exitosamente');
      return resumen;
    } catch (error) {
      console.error('❌ Error calculando resumen de salud:', error);
      throw new Error(`Error al calcular resumen de salud: ${error.message}`);
    }
  }
}
