import { IsEnum } from 'class-validator';
import { PedidoEstado } from '../entities/pedido.entity';

export class UpdatePedidoEstadoDto {
  @IsEnum(PedidoEstado)
  estado: PedidoEstado;
}

