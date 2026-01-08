import { MadreEntity } from "src/modules/madres/entities/madre.entity";
import { TerneroEntity } from "src/modules/terneros/entities/ternero.entity";
import { Column, Entity,JoinTable, ManyToMany, PrimaryGeneratedColumn } from "typeorm";


@Entity('eventos')
export class EventoEntity {
    
    @PrimaryGeneratedColumn()
    id_evento: number;

    @Column({ type: 'date',nullable:false})
    fecha_evento: Date;

    @Column({ type: "varchar", nullable: false })
    observacion: string;
    
    /*     
    no es necesario agregar @JoinColumn en este caso, porque cuando utilizas @ManyToMany, 
    las columnas de unión se gestionan automáticamente a través de las tablas intermedias que 
    TypeORM crea de forma implícita. */
    
    @ManyToMany(() => TerneroEntity,(ternero) => ternero.eventos,{
        onDelete: 'SET NULL', // Permite que id_ternero quede NULL al eliminar la madre
        nullable: true // Hace que el campo pueda aceptar valores nulos
    })
    @JoinTable({
        name: 'eventos_terneros', // Nombre de la tabla intermedia
        joinColumn: { name: 'evento_id', referencedColumnName: 'id_evento' },
        inverseJoinColumn: { name: 'ternero_id', referencedColumnName: 'id_ternero' }
    })
    terneros: TerneroEntity[];

    @ManyToMany(() => MadreEntity,(madre) => madre.eventos,{
        onDelete: 'SET NULL', // Permite que id_madre quede NULL al eliminar la madre
        nullable: true // Hace que el campo pueda aceptar valores nulos
    })
    @JoinTable({
    name: 'eventos_madres', // Nombre de la tabla intermedia
    joinColumn: { name: 'evento_id', referencedColumnName: 'id_evento' },
    inverseJoinColumn: { name: 'madre_id', referencedColumnName: 'id_madre' }
    })
    madres: MadreEntity[];

}

