# Migraciones

Migraciones versionadas y aplicables en orden (`10`, 3.4; `06`, T-07). Nunca se
modifica el esquema a mano en un panel — todo cambio de esquema es un archivo
nuevo acá, generado con `npm run migrate:create -- nombre-de-la-migracion`.

- `npm run migrate:up` aplica todo lo pendiente, en orden.
- `npm run migrate:down` revierte la última.

El contenido de las tablas del dominio (`03`) se agrega en T2. Este ticket
(T1) solo deja lista la maquinaria.
