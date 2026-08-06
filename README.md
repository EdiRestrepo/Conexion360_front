# Conexion360 Frontend

Frontend Angular de Conexion360 para consulta y seguimiento de envios. El proyecto se puede ejecutar de dos formas:

- Como desarrollador, usando Angular CLI y `ng serve`.
- Como usuario final o evaluador, descargando un archivo `.zip` ya compilado desde GitHub Actions y ejecutandolo localmente con Nginx en Windows.

Esta guia explica principalmente la segunda opcion, pensada para personas que no tienen conocimientos solidos de desarrollo de software.

## Descargar el ZIP compilado desde GitHub Actions

El repositorio genera automaticamente un artefacto llamado `conexion360-nginx-dist`. Este artefacto contiene los archivos compilados de Angular listos para publicarse en Nginx.

Pasos:

1. Ingresar al repositorio en GitHub:

   ```text
   https://github.com/EdiRestrepo/Conexion360_front
   ```

2. Entrar a la pestana **Actions**.

3. Seleccionar la ejecucion mas reciente del workflow **Deploy Angular app to GitHub Pages**.

4. Verificar que los jobs aparezcan en verde:

   ```text
   Build and test
   Deploy
   ```

5. En la pagina de resumen de la ejecucion, bajar hasta la seccion **Artifacts**.

6. Descargar el artefacto:

   ```text
   conexion360-nginx-dist
   ```

7. GitHub descargara un archivo `.zip`. Descomprimirlo una sola vez en una carpeta temporal, por ejemplo:

   ```text
   C:\conexion360-dist
   ```

Al descomprimirlo se deben ver directamente archivos parecidos a estos:

```text
index.html
main-xxxx.js
polyfills-xxxx.js
styles-xxxx.css
chunk-xxxx.js
assets\
```

Estos son los archivos que Nginx debe servir.

Nota: no es necesario que dentro del ZIP exista una ruta como `dist\seguimiento-envios\browser`. Esa ruta es usada durante la compilacion dentro del proyecto Angular. Para entregar el proyecto a otra persona, el artefacto contiene directamente el contenido final de `browser`, porque eso es lo que Nginx necesita publicar.

## Instalar Nginx en Windows

Nginx para Windows se descarga desde la pagina oficial:

```text
https://nginx.org/en/download.html
```

Tambien se puede consultar la guia oficial para Windows:

```text
https://nginx.org/en/docs/windows.html
```

Pasos recomendados:

1. Abrir la pagina de descarga de Nginx.

2. Buscar la version para Windows. Por ejemplo:

   ```text
   nginx/Windows-1.30.4
   ```

3. Descargar el archivo `.zip`.

4. Descomprimirlo directamente en el disco `C:`.

   Por ejemplo, la carpeta final puede quedar asi:

   ```text
   C:\nginx-1.30.4
   ```

5. Verificar que exista esta carpeta:

   ```text
   C:\nginx-1.30.4\conf
   ```

6. Dentro de esa carpeta debe existir el archivo:

   ```text
   C:\nginx-1.30.4\conf\nginx.conf
   ```

## Copiar el proyecto compilado a Nginx

Crear una carpeta para publicar la aplicacion dentro de Nginx:

```text
C:\nginx-1.30.4\html\conexion360
```

Copiar dentro de esa carpeta todos los archivos descomprimidos del artefacto `conexion360-nginx-dist`.

La estructura debe quedar similar a esta:

```text
C:\nginx-1.30.4
  conf\
    nginx.conf
  html\
    conexion360\
      index.html
      main-xxxx.js
      polyfills-xxxx.js
      styles-xxxx.css
      assets\
```

## Configurar Nginx

Abrir este archivo con Bloc de notas, Visual Studio Code o cualquier editor de texto:

```text
C:\nginx-1.30.4\conf\nginx.conf
```

Reemplazar el contenido del bloque `server` por esta configuracion:

```nginx
server {
    listen       80;
    server_name  localhost;

    root   C:/nginx-1.30.4/html/conexion360;
    index  index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    error_page   500 502 503 504  /50x.html;

    location = /50x.html {
        root   html;
    }
}
```

Notas importantes:

- En Nginx para Windows se recomienda escribir las rutas con `/` y no con `\`.
- Por eso se usa `C:/nginx-1.30.4/html/conexion360`.
- La linea `try_files $uri $uri/ /index.html;` es necesaria para que funcionen las rutas internas de Angular al recargar la pagina.

Si se quiere conservar el archivo completo original de Nginx, tambien se puede dejar asi:

```nginx
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    server {
        listen       80;
        server_name  localhost;

        root   C:/nginx-1.30.4/html/conexion360;
        index  index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        error_page   500 502 503 504  /50x.html;

        location = /50x.html {
            root   html;
        }
    }
}
```

## Iniciar Nginx

Abrir una terminal de Windows.

Puede ser **PowerShell** o **Simbolo del sistema**.

Ir a la carpeta donde esta Nginx:

```powershell
cd C:\nginx-1.30.4
```

Iniciar Nginx:

```powershell
start nginx
```

Abrir el navegador y entrar a:

```text
http://localhost
```

Si todo esta correcto, debe cargar la aplicacion Conexion360.

## Detener o reiniciar Nginx

Cada comando se debe ejecutar desde esta carpeta:

```powershell
cd C:\nginx-1.30.4
```

Para recargar la configuracion despues de modificar `nginx.conf`:

```powershell
.\nginx.exe -s reload
```

Para detener Nginx:

```powershell
.\nginx.exe -s stop
```

Para iniciar Nginx nuevamente:

```powershell
start nginx
```

Para verificar si Nginx esta corriendo:

```powershell
tasklist /fi "imagename eq nginx.exe"
```

Si esta activo, deben aparecer procesos llamados `nginx.exe`.

## Configuracion de Auth0 para ejecucion local

La aplicacion usa Auth0 para autenticacion. Cuando se ejecuta desde Nginx local en:

```text
http://localhost
```

esa URL debe estar permitida en Auth0.

En el panel de Auth0, entrar a la aplicacion correspondiente y configurar:

**Allowed Callback URLs**

```text
http://localhost
```

**Allowed Logout URLs**

```text
http://localhost
```

**Allowed Web Origins**

```text
http://localhost
```

Si se ejecuta en otro puerto o dominio, tambien se debe agregar esa URL. Por ejemplo:

```text
http://localhost:8080
https://mi-dominio.com
```

## Solucion de problemas frecuentes

### No carga la pagina y aparece error 404 al recargar

Revisar que `nginx.conf` tenga esta linea:

```nginx
try_files $uri $uri/ /index.html;
```

Sin esa linea, Nginx no sabe devolver `index.html` cuando se recargan rutas internas de Angular.

### El navegador muestra la pagina por defecto de Nginx

Eso significa que Nginx esta sirviendo otra carpeta.

Revisar esta linea:

```nginx
root   C:/nginx-1.30.4/html/conexion360;
```

Tambien verificar que dentro de esa carpeta exista `index.html`.

### Auth0 no permite iniciar sesion

Verificar que la URL local este agregada en Auth0:

```text
http://localhost
```

Debe estar en:

- Allowed Callback URLs
- Allowed Logout URLs
- Allowed Web Origins

### El puerto 80 esta ocupado

Si otra aplicacion usa el puerto 80, cambiar Nginx a otro puerto, por ejemplo `8080`:

```nginx
listen       8080;
```

Luego abrir:

```text
http://localhost:8080
```

En ese caso tambien se debe agregar `http://localhost:8080` en Auth0.

### Nginx no inicia

Revisar el archivo de errores:

```text
C:\nginx-1.30.4\logs\error.log
```

Tambien se puede validar la configuracion con:

```powershell
cd C:\nginx-1.30.4
.\nginx.exe -t
```

## Desarrollo local con Angular

Esta seccion es para personas que si van a modificar el codigo fuente.

Instalar dependencias:

```bash
npm ci
```

Ejecutar servidor de desarrollo:

```bash
npm start
```

Abrir:

```text
http://localhost:4200
```

Ejecutar pruebas:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

Compilar manualmente:

```bash
npm run build
```

El resultado local queda en:

```text
dist\seguimiento-envios\browser
```

## Variables usadas por GitHub Actions

El workflow usa variables publicas de GitHub Actions para construir la aplicacion:

```text
AUTH0_DOMAIN
AUTH0_CLIENT_ID
AUTH0_AUDIENCE
APP_URL
API_BASE_URL
NGINX_APP_URL
NGINX_API_BASE_URL
```

En Angular, estos valores quedan incluidos en los archivos JavaScript compilados. Por esa razon no se deben guardar secretos privados en esas variables.

Valores usados normalmente para desarrollo y pruebas locales:

```text
API_BASE_URL=https://localhost:44368/api/v1
```

El documento/NIT (`document`) y el rol del usuario ya no se configuran en GitHub Actions. La aplicacion los toma desde Auth0 al iniciar sesion.

Para el artefacto de Nginx, si `NGINX_APP_URL` esta vacio, la aplicacion usa automaticamente el dominio desde donde se esta ejecutando, por ejemplo:

```text
http://localhost
```

Si el ZIP de Nginx debe consumir un backend diferente al de GitHub Pages, configurar tambien:

```text
NGINX_API_BASE_URL=https://localhost:44368/api/v1
```

Esto permite que el mismo ZIP pueda copiarse a diferentes equipos, siempre que la URL usada este autorizada en Auth0.
