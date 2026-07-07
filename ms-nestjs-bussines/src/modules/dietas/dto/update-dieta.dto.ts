import { PartialType } from '@nestjs/swagger';
import { CreateDietaDto } from './create-dieta.dto';

export class UpdateDietaDto extends PartialType(CreateDietaDto) {}
