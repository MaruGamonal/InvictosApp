# Preparar la máquina para correr los scripts (Windows)

Hace falta para dos cosas y sólo para esas dos:

- **Sembrar el ambiente de pruebas** (paso B7). No es SQL: el seed crea
  las organizaciones, inscribe los equipos, genera los fixtures y carga
  resultados pasando por los servicios reales del producto, y además
  crea las cuentas en Supabase Auth. No hay forma de hacerlo desde el
  panel.
- **Limpiar los datos demo de producción** (paso A4). También borra las
  cuentas de Supabase Auth, que con SQL no se puede.

Todo lo demás —las comprobaciones, los secretos del Vault, las
variables de Vercel— se hace desde el navegador.

La primera vez son unos 20 minutos. Después, cada corrida es un
comando.

---

## 1. Instalar Node

Node es lo que ejecuta los scripts. Trae `npm` incluido.

1. Entrá a **https://nodejs.org**
2. Bajá la versión que diga **LTS** (la recomendada). El proyecto pide
   Node 20 o más; la LTS actual sirve.
3. Ejecutá el instalador y dale a Siguiente en todo. **No hace falta**
   tildar "Tools for Native Modules".

**Comprobación.** Abrí **PowerShell** (tecla Windows, escribí
`powershell`, Enter) y tipeá:

```powershell
node -v
npm -v
```

Tienen que responder dos números de versión, por ejemplo `v22.11.0` y
`10.9.0`. Si dice que no reconoce el comando, cerrá PowerShell, abrilo
de nuevo y probá otra vez: el instalador cambia el `PATH` y las
ventanas ya abiertas no se enteran.

## 2. Instalar Git

Git es lo que baja el código.

1. Entrá a **https://git-scm.com/download/win** — la descarga arranca sola.
2. Ejecutá el instalador. **Siguiente en todo**: los valores por defecto
   están bien.

**Comprobación**, en una ventana **nueva** de PowerShell:

```powershell
git --version
```

## 3. Si PowerShell se niega a correr npm

Es el tropiezo más común de Windows y no es un problema del proyecto.
Si al usar `npm` aparece algo como:

```
npm : No se puede cargar el archivo ... npm.ps1 porque la ejecución de
scripts está deshabilitada en este sistema.
```

Se arregla una sola vez, con esto:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Te va a pedir confirmación: respondé `S` (o `Y`). Sólo afecta a tu
usuario y permite correr scripts firmados o locales, que es lo que
necesita npm.

## 4. Bajar el proyecto

Elegí dónde quede. Por ejemplo, en tu carpeta de usuario:

```powershell
cd ~
git clone https://github.com/MaruGamonal/InvictosApp.git
cd InvictosApp
```

Si Git te pide credenciales de GitHub, usá la ventana que abre para
iniciar sesión con tu cuenta.

**Comprobación:** `dir` tiene que mostrar carpetas como `src`, `db`,
`scripts` y un archivo `package.json`.

## 5. Instalar las dependencias

Desde adentro de la carpeta `InvictosApp`:

```powershell
npm install
```

Tarda unos minutos y baja bastante. Es normal que imprima avisos de
`npm warn` y un resumen de vulnerabilidades al final: **no son errores**
y no hay que correr `npm audit fix`.

**Comprobación:** apareció una carpeta `node_modules` y el comando
terminó sin la palabra `ERR!`.

## 6. Crear el archivo `.env`

Acá van las credenciales. **Este archivo nunca se sube al repositorio**
—está en `.gitignore`— así que lo que pongas se queda en tu máquina.

> **El tropiezo clásico de Windows:** si lo creás con el Bloc de notas,
> te lo guarda como `.env.txt` y nada lo encuentra. Por eso conviene
> crearlo desde PowerShell, que no agrega extensiones.

Para el **ambiente de pruebas** (paso B7), con los valores del proyecto
de Supabase de pruebas:

```powershell
@"
NEXT_PUBLIC_AMBIENTE=pruebas
DATABASE_URL=la-cadena-del-session-pooler-puerto-5432
NEXT_PUBLIC_SUPABASE_URL=la-url-del-proyecto-de-pruebas
NEXT_PUBLIC_SUPABASE_ANON_KEY=la-anon-key-de-pruebas
SUPABASE_SERVICE_ROLE_KEY=la-service-role-de-pruebas
"@ | Set-Content -Path .env -Encoding utf8
```

Pegá eso en PowerShell **con tus valores reemplazados**, de una sola
vez, y Enter.

**Comprobación:**

```powershell
Get-Content .env
```

Tiene que mostrar las cinco líneas. Si `dir` muestra `.env.txt` en vez
de `.env`, borralo y volvé a hacerlo con el comando de arriba.

## 7. Correr lo que haga falta

Siempre desde la carpeta `InvictosApp`.

**Sembrar el ambiente de pruebas** (paso B7):

```powershell
npm run migrate:up
npm run demo:sembrar
npm run demo:validar
```

**Las dos primeras líneas que imprime `demo:sembrar` son las que hay
que leer:**

```
  ambiente: pruebas
  base:     db.xxxx.supabase.co:5432/postgres
```

Si dice `produccion`, el script corta solo y no escribe nada. Si el host
no es el que esperabas, cortá vos con `Ctrl+C`.

Al final imprime **las once cuentas demo** con su mail y la contraseña
compartida. Copialas de ahí.

**Limpiar los datos demo de producción** (paso A4), cuando lo decidas.
Cambiás el `.env` para que apunte a producción y **agregás**
`NEXT_PUBLIC_AMBIENTE=pruebas` sólo para esa corrida:

```powershell
npm run demo:auditar              # ver qué hay
npm run demo:limpiar -- --confirmar
npm run demo:auditar              # confirmar que quedó en cero
```

Después **sacá** esa línea del `.env`.

> Que haya que ponerla a mano para borrar en producción es a propósito:
> tiene que ser un acto deliberado, no algo que pase por tener el
> archivo equivocado abierto.

---

## Si algo sale mal

| Qué ves | Qué es |
|---|---|
| `node` o `npm` no se reconoce | Cerrá PowerShell y abrilo de nuevo. El `PATH` cambia con el instalador |
| `npm.ps1 ... ejecución de scripts está deshabilitada` | El paso 3 |
| `Esta base no tiene el esquema de INVICTA` | `DATABASE_URL` apunta a otra base, o le faltan las migraciones (`npm run migrate:up`) |
| `No pude conectarme a ...` | `DATABASE_URL` mal copiada. Ojo con `[YOUR-PASSWORD]`, hay que reemplazarlo |
| `Me niego a sembrar datos demo` | Falta `NEXT_PUBLIC_AMBIENTE=pruebas` en el `.env`, o el archivo quedó como `.env.txt` |
| Muchos `npm warn` al instalar | Normal. No son errores |

## Para actualizar el código más adelante

```powershell
cd ~\InvictosApp
git pull
npm install
```
