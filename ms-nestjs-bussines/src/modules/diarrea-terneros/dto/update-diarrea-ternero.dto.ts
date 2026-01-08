import { PartialType } from '@nestjs/mapped-types';
import { CreateDiarreaTerneroDto } from './create-diarrea-ternero.dto';

export class UpdateDiarreaTerneroDto extends PartialType(
  CreateDiarreaTerneroDto,
) {
  // PartialType ya hace todos los campos opcionales automáticamente
  // No necesitas redefinir las propiedades aquí
}
