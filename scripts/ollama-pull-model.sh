#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"
MODEL="${OLLAMA_MODEL:-}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

MODEL="${MODEL:-${OLLAMA_MODEL:-llama3.1:8b}}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "ollama CLI is required but was not found on PATH." >&2
  exit 1
fi

echo "Pulling Ollama model: $MODEL"
ollama pull "$MODEL"
echo "Model ready: $MODEL"
