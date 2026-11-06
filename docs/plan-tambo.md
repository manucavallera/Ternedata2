# Plan: módulo de tambo

Basado en las capturas de una app de tambo (Panel, Rodeo, Producción, Mixers) del 2026-10-28.

## Qué ya tenemos

- `madres`: caravana (`rp_madre`), rodeo, estado `Seca` / `En Tambo`. Sin fecha de parto ni estado reproductivo.
- `eventos`: texto libre (`observacion`) asociado a madres o terneros. No tiene tipo.
- `registro_litros`: un registro por día por campo con `litros_vendido`, `litros_terneros` y `cantidad_vacas`.
- `rodeo_dieta`: dieta por rodeo en modo `nota`, `formula` (kg por animal) o `mezcla` (ingredientes con kg). Ya calcula el total del rodeo.
- Web: sección de litros, rodeos y calendario.

Conclusión: el tambo encaja dentro de ganadería. No hace falta un tipo de organización nuevo. Hay que ampliar madres, eventos, litros y dietas.

## Fases (una PR cada una)

### Fase 1. Rodeo lechero (base de todo lo demás)

Estado: hecha en la rama `feat/tambo-rodeo-lechero`. Diferencias con lo planeado: la categoría sigue en la columna `estado` de madres (se agregan `Preparto` y `Vaquillona`, sin migrar datos), los eventos reproductivos van en una tabla propia (`eventos_reproductivos`) y se suma el evento `parche` para el reemparche. La pantalla es `/tambo`.

Backend:
- `madres`: agregar `categoria` (`tambo`, `seca`, `preparto`, `vaquillona`), `estado_reproductivo` (`vacia`, `inseminada`, `preñada`, `parida`, `a_entorar`, `rechazo`), `fecha_ultimo_parto` y `fecha_ultimo_servicio`.
- Migración: `En Tambo` pasa a `tambo` y `Seca` pasa a `seca`. Mantener `estado` un tiempo por compatibilidad con la app y el bot.
- Eventos tipados: agregar `tipo` (`parto`, `inseminacion`, `tacto`, `secado`, `preparto`, `rechazo`, `otro`) y `datos` jsonb (toro o pajuela, resultado del tacto). Cada evento actualiza la madre: un parto pone `parida` + `tambo` + fecha; un tacto positivo pone `preñada`; un secado pone `seca`.
- Días en leche (DEL) = hoy menos `fecha_ultimo_parto`, solo para categoría tambo.
- `GET /madres/pendientes`: a tactar, sin inseminar, a secar, a pasar a preparto y parto próximo. Los días de cada regla van en `establecimiento.configuracion`, con valores por defecto.
- `GET /madres/resumen`: cabezas por categoría y por estado reproductivo, con porcentajes.

Web:
- Listado con buscador por caravana, filtros por categoría, etiqueta de estado, DEL y botones Ficha y Editar.
- Tarjetas de pendientes: al tocar una, filtra el listado.
- Resumen del rodeo con porcentajes.
- Botón "Agregar animal o evento" con formulario por tipo de evento.

Deploy: migraciones, después business y web.

### Fase 2. Control lechero individual

- Tabla nueva `controles_lecheros`: `id_madre`, `fecha`, `litros_manana`, `litros_tarde`.
- Carga tipo planilla: lista de vacas en tambo con dos campos cada una.
- El listado del rodeo muestra los litros del último control ("control del 26/09: mañana + tarde").
- Ficha de la vaca: historial de controles y eventos.

### Fase 3. Producción diaria

- `registro_litros`: agregar `vacas_en_tratamiento` y `vacas_en_ordene`. `litros_vendido` pasa a mostrarse como "a fábrica".
- Validación al cargar: avisar si los litros por vaca se alejan mucho del promedio o si las vacas en ordeñe superan las cabezas del rodeo. La app de las capturas tiene días con 876 vacas y 2,2 L/vaca por errores de carga.
- Gráficos: litros por vaca, litros totales por día, vacas en ordeñe y litros por mes. También acumulado por año, tabla por mes e historial. Filtro de período (3, 6, 12 meses o todo).

### Fase 4. Panel del tambo

- Cabezas por categoría.
- Promedio de DEL ("81 vacas de tambo con fecha de parto").
- Litros del último mes y litros a fábrica.
- Gráfico de litros por vaca.
- Se muestra en el dashboard cuando el campo tiene vacas en tambo.

### Fase 5. Mixers

- Sobre `rodeo_dieta` en modo `mezcla`: agregar `cargas` (en cuántas cargas se divide la ración).
- Las cabezas se toman del rodeo automáticamente. Por ahora no se pueden editar a mano.
- Tabla por ingrediente: kg por cabeza, kg por carga y parcial acumulado. El parcial es lo que mira el mixero en la balanza mientras carga.
- Ícono por ingrediente y orden de carga editable.
- Más adelante: vincular el ingrediente a un producto de forrajería para descontar stock.

### Fase 6. App mobile y bot

- App: las mismas pantallas, priorizando la carga de producción y los eventos en el corral.
- Bot: "parió la 325", "inseminé la 333 con toro X", "tacto 331 preñada", "hoy 2723 litros, 80 en ordeñe".

## Lo que confirmamos buscando en la web (2026-11-06)

- Reemparche = reparchado: renovar el parche detector de celo cada menos de 21 días (ideal 15). El parche se saca cuando la vaca se confirma preñada. Pendiente: vacas en servicio, no preñadas, con último parche hace 15 días o más. Hay que registrar el evento `parche`.
- Espera después del parto antes de inseminar: 40 a 70 días según el rodeo (45 en producción media, 60 en alta).
- Diagnóstico de preñez: ecografía desde los 28 a 35 días; tacto desde los 45. Conviene reconfirmar a los 55 a 60 días por pérdidas tempranas.
- Secado: 60 días antes del parto es lo habitual (mínimo 6 semanas en multíparas). Preparto: entre 21 y 30 días antes (INTA Rafaela usa 30).
- Mixer: el orden de carga importa. Primero heno y forrajes voluminosos, después silo y granos; minerales y núcleo en el medio o premezclados con grano. Llenar el mixer al 70 a 75% de su capacidad.
- Control lechero oficial (ACHA o entidades regionales): no encontramos la frecuencia confirmada para Argentina.

## Preguntas para el tambero (con la suposición que tomamos si no hay respuesta)

1. Reemparche: confirmado que es renovar el parche de celo. Falta saber cada cuántos días lo renuevan (suponemos 15) y si le ponen parche a todas las vacas en servicio.
2. Espera después del parto: ¿a partir de qué día una vaca recién parida ya se puede inseminar? Las fuentes dan entre 40 y 70 días. Suponemos 50: pasado ese día y sin servicio, la vaca aparece en "Sin inseminar".
3. Tacto: ¿a cuántos días de la inseminación se confirma la preñez, y se hace con ecografía o tacto? Las fuentes dan 28 a 35 días con ecografía y 45 con tacto. Suponemos 35, y que el día de tacto agrupa a todas las vacas pendientes.
4. Secado y preparto: ¿cuántos días antes del parto se secan y cuántos días antes pasan a preparto? Suponemos 60 y 21. La fecha de parto se calcula como servicio + 283 días.
5. Estados del resumen: ¿qué significa "OK"? ¿Y "A entorar" (vaquillona lista para el primer servicio)? ¿Cuándo una vaca pasa a "Rechazo" (para vender) y cuándo a "Vacía" (tacto negativo)?
6. Lote (M, B): ¿es un grupo de manejo, por ejemplo alta y baja producción? Suponemos que es nuestro rodeo.
7. Control lechero por vaca: ¿se mide en cada ordeñe o una vez por mes? ¿Con medidor o con control oficial? Suponemos una vez por mes, mañana y tarde.
8. Inseminación: ¿anotan qué toro o pajuela usaron? Suponemos texto libre, sin lista de toros.
9. Mixer: ¿las cabezas del lote son siempre las del rodeo, o a veces se carga a mano? ¿Importa el orden de carga de los ingredientes?
