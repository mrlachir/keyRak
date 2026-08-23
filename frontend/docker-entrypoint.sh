#!/bin/sh
set -eu

load_secret() {
  secret_name="$1"
  secret_path="$2"
  if [ ! -r "$secret_path" ]; then
    echo "Required secret file is unavailable: $secret_path" >&2
    exit 1
  fi
  secret_value="$(cat "$secret_path")"
  if [ -z "$secret_value" ]; then
    echo "Required secret is empty: $secret_name" >&2
    exit 1
  fi
  export "$secret_name=$secret_value"
}

load_secret NEXTAUTH_SECRET /run/secrets/nextauth_secret
load_secret GOOGLE_CLIENT_SECRET /run/secrets/google_client_secret
load_secret JWT_SECRET /run/secrets/jwt_secret

exec node server.js
