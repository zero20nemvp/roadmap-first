#!/usr/bin/env bash
# Ships the coach to the roadmap-coach LXC container on the Hetzner host and restarts it.
#   app/deploy.sh            (from the repo root)
# First-time setup (container, Node 24, the coach user, /etc/roadmap-coach.env, the systemd unit
# and the Caddy site roadmap.zero2one.ee) is described in app/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."
tarball=$(mktemp -t coach.XXXXXX)
trap 'rm -f "$tarball"' EXIT
COPYFILE_DISABLE=1 tar --exclude node_modules --exclude data -czf "$tarball" app web/report.ts web/roadmap.ts web/roadmap.template.html assets/vendor docs/emails
scp -q "$tarball" hetzner:/tmp/coach.tgz
ssh hetzner 'lxc file push -q /tmp/coach.tgz roadmap-coach/tmp/coach.tgz && rm /tmp/coach.tgz &&
  lxc exec roadmap-coach -- bash -c "tar -xzf /tmp/coach.tgz -C /opt/roadmap-coach 2>/dev/null && rm /tmp/coach.tgz &&
    cd /opt/roadmap-coach/app && npm install --omit=dev --silent && systemctl restart roadmap-coach && sleep 2 &&
    systemctl is-active roadmap-coach && curl -s localhost:3000/health"'
