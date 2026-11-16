pipeline {

    agent any

    tools {
        nodejs 'node'
    }

    parameters {
        booleanParam(name: 'DEPLOY_ENABLED', defaultValue: true,
            description: 'Activa o desactiva el despliegue en el servidor Docker de 192.168.1.82.')
        string(name: 'DEPLOY_HOST', defaultValue: '192.168.1.82',
            description: 'IP o host del servidor Docker donde se despliega la aplicación.')
        string(name: 'SSH_CREDENTIALS_ID', defaultValue: 'docker-server-ssh',
            description: 'Credencial Jenkins "SSH Username with private key" con acceso al servidor Docker.')
        string(name: 'DEPLOY_DIR', defaultValue: '/home/spentpark/gitDeploy/gitreact',
            description: 'Carpeta del servidor donde se despliega el stack (contiene backend-python/ y frontend-react19/). Solo se usa para localizar la carpeta: el compose se publica desde el proyecto.')
        string(name: 'COMPOSE_FILE', defaultValue: 'docker-compose.yml',
            description: 'Nombre con el que se publica en el servidor el docker-compose.yml DEL PROYECTO (fuente de verdad del despliegue). No se lee el compose de la máquina.')
        string(name: 'COMPOSE_SERVICE', defaultValue: 'frontend-react',
            description: 'Nombre del servicio del frontend dentro de docker-compose.yml.')
        string(name: 'CONTAINER_NAME', defaultValue: 'frontend-react19',
            description: 'Nombre del contenedor que se detiene/levanta.')
        string(name: 'FALLBACK_CONTAINER', defaultValue: 'backend-python',
            description: 'Contenedor de referencia para detectar la carpeta de despliegue si el frontend todavía no existe (vacío = desactivar). Nunca se lee su compose.')
        string(name: 'APP_PORT', defaultValue: '8065',
            description: 'Puerto en el que escucha la aplicación DENTRO del contenedor (lo usa el health check). En este stack coincide con el publicado, 8065.')
        string(name: 'PROBE_PATH', defaultValue: '/',
            description: 'Ruta HTTP de verificación (se exige respuesta 2xx al arrancar).')
    }

    environment {
        SONAR_HOST_URL      = "http://192.168.1.82:9000"
        SONAR_TOKEN = credentials('sonar-token')//"squ_d27dacd45a6c18772d7e941fd44e1617cf5c4c38"

        NEXUS_URL           = "192.168.1.82:8081"
        NEXUS_REPOSITORY    = "raw-releases"
        NEXUS_CREDENTIAL_ID = "nexus"

        APP_NAME    = "frontend-react"
        APP_VERSION = "1.0.0"
        ARTIFACT = "frontend.tar.gz"
    }

    stages {

        stage('Install') {
            steps {
                sh 'npm install --legacy-peer-deps'
            }
        }

        stage('Test coverage') {
            steps {
                sh 'npm run test:coverage'
            }
        }

        stage('Build React (Vite)') {
            steps {
                sh 'npm run build'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                    sh '''set -eu
                        npm install -g sonar-scanner

                        # El bridge de Node del scanner pide ~2 GB de heap por defecto y
                        # en este agente (4 GB) puede agotar el timeout de arranque
                        # ("Failed to start the bridge server (300s timeout)", build #19).
                        # Se limita el heap y se reintenta una vez por si es transitorio.
                        run_sonar() {
                            sonar-scanner \
                            -Dsonar.projectKey=frontend-react \
                            -Dsonar.projectName=frontend-react \
                            -Dsonar.host.url=$SONAR_HOST_URL \
                            -Dsonar.token=$SONAR_TOKEN \
                            -Dsonar.sources=src \
                            -Dsonar.test.inclusions=**/*.test.ts,**/*.test.tsx \
                            -Dsonar.exclusions=**/*.test.ts,**/*.test.tsx \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.javascript.node.maxspace=1024
                        }

                        run_sonar || {
                            echo "AVISO: sonar-scanner falló; reintentando una vez..."
                            sleep 10
                            run_sonar
                        }
                    '''
                }

        }

        stage('Package Dist') {
            steps {
                sh '''
                cd dist
                tar -czf ../frontend.tar.gz .
                '''
            }
        }

        stage('Deploy frontend en servidor Docker (192.168.1.82)') {
            when {
                expression { return params.DEPLOY_ENABLED == null || params.DEPLOY_ENABLED }
            }
            steps {
                withCredentials([sshUserPrivateKey(
                        credentialsId: params.SSH_CREDENTIALS_ID ?: 'docker-server-ssh',
                        keyFileVariable: 'SSH_KEY_FILE',
                        usernameVariable: 'SSH_USERNAME')]) {
                    withEnv([
                        "DEPLOY_HOST=${params.DEPLOY_HOST ?: '192.168.1.82'}",
                        "DEPLOY_DIR=${params.DEPLOY_DIR ?: '/home/spentpark/gitDeploy/gitreact'}",
                        "COMPOSE_FILE=${params.COMPOSE_FILE ?: 'docker-compose.yml'}",
                        "COMPOSE_SERVICE=${params.COMPOSE_SERVICE ?: 'frontend-react'}",
                        "CONTAINER_NAME=${params.CONTAINER_NAME ?: 'frontend-react19'}",
                        "FALLBACK_CONTAINER=${params.FALLBACK_CONTAINER ?: 'backend-python'}",
                        "APP_PORT=${params.APP_PORT ?: '8065'}",
                        "PROBE_PATH=${params.PROBE_PATH ?: '/'}"
                    ]) {
                        sh '''set -eu

# ---------------------------------------------------------------------------
# Despliegue del frontend por SSH en el servidor Docker remoto (192.168.1.82).
#
# La FUENTE DE VERDAD del compose es el docker-compose.yml DEL PROYECTO: el
# pipeline lo publica en DEPLOY_DIR y despliega con él. El docker-compose.yml
# que exista en la máquina NO se lee ni se usa para desplegar.
#
#  1. Comprueba SSH, Docker y Docker Compose en el servidor.
#  2. Localiza DEPLOY_DIR (parámetro o labels del contenedor) y valida el
#     docker-compose.yml del proyecto.
#  3. Sincroniza el código en ${DEPLOY_DIR}/frontend-react19 y publica el
#     docker-compose.yml del proyecto como ${DEPLOY_DIR}/${COMPOSE_FILE}.
#  4. Construye la imagen en el servidor (ANTES de detener nada: si la
#     compilación falla, la versión anterior sigue corriendo).
#  5. Detiene el contenedor si estaba corriendo y levanta la nueva imagen;
#     si estaba abajo lo levanta desde cero. Verifica imagen y health check.
# ---------------------------------------------------------------------------

: "${DEPLOY_HOST:?DEPLOY_HOST no definido}"
: "${SSH_KEY_FILE:?SSH_KEY_FILE no definido}"
: "${SSH_USERNAME:?SSH_USERNAME no definido}"
: "${COMPOSE_SERVICE:?COMPOSE_SERVICE no definido}"
: "${CONTAINER_NAME:?CONTAINER_NAME no definido}"
: "${APP_PORT:?APP_PORT no definido}"
: "${PROBE_PATH:?PROBE_PATH no definido}"
: "${DEPLOY_DIR:=}"
: "${COMPOSE_FILE:=docker-compose.yml}"
: "${FALLBACK_CONTAINER:=}"

# Compose del repositorio: única fuente de verdad del despliegue.
PROJECT_COMPOSE="docker-compose.yml"

WORKSPACE="${WORKSPACE:-$(pwd)}"
REMOTE_REPO_NAME="frontend-react19"

SSH_OPTS="-i ${SSH_KEY_FILE} -o BatchMode=yes -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -o ConnectTimeout=20 -o ServerAliveInterval=30 -o ServerAliveCountMax=4"
SSH_TARGET="${SSH_USERNAME}@${DEPLOY_HOST}"

echo "================================================================"
echo " 1/5 Verificando servidor ${SSH_TARGET}"
echo "================================================================"

ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s" <<'REMOTE_SSH'
set -eu
echo "  - Servidor: $(hostname)"
docker --version
if docker compose version >/dev/null 2>&1; then
    echo "  - Docker Compose v2 disponible (comando: docker compose)"
else
    docker-compose --version
    echo "  - Docker Compose v1 disponible (comando: docker-compose)"
fi
REMOTE_SSH

echo "================================================================"
echo " 2/5 Localizando DEPLOY_DIR y validando el compose del proyecto"
echo "================================================================"

# Las labels de Docker se usan solo para localizar la CARPETA del despliegue
# (DEPLOY_DIR). El compose de la máquina NO se lee ni se reutiliza: el
# pipeline despliega siempre con el docker-compose.yml del proyecto.
CONFIG_FILES=""
COMPOSE_WORKDIR=""
DETECTED_FROM=""
for DETECT_CONTAINER in ${CONTAINER_NAME} ${FALLBACK_CONTAINER}; do
    if [ -z "${DETECT_CONTAINER}" ]; then
        continue
    fi
    DETECTED="$(ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s -- ${DETECT_CONTAINER}" <<'REMOTE_DETECT'
docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$1" 2>/dev/null || true
docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$1" 2>/dev/null || true
REMOTE_DETECT
)"
    CONFIG_FILES="$(echo "${DETECTED}" | sed -n '1p')"
    COMPOSE_WORKDIR="$(echo "${DETECTED}" | sed -n '2p')"
    case "${CONFIG_FILES}" in
        "<no value>"|"null") CONFIG_FILES="" ;;
    esac
    case "${COMPOSE_WORKDIR}" in
        "<no value>"|"null") COMPOSE_WORKDIR="" ;;
    esac
    if [ -n "${CONFIG_FILES}" ] || [ -n "${COMPOSE_WORKDIR}" ]; then
        DETECTED_FROM="${DETECT_CONTAINER}"
        echo "  - Labels de despliegue encontradas en el contenedor ${DETECTED_FROM} (solo se usa la carpeta)"
        break
    fi
done

if [ -n "${DEPLOY_DIR}" ]; then
    echo "  - DEPLOY_DIR indicado por parámetro: ${DEPLOY_DIR}"
elif [ -n "${CONFIG_FILES}" ]; then
    FIRST_COMPOSE="$(echo "${CONFIG_FILES}" | cut -d, -f1)"
    DEPLOY_DIR="$(dirname "${FIRST_COMPOSE}")"
    echo "  - DEPLOY_DIR detectado desde labels Docker: ${DEPLOY_DIR}"
elif [ -n "${COMPOSE_WORKDIR}" ]; then
    DEPLOY_DIR="${COMPOSE_WORKDIR}"
    echo "  - DEPLOY_DIR detectado desde working_dir Docker: ${DEPLOY_DIR}"
else
    echo "ERROR: no se pudo detectar la carpeta de despliegue en el servidor." >&2
    echo "       No hay labels de compose en ${CONTAINER_NAME} ni en ${FALLBACK_CONTAINER}." >&2
    echo "       Relanza el job indicando el parámetro DEPLOY_DIR (ej: /home/spentpark/gitDeploy/gitreact)." >&2
    exit 1
fi

# COMPOSE_FILE ya no se detecta desde la máquina: es el nombre con el que se
# publica el compose del proyecto en DEPLOY_DIR.
case "${COMPOSE_FILE}" in
    */*) echo "ERROR: COMPOSE_FILE debe ser un nombre de archivo, no una ruta: ${COMPOSE_FILE}" >&2; exit 1 ;;
esac

if [ ! -f "${WORKSPACE}/${PROJECT_COMPOSE}" ]; then
    echo "ERROR: el proyecto no contiene ${PROJECT_COMPOSE}: no hay compose que desplegar." >&2
    echo "       El pipeline ya no usa el docker-compose de la máquina." >&2
    exit 1
fi
PROJECT_COMPOSE_HASH="$(sha256sum "${WORKSPACE}/${PROJECT_COMPOSE}" | cut -d' ' -f1)"
echo "  - Compose del proyecto: ${PROJECT_COMPOSE} (sha256 ${PROJECT_COMPOSE_HASH})"

# Validaciones de seguridad: DEPLOY_DIR se usa para borrar/crear el contexto
# de build, así que nunca debe quedar vacío, ser "/" ni contener "..".
case "${DEPLOY_DIR}" in
    "/") echo "ERROR: DEPLOY_DIR no puede ser /" >&2; exit 1 ;;
    *..*) echo "ERROR: DEPLOY_DIR no puede contener '..': ${DEPLOY_DIR}" >&2; exit 1 ;;
    *[!A-Za-z0-9._/-]*) echo "ERROR: DEPLOY_DIR tiene caracteres no permitidos: ${DEPLOY_DIR}" >&2; exit 1 ;;
    /*) ;;
    *) echo "ERROR: DEPLOY_DIR debe ser una ruta absoluta: ${DEPLOY_DIR}" >&2; exit 1 ;;
esac

case "${CONTAINER_NAME}" in
    ""|*[!A-Za-z0-9._-]*) echo "ERROR: CONTAINER_NAME inválido: ${CONTAINER_NAME}" >&2; exit 1 ;;
esac
case "${FALLBACK_CONTAINER}" in
    "") ;;
    *[!A-Za-z0-9._-]*) echo "ERROR: FALLBACK_CONTAINER inválido: ${FALLBACK_CONTAINER}" >&2; exit 1 ;;
esac
case "${COMPOSE_SERVICE}" in
    ""|*[!A-Za-z0-9._-]*) echo "ERROR: COMPOSE_SERVICE inválido: ${COMPOSE_SERVICE}" >&2; exit 1 ;;
esac
case "${COMPOSE_FILE}" in
    ""|*[!A-Za-z0-9._-]*) echo "ERROR: COMPOSE_FILE inválido: ${COMPOSE_FILE}" >&2; exit 1 ;;
esac
case "${APP_PORT}" in
    ""|*[!0-9]*) echo "ERROR: APP_PORT inválido: ${APP_PORT}" >&2; exit 1 ;;
esac
case "${PROBE_PATH}" in
    /*) ;;
    *) echo "ERROR: PROBE_PATH debe empezar con /: ${PROBE_PATH}" >&2; exit 1 ;;
esac
case "${PROBE_PATH}" in
    *[!A-Za-z0-9._/?=-]*) echo "ERROR: PROBE_PATH tiene caracteres no permitidos: ${PROBE_PATH}" >&2; exit 1 ;;
esac

REMOTE_REPO="${DEPLOY_DIR}/${REMOTE_REPO_NAME}"
REMOTE_TMP="${DEPLOY_DIR}/.${REMOTE_REPO_NAME}.tmp"

echo "  - Contexto de build: ${REMOTE_REPO}"
echo "  - Servicio compose: ${COMPOSE_SERVICE} (contenedor ${CONTAINER_NAME})"
echo "  - Compose a usar: ${DEPLOY_DIR}/${COMPOSE_FILE} (publicado desde el proyecto)"

echo "================================================================"
echo " 3/5 Sincronizando código a ${SSH_TARGET}:${REMOTE_REPO}"
echo "================================================================"

# El Dockerfile recompila en el servidor, por eso se excluyen los artefactos
# locales (node_modules, dist, coverage…) y el resto de la caché del agente.
TAR_EXCLUDES=""
for EXCL in ./node_modules ./dist ./coverage ./.git ./.scannerwork ./frontend.tar.gz; do
    TAR_EXCLUDES="${TAR_EXCLUDES} --exclude=${EXCL}"
done

tar czf - -C "${WORKSPACE}" ${TAR_EXCLUDES} . | ssh ${SSH_OPTS} "${SSH_TARGET}" "set -e; mkdir -p '${DEPLOY_DIR}'; rm -rf '${REMOTE_TMP}'; mkdir -p '${REMOTE_TMP}'; tar xzf - -C '${REMOTE_TMP}'; rm -rf '${REMOTE_REPO}'; mv '${REMOTE_TMP}' '${REMOTE_REPO}'; echo '  - Código sincronizado correctamente'"

# Publicación del compose DEL PROYECTO: desde aquí el despliegue usa este
# archivo y deja de depender del docker-compose.yml de la máquina.
echo "  - Publicando ${PROJECT_COMPOSE} del proyecto en ${DEPLOY_DIR}/${COMPOSE_FILE}..."
REMOTE_COMPOSE_HASH="$(ssh ${SSH_OPTS} "${SSH_TARGET}" "set -e; cp -f '${REMOTE_REPO}/${PROJECT_COMPOSE}' '${DEPLOY_DIR}/${COMPOSE_FILE}'; sha256sum '${DEPLOY_DIR}/${COMPOSE_FILE}' | cut -d' ' -f1")"
if [ "${REMOTE_COMPOSE_HASH}" != "${PROJECT_COMPOSE_HASH}" ]; then
    echo "ERROR: el compose publicado en el servidor no coincide con el del proyecto." >&2
    echo "       local=${PROJECT_COMPOSE_HASH} remoto=${REMOTE_COMPOSE_HASH}" >&2
    exit 1
fi
echo "  - Compose del proyecto publicado (sha256 ${REMOTE_COMPOSE_HASH} verificado)"

# Se valida el compose después de sincronizar para que el contexto de build exista.
echo "  - Validando compose y servicio del frontend..."
SERVICE_META="$(ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s -- ${DEPLOY_DIR} ${COMPOSE_FILE} ${COMPOSE_SERVICE}" <<'REMOTE_PREFLIGHT'
set -eu
compose_dir="$1"; compose_file="$2"; service="$3"
cd "${compose_dir}"
if [ ! -f "${compose_file}" ]; then
    echo "ERROR: no existe ${compose_dir}/${compose_file} en el servidor." >&2
    exit 1
fi
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
else
    DC="docker-compose"
fi
services="$($DC -f "${compose_file}" config --services)"
echo "  - Servicios definidos: $(echo ${services})"
echo "${services}" | grep -qx "${service}" || {
    echo "ERROR: el servicio '${service}' no está definido en ${compose_dir}/${compose_file}." >&2
    exit 1
}
# `docker compose config <servicio>` imprime también sus dependencias, así que
# se parsea la configuración completa y se leen `image:`/`build:` SOLO dentro
# del bloque del servicio objetivo (líneas con 2 espacios y nombre + ":").
full_config="$($DC -f "${compose_file}" config)"
image="$(printf '%s\n' "${full_config}" | awk -v svc="${service}" '
    /^  [A-Za-z0-9_.-]+:$/ { current = substr($1, 1, length($1) - 1); next }
    current == svc && /^[[:space:]]+image:/ { sub(/^[[:space:]]*image:[[:space:]]*/, ""); print; exit }
')"
has_build="$(printf '%s\n' "${full_config}" | awk -v svc="${service}" '
    /^  [A-Za-z0-9_.-]+:$/ { current = substr($1, 1, length($1) - 1); next }
    current == svc && /^[[:space:]]+build:/ { print "1"; exit }
')"
echo "HAS_BUILD=${has_build:-0}"
echo "COMPOSE_IMAGE=${image}"
REMOTE_PREFLIGHT
)"
echo "${SERVICE_META}"
HAS_BUILD="$(echo "${SERVICE_META}" | sed -n 's/^HAS_BUILD=//p')"
COMPOSE_IMAGE="$(echo "${SERVICE_META}" | sed -n 's/^COMPOSE_IMAGE=//p')"

if [ "${HAS_BUILD}" = "1" ]; then
    # La imagen se construye con el compose DEL PROYECTO para que se apliquen
    # sus `build.args` (VITE_API_URL=/api y VITE_NEWS_API_URL=/news-api); un
    # `docker build` directo se saltaría esos argumentos.
    BUILD_MODE="compose"
    IMAGE_TAG="${COMPOSE_IMAGE}"
    echo "  - El servicio define 'build:': se construye con 'docker compose build' (args del compose)"
elif [ -n "${COMPOSE_IMAGE}" ]; then
    BUILD_MODE="docker"
    IMAGE_TAG="${COMPOSE_IMAGE}"
    echo "  - Imagen definida en el compose: ${IMAGE_TAG}"
else
    echo "ERROR: el servicio '${COMPOSE_SERVICE}' no define 'image:' ni 'build:' en ${COMPOSE_FILE}." >&2
    echo "       Añádelo al docker-compose.yml del proyecto y reintenta." >&2
    exit 1
fi

if [ -n "${IMAGE_TAG}" ]; then
    case "${IMAGE_TAG}" in
        *[!A-Za-z0-9._/:@-]*) echo "ERROR: nombre de imagen inválido: '${IMAGE_TAG}'" >&2; exit 1 ;;
    esac
fi

echo "================================================================"
echo " 4/5 Construyendo imagen en el servidor"
echo "================================================================"

BUILT_IMAGE_ID=""
if [ "${BUILD_MODE}" = "compose" ]; then
    # Se construye ANTES de detener el contenedor: si falla, sigue la versión vieja.
    ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s -- ${DEPLOY_DIR} ${COMPOSE_FILE} ${COMPOSE_SERVICE}" <<'REMOTE_COMPOSE_BUILD'
set -eu
compose_dir="$1"; compose_file="$2"; service="$3"
cd "${compose_dir}"
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
else
    DC="docker-compose"
fi

# Bug conocido de buildx bake (docker/buildx#3486): `docker compose build` puede
# fallar de forma esporádica con "NotFound: forwarding Ping: no such job" cuando
# el job de build desaparece del daemon. Se reintenta y, si persiste, se compila
# con `docker buildx build` usando la MISMA configuración del compose del
# proyecto (context, args, dockerfile, target e imagen), sin pasar por bake.
attempt=0
while [ "${attempt}" -lt 2 ]; do
    attempt=$((attempt + 1))
    if $DC -f "${compose_file}" build "${service}"; then
        echo "  - Imagen construida correctamente (docker compose build)"
        exit 0
    fi
    echo "  - AVISO: 'docker compose build' falló (intento ${attempt}/2; bug conocido de buildx bake)." >&2
    sleep 5
done

echo "  - Fallback: compilando con 'docker buildx build' desde la configuración del compose del proyecto..." >&2
config_json="$($DC -f "${compose_file}" config --format json)"
context="$(printf '%s' "${config_json}" | jq -r --arg s "${service}" '.services[$s].build.context // empty')"
dockerfile="$(printf '%s' "${config_json}" | jq -r --arg s "${service}" '.services[$s].build.dockerfile // "Dockerfile"')"
target="$(printf '%s' "${config_json}" | jq -r --arg s "${service}" '.services[$s].build.target // empty')"
image="$(printf '%s' "${config_json}" | jq -r --arg s "${service}" '.services[$s].image // empty')"
if [ -z "${context}" ] || [ -z "${image}" ]; then
    echo "ERROR: el compose no expone build.context/build.image para '${service}': no se puede usar el fallback." >&2
    exit 1
fi

# El script remoto es `sh` (dash): se guardan los argumentos en $@ para no
# romper valores con espacios.
set -- --load
while IFS= read -r build_arg; do
    if [ -n "${build_arg}" ]; then
        set -- "$@" "${build_arg}"
    fi
done <<BUILD_ARGS
$(printf '%s' "${config_json}" | jq -r --arg s "${service}" '(.services[$s].build.args // {}) | to_entries[] | "--build-arg=\(.key)=\(.value)"')
BUILD_ARGS
if [ -n "${target}" ]; then
    set -- "$@" --target "${target}"
fi

attempt=0
while [ "${attempt}" -lt 2 ]; do
    attempt=$((attempt + 1))
    if docker buildx build "$@" -f "${context}/${dockerfile}" -t "${image}" "${context}"; then
        echo "  - Imagen construida correctamente (docker buildx build, sin bake)"
        exit 0
    fi
    echo "  - AVISO: el fallback 'docker buildx build' falló (intento ${attempt}/2)." >&2
    sleep 5
done

echo "ERROR: no se pudo construir la imagen ni con compose ni con buildx build." >&2
exit 1
REMOTE_COMPOSE_BUILD
    if [ -n "${IMAGE_TAG}" ]; then
        BUILT_IMAGE_ID="$(ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s -- ${IMAGE_TAG}" <<'REMOTE_IMAGE_ID'
set -eu
docker image inspect -f '{{.Id}}' "$1"
REMOTE_IMAGE_ID
)"
        echo "  - ID de la imagen construida: ${BUILT_IMAGE_ID}"
    fi
else
    ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s -- ${REMOTE_REPO} ${IMAGE_TAG}" <<'REMOTE_BUILD'
set -eu
repo="$1"; image="$2"
if [ ! -f "${repo}/Dockerfile" ]; then
    echo "ERROR: no se encontró ${repo}/Dockerfile en el servidor." >&2
    exit 1
fi
docker build -t "${image}" "${repo}"
echo "  - Imagen ${image} construida correctamente"
REMOTE_BUILD
    BUILT_IMAGE_ID="$(ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s -- ${IMAGE_TAG}" <<'REMOTE_IMAGE_ID'
set -eu
docker image inspect -f '{{.Id}}' "$1"
REMOTE_IMAGE_ID
)"
    echo "  - ID de la imagen construida: ${BUILT_IMAGE_ID}"
fi

echo "================================================================"
echo " 5/5 Deteniendo (si aplica) y levantando ${CONTAINER_NAME}"
echo "================================================================"

DEPLOY_LOG="$(mktemp 2>/dev/null || echo /tmp/deploy-frontend.log)"
ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s -- ${DEPLOY_DIR} ${COMPOSE_FILE} ${COMPOSE_SERVICE} ${CONTAINER_NAME}" > "${DEPLOY_LOG}" <<'REMOTE_DEPLOY'
set -eu
compose_dir="$1"; compose_file="$2"; service="$3"; container="$4"
cd "${compose_dir}"
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
else
    DC="docker-compose"
fi

# Migración de servicios renombrados: si el contenedor conserva el nombre pero
# su label de servicio ya no existe en el compose del proyecto (por ejemplo los
# antiguos `backend` y `frontend`, hoy `backend-python` y `frontend-react`), hay
# que eliminarlo antes del `up`: Docker Compose falla con "Conflict. The
# container name ... is already in use" incluso usando --remove-orphans.
compose_services="$($DC -f "${compose_file}" config --services)"
project_name="$($DC -f "${compose_file}" config | sed -n 's/^name:[[:space:]]*//p' | head -n 1)"
if [ -z "${project_name}" ]; then
    project_name="$(basename "${compose_dir}")"
fi
for stale in $(docker ps -a --filter "label=com.docker.compose.project=${project_name}" --format '{{.Names}}'); do
    svc_label="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.service"}}' "${stale}" 2>/dev/null || true)"
    if [ -n "${svc_label}" ] && ! echo "${compose_services}" | grep -qx "${svc_label}"; then
        echo "  - Eliminando contenedor obsoleto ${stale} (servicio '${svc_label}' ya no existe en el compose del proyecto)."
        docker rm -f "${stale}" >/dev/null
    fi
done

if [ "$(docker inspect -f "{{.State.Running}}" "${container}" 2>/dev/null || true)" = "true" ]; then
    echo "  - El contenedor ${container} ESTABA EN EJECUCIÓN: se detiene para desplegar la nueva versión."
    $DC -f "${compose_file}" stop "${service}" || true
    WAS_RUNNING="si"
else
    echo "  - El contenedor ${container} NO estaba corriendo (o no existe): se levanta desde cero."
    WAS_RUNNING="no"
fi

echo "  - Levantando ${service} con la imagen recién construida..."
# `--remove-orphans` elimina los contenedores del proyecto compose que ya no
# corresponden a ningún servicio publicado (por ejemplo los antiguos servicios
# `backend`/`frontend` del compose de la máquina). Así se liberan los nombres de
# contenedor antes de recrearlos con los servicios actuales del proyecto.
$DC -f "${compose_file}" up -d --force-recreate --remove-orphans "${service}"

sleep 2
status="$(docker inspect -f "{{.State.Status}}" "${container}" 2>/dev/null || echo desconocido)"
image="$(docker inspect -f "{{.Image}}" "${container}" 2>/dev/null || echo desconocida)"
echo "  - Contenedor ${container}: estado=${status} imagen=${image} (corría antes: ${WAS_RUNNING})"
echo "CONTAINER_IMAGE_ID=${image}"
REMOTE_DEPLOY
cat "${DEPLOY_LOG}"
CONTAINER_IMAGE_ID="$(sed -n 's/^CONTAINER_IMAGE_ID=//p' "${DEPLOY_LOG}")"
rm -f "${DEPLOY_LOG}"

# Si construimos una imagen concreta, el contenedor debe estar corriendo ESA imagen.
if [ -n "${BUILT_IMAGE_ID}" ] && [ -n "${CONTAINER_IMAGE_ID}" ] && [ "${BUILT_IMAGE_ID}" != "${CONTAINER_IMAGE_ID}" ]; then
    echo "ERROR: el contenedor ${CONTAINER_NAME} no está usando la imagen recién construida." >&2
    echo "       Imagen construida:    ${BUILT_IMAGE_ID}" >&2
    echo "       Imagen del contenedor: ${CONTAINER_IMAGE_ID}" >&2
    echo "       Revisa que el servicio '${COMPOSE_SERVICE}' use 'image: ${IMAGE_TAG}' en ${COMPOSE_FILE}." >&2
    exit 1
fi

echo "  - Esperando respuesta HTTP en el puerto ${APP_PORT}${PROBE_PATH}..."
ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s -- ${CONTAINER_NAME} ${APP_PORT} ${PROBE_PATH}" <<'REMOTE_HEALTH'
set -eu
container="$1"; port="$2"; path="$3"
attempt=0
while [ "${attempt}" -lt 30 ]; do
    attempt=$((attempt + 1))
    if docker exec "${container}" curl -fsS -o /dev/null "http://127.0.0.1:${port}${path}" 2>/dev/null; then
        echo "  - La aplicación respondió correctamente (intento ${attempt})."
        exit 0
    fi
    sleep 5
done
echo "ERROR: la aplicación no respondió en el puerto ${port}${path} tras 150 segundos." >&2
echo "---- Últimas 100 líneas del contenedor ${container} ----" >&2
docker logs --tail 100 "${container}" >&2 || true
exit 1
REMOTE_HEALTH

ssh ${SSH_OPTS} "${SSH_TARGET}" "sh -s -- ${CONTAINER_NAME}" <<'REMOTE_CLEANUP'
set -eu
container="$1"
docker image prune -f >/dev/null 2>&1 || true
docker ps --filter "name=${container}" --format "  - {{.Names}} | {{.Image}} | {{.Status}} | {{.Ports}}"
REMOTE_CLEANUP

echo "================================================================"
echo " Despliegue completado: http://${DEPLOY_HOST}:${APP_PORT}"
echo "================================================================"
'''
                    }
                }
            }
        }
    }

    post {

    success {
        echo "Build SUCCESS"
    }

    failure {
        echo "Si el fallo fue en el despliegue, revisa el contenedor: ssh <usuario>@${params.DEPLOY_HOST ?: '192.168.1.82'} docker logs --tail 200 ${params.CONTAINER_NAME ?: 'frontend-react19'}"
        echo "Build FAILED"
    }

    always {

        archiveArtifacts artifacts: 'coverage/**', fingerprint: true

        cleanWs()
    }
}
}
