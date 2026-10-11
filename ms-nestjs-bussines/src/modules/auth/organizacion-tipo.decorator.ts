import { SetMetadata } from '@nestjs/common';
import { OrganizacionTipo } from '../establecimientos/organizacion-tipo.enum';

export const ORGANIZACION_TIPO_KEY = 'organizacionTipo';

export const OrganizacionTipoRequerido = (tipo: OrganizacionTipo) =>
  SetMetadata(ORGANIZACION_TIPO_KEY, tipo);
