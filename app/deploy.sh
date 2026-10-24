#!/usr/bin/env bash
# Ships the coach to its LXC containers on the Hetzner host and restarts each one.
#   app/deploy.sh                                (from the repo root: every coach)
#   COACH_TARGETS=roadmap-coach app/deploy.sh    (just the named ones)
# The coaches share this code until igniter diverges; then drop igniter-coach from the list. Each
# keeps its own data, /etc/roadmap-coach.env (PUBLIC_URL, ADMIN_KEY) and Caddy site.
# First-time setup (container, Node 24, the coach user, /etc/roadmap-coach.env, the systemd unit
# and the Caddy site roadmap.zero2one.ee) is described in app/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."
targets=(${COACH_TARGETS:-roadmap-coach igniter-coach})
tarball=$(mktemp -t coach.XXXXXX)
trap 'rm -f "$tarball"' EXIT
COPYFILE_DISABLE=1 tar --exclude node_modules --exclude data -czf "$tarball" app web/report.ts web/roadmap.ts web/roadmap.template.html assets/vendor docs/emails
scp -q "$tarball" hetzner:/tmp/coach.tgz
for c in "${targets[@]}"; do
  echo "== $c"
  ssh hetzner "lxc file push -q /tmp/coach.tgz $c/tmp/coach.tgz &&
    lxc exec $c -- bash -c \"tar -xzf /tmp/coach.tgz -C /opt/roadmap-coach 2>/dev/null && rm /tmp/coach.tgz &&
      cd /opt/roadmap-coach/app && npm install --omit=dev --silent && systemctl restart roadmap-coach && sleep 2 &&
      systemctl is-active roadmap-coach && curl -s localhost:3000/health\""
  echo
done
ssh hetzner 'rm /tmp/coach.tgz'
