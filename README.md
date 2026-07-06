# Mi Rutina — PWA de consulta de pesos

App para consultar tus 4 sesiones de fuerza y anotar/actualizar los pesos de cada ejercicio desde el móvil.

## 1. Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser público o privado).
2. Sube **todos los archivos de esta carpeta** manteniendo la misma estructura:
   ```
   index.html
   styles.css
   app.js
   manifest.json
   sw.js
   data/ejercicios.json
   icons/icon-192.png
   icons/icon-512.png
   ```
3. Ve a **Settings → Pages** en el repositorio.
4. En "Source", elige la rama `main` y la carpeta `/ (root)`.
5. Guarda. En un par de minutos tendrás tu app en:
   `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`

## 2. Instalar en tu Samsung Galaxy A54

1. Abre esa URL en **Chrome** desde el móvil.
2. Toca el menú (⋮) → **Añadir a pantalla de inicio** (o aparecerá un aviso automático de "Instalar app").
3. Confirma. Te quedará un icono como cualquier otra app, y abrirá a pantalla completa.

## 3. Cómo funciona

- **Pantalla de inicio**: 4 discos, uno por sesión. Cada uno indica cuántos pesos llevas ya anotados de esa sesión.
- **Pantalla de sesión**: lista de ejercicios con series/repeticiones y campos para el peso. Los campos vacíos aparecen resaltados en ámbar — son los que aún no conoces del gimnasio nuevo.
- **Guardar pesos de hoy**: guarda los cambios en el propio móvil al instante (localStorage). Si has configurado la sincronización con GitHub, además hace un commit automático a tu repositorio.

## 4. Activar la sincronización con GitHub (opcional)

Desde el botón "Ajustes y sincronización" en la app necesitas:

1. **Usuario/organización** y **nombre del repositorio** donde subiste la app.
2. **Ruta del archivo**: déjala como `data/ejercicios.json`.
3. **Token de acceso personal**. Créalo así:
   - GitHub → foto de perfil → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
   - Limita el token **solo a este repositorio** (Repository access → Only select repositories).
   - En permisos, dale a **Contents: Read and write**. No necesita ningún otro permiso.
   - Copia el token generado y pégalo en la app.

El token se guarda únicamente en el almacenamiento local de tu móvil, nunca se sube al repositorio ni se comparte.

## 5. Editar los ejercicios más adelante

Si cambias de rutina, edita `data/ejercicios.json` directamente en GitHub (o pídeme que te genere uno nuevo) y borra los datos guardados en el móvil para que la app cargue la versión nueva:
Ajustes del navegador → Chrome → Configuración del sitio → borrar datos del sitio, o simplemente reinstala la PWA.

## Notas técnicas

- Sin frameworks ni build: HTML + CSS + JS puro, no requiere `npm install` ni compilación.
- Funciona offline gracias al Service Worker (`sw.js`), salvo la sincronización con GitHub que sí requiere conexión.
- Tipos de carga distinguidos en cada ejercicio:
  - `total`: peso total del ejercicio.
  - `porLado`: kg cargados a cada lado de la barra (el peso real movido es el doble, más la barra).
  - `mancuernaUnica`: peso de una sola mancuerna.
  - `mancuernasVariable`: varias mancuernas de distinto peso, una por serie (caso del Press Mancuernas).
  - `alternativa`: ejercicio con dos variantes intercambiables (caso Pec Deck / Pájaros invertidos), cada una con su propio peso guardado.
