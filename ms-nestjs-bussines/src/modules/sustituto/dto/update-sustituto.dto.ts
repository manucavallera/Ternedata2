import { PartialType } from '@nestjs/swagger';
import { CreateSustitutoDto } from './create-sustituto.dto';

export class UpdateSustitutoDto extends PartialType(CreateSustitutoDto) {}
