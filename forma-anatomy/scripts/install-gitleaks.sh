#!/usr/bin/env bash
set -euo pipefail
# Linux x86_64, matching the GitHub Actions runner. Other systems: install
# this gitleaks version from its official release and enable .githooks.
mkdir -p work/bin
curl --fail --silent --show-error --location --max-time 60 \
  https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz \
  --output work/gitleaks.tar.gz
printf '%s  %s\n' '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb' 'work/gitleaks.tar.gz' | sha256sum --check --status
tar -xzf work/gitleaks.tar.gz -C work/bin gitleaks
chmod +x work/bin/gitleaks
