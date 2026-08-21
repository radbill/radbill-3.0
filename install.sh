#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly DEFAULT_REPOSITORY="radbill/radbill-3.0"
readonly REPOSITORY="${RADBILL_GITHUB_REPOSITORY:-$DEFAULT_REPOSITORY}"
readonly RELEASE="${RADBILL_RELEASE:-latest}"

log() {
    printf '[RadBill] %s\n' "$*"
}

fail() {
    printf '[RadBill] ERROR: %s\n' "$*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Perintah '$1' tidak ditemukan."
}

detect_architecture() {
    local detected=""
    if command -v dpkg >/dev/null 2>&1; then
        detected="$(dpkg --print-architecture)"
    else
        detected="$(uname -m)"
    fi

    case "$detected" in
        amd64|x86_64)
            printf 'amd64'
            ;;
        arm64|aarch64)
            printf 'arm64'
            ;;
        arm|armhf|armv7l|armv7*)
            printf 'arm'
            ;;
        *)
            fail "Arsitektur '$detected' belum didukung. Gunakan amd64, arm64, atau ARMv7."
            ;;
    esac
}

download() {
    local url="$1"
    local destination="$2"

    if command -v curl >/dev/null 2>&1; then
        curl --fail --location --silent --show-error \
            --retry 3 --connect-timeout 20 \
            --proto '=https' --tlsv1.2 \
            --output "$destination" "$url"
        return
    fi

    if command -v wget >/dev/null 2>&1; then
        wget --quiet --https-only --secure-protocol=TLSv1_2 \
            --output-document="$destination" "$url"
        return
    fi

    fail "curl atau wget wajib tersedia untuk mengunduh paket."
}

verify_sha256() {
    local file="$1"
    local checksum_file="$2"
    local expected=""
    local actual=""

    expected="$(awk 'NR == 1 { print tolower($1) }' "$checksum_file")"
    [[ "$expected" =~ ^[0-9a-f]{64}$ ]] || fail "Format checksum tidak valid: $(basename "$checksum_file")"

    actual="$(sha256sum "$file" | awk '{ print tolower($1) }')"
    [[ "$actual" == "$expected" ]] || fail "Checksum tidak cocok: $(basename "$file")"
    log "Checksum valid: $(basename "$file")"
}

[[ "$(uname -s)" == "Linux" ]] || fail "Installer hanya mendukung Linux."
[[ "$REPOSITORY" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] ||
    fail "RADBILL_GITHUB_REPOSITORY harus berbentuk owner/repository."
[[ "$RELEASE" == "latest" || "$RELEASE" =~ ^v?[0-9]+(\.[0-9]+){1,3}([-+][0-9A-Za-z.-]+)?$ ]] ||
    fail "RADBILL_RELEASE tidak valid."

require_command awk
require_command sha256sum
require_command uname

ARCH="$(detect_architecture)"
INSTALLER_ASSET="installer-linux-$ARCH"
RUNTIME_ASSET="radbill-linux-$ARCH.zip"

if [[ -n "${RADBILL_RELEASE_BASE_URL:-}" ]]; then
    BASE_URL="${RADBILL_RELEASE_BASE_URL%/}"
else
    if [[ "$RELEASE" == "latest" ]]; then
        BASE_URL="https://github.com/$REPOSITORY/releases/latest/download"
    else
        BASE_URL="https://github.com/$REPOSITORY/releases/download/$RELEASE"
    fi
fi
[[ "$BASE_URL" == https://* ]] || fail "URL release wajib menggunakan HTTPS."

TEMP_DIR="$(mktemp -d)"
cleanup() {
    rm -rf -- "$TEMP_DIR"
}
trap cleanup EXIT HUP INT TERM

INSTALLER_PATH="$TEMP_DIR/$INSTALLER_ASSET"
RUNTIME_PATH="$TEMP_DIR/$RUNTIME_ASSET"
INSTALLER_CHECKSUM="$INSTALLER_PATH.sha256"
RUNTIME_CHECKSUM="$RUNTIME_PATH.sha256"

log "Arsitektur: $ARCH"
log "Release: $RELEASE dari $REPOSITORY"
log "Mengunduh installer dan paket runtime..."

download "$BASE_URL/$INSTALLER_ASSET" "$INSTALLER_PATH"
download "$BASE_URL/$INSTALLER_ASSET.sha256" "$INSTALLER_CHECKSUM"
download "$BASE_URL/$RUNTIME_ASSET" "$RUNTIME_PATH"
download "$BASE_URL/$RUNTIME_ASSET.sha256" "$RUNTIME_CHECKSUM"

verify_sha256 "$INSTALLER_PATH" "$INSTALLER_CHECKSUM"
verify_sha256 "$RUNTIME_PATH" "$RUNTIME_CHECKSUM"
chmod 0700 "$INSTALLER_PATH"

log "Menjalankan installer..."
if [[ "$(id -u)" -eq 0 ]]; then
    "$INSTALLER_PATH" "$@" \
        --package-dir "$TEMP_DIR" \
        --github-repository "$REPOSITORY"
else
    require_command sudo
    if [[ -n "${RADBILL_INSTALL_ADMIN_PASSWORD:-}" ]]; then
        sudo --preserve-env=RADBILL_INSTALL_ADMIN_PASSWORD \
            "$INSTALLER_PATH" "$@" \
            --package-dir "$TEMP_DIR" \
            --github-repository "$REPOSITORY"
    else
        sudo "$INSTALLER_PATH" "$@" \
            --package-dir "$TEMP_DIR" \
            --github-repository "$REPOSITORY"
    fi
fi

log "Instalasi selesai."
