import { PartialType } from '@nestjs/mapped-types';
import { CreateMadreDto } from './create-madre.dto';

export class UpdateMadreDto extends PartialType(CreateMadreDto) {
  // No necesitas redefinir los campos aquí
  // PartialType ya hace todos los campos opcionales y mantiene las validaciones
  // Esto automáticamente excluye 'id_padre' porque ya lo eliminamos del CreateMadreDto
}
