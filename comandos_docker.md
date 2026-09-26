### primera imagen
docker build -t primera_imagen .

### ver imagenes
docker images

### ejecutar contenedor
docker run primera_imagen
docker run hello-world

### ver contenedores
docker ps -a

### correr un contenedor y eliminarlo al salir
docker run --rm primera_imagen

### version de docker 
docker --version

### version de docker compose
docker compose version

### informacion de docker
docker info

### contenedor de python
docker run -it --rm python:3.12 python

### contenedor de node
docker run -it --rm node:20 node 
docker run -it --rm node:20 node --version


### ubuntu bash
docker run -it --rm 'ubuntu:latest' bash

### ver logs

docker logs <nombre_contenedor>

### ver logs en tiempo real
docker logs -f <nombre_contenedor>


### detener contenedor
docker stop <nombre_contenedor>

### listar contenedores
docker ps -a

### listar contenedores en ejecucion
docker ps

### eliminar contenedor
docker rm <nombre_contenedor>


### eliminar un contenedor forzadamente
docker rm -f <nombre_contenedor>

### listar imagenes
docker images


### variables de entorno
docker run -e "NOMBRE=Juan" -e "APELLIDO=Perez"

### levantar la aplicacion con docker y variables de entorno con archivo .env
docker run -d -p 8080:80 --env-file .env --name conexion360-front-app 

### ver uso de espacio
docker system df

### eliminar todo lo que no se esta usando
docker system prune 


### eliminar todo
docker system prune -a

### iniciar docker
docker init

### buscar una imagen en docker hub
docker search <nombre_imagen>


### renombrar una imagen
docker tag <imagen_vieja> <imagen_nueva>

### publicar una imagen
docker push <nombre_usuario>/<nombre_imagen>:<tag>
ejemplo:
docker push juanperez/conexion360-front:1.0

### loguear la terminal con dockerhub
docker login

### volumenes
docker volume create <nombre_volumen>

### levantar una base de datos postgres con volumenes

docker run -d \
  --name postgres-db \
  -e POSTGRES_USER=usuario \
  -e POSTGRES_PASSWORD=contraseña \
  -e POSTGRES_DB=nombre_base_datos \
  -v nombre_volumen:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:latest


### ejecutar comandos a un conetenedor sin necesidad de entrar al contenedor
docker exec -it <nombre_contenedor> <comando>
ejemplo: docker exec -it postgres-db psql -U usuario - "CREATE TABLE usuarios (nombre text);"


### eliminar volumenes
docker volume rm <nombre_volumen>

### bindiar un contenedor con mi maquina local
docker run -d -p 3000:3000 \
  --name mi-aplicacion \
  -v "$(pwd):/app" \
  app-volumen:latest \
  sh -c "node --watch app.js"


### modelos
docker model list

docker model pull ai/smollm2

docker ai


----

## levantar la aplicacion con docker

- crear la imagen
docker build -f DockerFile -t conexion360-front:1.0 .

- Levantar el contenedor
docker run --name conexion360-front-app -p 8080:80 conexion360-front:1.0

- Si quieres que el contenedor quede corriendo en segundo plano:
docker run -d --name conexion360-front-app -p 8080:80 conexion360-front:1.0

- Subir la imagen a Docker Hub o a un registry:
docker tag conexion360-front:1.0 tuusuario/conexion360-front:1.0
docker push tuusuario/conexion360-front:1.0

- En el otro equipo:
docker pull tuusuario/conexion360-front:1.0
docker run -d --name conexion360-front-app -p 8080:80 tuusuario/conexion360-front:1.0

