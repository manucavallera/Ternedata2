import { PartialType } from '@nestjs/swagger';
import { CreateLitrosDto } from './create-litros.dto';

export class UpdateLitrosDto extends PartialType(CreateLitrosDto) {}
