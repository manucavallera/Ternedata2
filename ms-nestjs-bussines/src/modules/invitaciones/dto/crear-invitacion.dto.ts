import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { RolEstablecimiento } from '../roles.enum';

export class CrearInvitacionDto {
  // Opcional: si no viene, se genera un link genérico sin email
  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  // Solo se aceptan roles del enum -> no se puede inyectar 'admin' u otro
  @IsEnum(RolEstablecimiento, {
    message: 'Rol inválido. Valores permitidos: dueno, veterinario, operario',
  })
  rol: RolEstablecimiento;
}
