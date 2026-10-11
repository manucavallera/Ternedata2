import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { FormaEntrega, FormaPago } from '../entities/pedido.entity';

export class CreatePedidoItemDto {
  @IsInt()
  id_producto: number;

  @IsNumber()
  @Min(0.001)
  cantidad: number;
}

export class CreatePedidoDto {
  @IsInt()
  id_cliente: number;

  @ValidateNested({ each: true })
  @Type(() => CreatePedidoItemDto)
  items: CreatePedidoItemDto[];

  @IsOptional()
  @IsEnum(FormaEntrega)
  forma_entrega?: FormaEntrega;

  @IsOptional()
  @IsEnum(FormaPago)
  forma_pago?: FormaPago;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  direccion_entrega?: string;

  @IsOptional()
  @IsString()
  zona_entrega?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
