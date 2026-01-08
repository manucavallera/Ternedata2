import { PartialType } from '@nestjs/mapped-types';
import { CreateTerneroDto } from './create-ternero.dto';

export class UpdateTerneroDto extends PartialType(CreateTerneroDto) {
  // No necesitas redefinir los campos aquí
  // PartialType ya hace todos los campos opcionales y mantiene las validaciones
  // Esto incluye automáticamente el nuevo campo 'semen' y excluye 'id_padre'
}
