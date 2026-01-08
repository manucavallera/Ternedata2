import { PartialType } from '@nestjs/mapped-types';
import { CreateTratamientoDto } from './create-tratamiento.dto';

export class UpdateTratamientoDto extends PartialType(CreateTratamientoDto) {
  // No necesitas redefinir los campos aquí
  // PartialType ya hace todos los campos opcionales y mantiene las validaciones
}
