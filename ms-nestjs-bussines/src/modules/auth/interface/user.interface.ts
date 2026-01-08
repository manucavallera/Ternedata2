import { UserEntity } from "src/modules/users/entity/users.entity";

// Interfaz para los datos adicionales del usuario
export interface token {
    token:any
  }
  
  // Interfaz combinada que incluye los datos básicos del usuario y los datos adicionales
  export interface UserInterface {
    user: UserEntity; // Información básica del usuario
    token; // Datos adicionales del usuario
  }