import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, JoinColumn } from 'typeorm';
import { TerneroEntity } from '../../terneros/entities/ternero.entity';
import { TratamientoEntity } from '../../tratamientos/entities/tratamiento.entity';

@Entity('terneros_tratamientos')
export class TerneroTratamientoEntity {
  
  @PrimaryGeneratedColumn()
  id_ternero_tratamiento: number;

  @ManyToOne(() => TerneroEntity, (ternero) => ternero.ternerosTratamientos,{ 
    onDelete: 'SET NULL', // Permite que id_ternero quede NULL al eliminar la madre
    nullable: true // Hace que el campo pueda aceptar valores nulos
  })
  @JoinColumn({name:'id_ternero'})
  ternero: TerneroEntity; 

  @ManyToOne(() => TratamientoEntity, (tratamiento) => tratamiento.ternerosTratamientos,{ 
    onDelete: 'SET NULL', // Permite que id_tratamiento quede NULL al eliminar la madre
    nullable: true // Hace que el campo pueda aceptar valores nulos
  })
  @JoinColumn({name:'id_tratamiento'})
  tratamiento: TratamientoEntity; 
  
  @Column({ type: 'date',nullable:false})
  fecha_aplicacion: Date;
}
