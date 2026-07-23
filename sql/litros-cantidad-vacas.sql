-- Vacas ordeñadas por registro de litros.
-- synchronize:false en bussines, así que la columna se agrega a mano.
-- Nullable: los registros viejos quedan en NULL y el backend cae al conteo
-- del rodeo ('En Tambo') para el promedio.
ALTER TABLE registro_litros
  ADD COLUMN IF NOT EXISTS cantidad_vacas int;
