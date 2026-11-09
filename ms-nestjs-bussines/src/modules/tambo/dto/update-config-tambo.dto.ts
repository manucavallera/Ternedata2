import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateConfigTamboDto {
  @IsOptional() @IsInt() @Min(20) @Max(150) dias_espera?: number;
  @IsOptional() @IsInt() @Min(20) @Max(120) dias_tacto?: number;
  @IsOptional() @IsInt() @Min(5) @Max(60) dias_reparche?: number;
  @IsOptional() @IsInt() @Min(20) @Max(120) dias_secado?: number;
  @IsOptional() @IsInt() @Min(7) @Max(60) dias_preparto?: number;
  @IsOptional() @IsInt() @Min(1) @Max(30) dias_parto_proximo?: number;
  @IsOptional() @IsInt() @Min(270) @Max(295) dias_gestacion?: number;
  @IsOptional() @IsInt() @Min(120) @Max(250) dias_reconfirmacion?: number;
}
