#!/usr/bin/env bash
set -euo pipefail
npm ci --ignore-scripts --fetch-retries=0 --fetch-timeout=30000
