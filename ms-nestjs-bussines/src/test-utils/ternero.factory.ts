import { TerneroEntity } from 'src/modules/terneros/entities/ternero.entity';
import { MadreEntity } from 'src/modules/madres/entities/madre.entity';

// Factories de datos de prueba con valores realistas de un tambo de cría.
// Son deterministas a propósito: cada test fija lo que le importa y el resto
// toma estos valores por defecto, así el mismo test da el mismo resultado siempre.

let secuenciaRp = 1000;
export const siguienteRp = () => ++secuenciaRp;

// Fecha ISO (YYYY-MM-DD) de hace `dias` días respecto de `hoy`.
export const haceDias = (dias: number, hoy: Date = new Date()) => {
  const fecha = new Date(hoy);
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha.toISOString().slice(0, 10);
};

// Formato en que el servicio guarda cada pesaje dentro de `estimativo`: "dd/mm:peso".
export const pesajeEstimativo = (fecha: Date, peso: number) => {
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}:${peso}`;
};

export const crearTernero = (
  datos: Partial<TerneroEntity> = {},
): TerneroEntity => {
  const ternero = new TerneroEntity();
  Object.assign(ternero, {
    id_ternero: datos.id_ternero ?? secuenciaRp,
    rp_ternero: siguienteRp(),
    sexo: 'Hembra',
    estado: 'Vivo',
    peso_nacer: 38, // un Holando nace entre 35 y 45 kg
    peso_15d: 0,
    peso_30d: 0,
    peso_45d: 0,
    peso_largado: 0,
    peso_ideal: 76,
    estimativo: null,
    fecha_nacimiento: new Date(haceDias(10)),
    id_establecimiento: 1,
    ...datos,
  });
  return ternero;
};

export const crearMadre = (datos: Partial<MadreEntity> = {}): MadreEntity => {
  const madre = new MadreEntity();
  Object.assign(madre, {
    id_madre: 1,
    rp_madre: siguienteRp(),
    nombre: 'Vaca',
    estado: 'Seca',
    fecha_nacimiento: new Date('2022-03-15'),
    id_establecimiento: 1,
    id_rodeo: null,
    ...datos,
  });
  return madre;
};
