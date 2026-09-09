# Seguimiento de pesos y calostrado

## Objetivo

Web y mobile deben mostrar y editar la misma información de seguimiento por ternero, sin mezclarla con el calendario histórico general del establecimiento.

## Alcance funcional

- Mantener `Calendario histórico`: consulta el estado completo del establecimiento para una fecha.
- Agregar `Seguimiento del ternero` dentro del detalle/listado de cada ternero.
- Registrar múltiples pesajes con fecha completa, peso y observación opcional.
- Registrar múltiples tomas de calostrado con fecha/hora, método, litros, Brix y observación opcional.
- Listar, editar y eliminar ambos tipos de registro.
- Calcular edad al pesaje, ganancia desde el registro anterior y promedio de kg/día en Business.
- Mostrar hitos `Nacer`, `15d`, `30d`, `45d` y `Largado` sin inventar valores.
- Mantener RP visible en web y mobile; IDs internos solo sirven para requests.
- Aplicar aislamiento por `id_establecimiento` en todos los endpoints.

## Reglas de datos

- `Nacer` usa `peso_nacer` y la fecha de nacimiento del ternero.
- Cada pesaje conserva su fecha real; no se guarda como texto `DD/MM`.
- `15d`, `30d` y `45d` muestran el pesaje real más cercano dentro de una ventana de ±3 días y su fecha efectiva; si no existe, muestran `—`.
- `Largado` se carga manualmente como peso real; nunca se calcula desde `peso_nacer`.
- Una segunda carga de peso para el mismo ternero y fecha actualiza el registro existente.
- Cada toma de calostrado es independiente; no pisa tomas anteriores.
- `metodo_calostrado` acepta únicamente `mamadera` o `sonda`.
- Litros deben ser positivos; Brix debe estar entre 0 y 50; fechas futuras se rechazan.

## Compatibilidad

- Conservar columnas legacy de `terneros` durante la migración.
- Migrar `estimativo` cuando pueda parsearse; conservar registros no parseables sin eliminarlos.
- Migrar columnas legacy `peso_15d`, `peso_30d`, `peso_45d` como pesajes fechados desde nacimiento.
- Migrar el calostrado existente como una única toma histórica.
- No corregir automáticamente valores dudosos como `peso_largado = 525`; deben quedar identificados para revisión manual.

