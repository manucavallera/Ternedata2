import { UserEntity } from "src/modules/users/entity/users.entity";

// Interfaz para los datos adicionales del usuario
export interface token {
    token:any
  }
  
export type PublicSessionUser = Pick<
  UserEntity,
  | 'id'
  | 'name'
  | 'email'
  | 'rol'
  | 'estado'
  | 'telefono'
  | 'id_establecimiento'
  | 'email_verificado'
  | 'userEstablecimientos'
>;

// Contrato público de login/refresh: nunca incluye secretos de la entidad.
export interface UserInterface {
  user: PublicSessionUser;
  token: string;
}
