# Custom Caddy mit DNS-Provider-Plugins für ACME DNS-01 Challenge.
# Module: cloudflare + hetzner (matched die DDNS-Provider der App).
FROM caddy:2-builder AS builder

# DNS-Provider-Plugins für ACME DNS-01. Bewusst breit gewählt:
# Cloudflare + Hetzner matchen die DDNS-Provider; der Rest deckt die häufigsten
# europäischen + globalen Provider ab. Wer einen anderen Provider braucht, kann
# in der UI auf "Custom Caddyfile" wechseln und sein eigenes Caddyfile schreiben.
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare \
    --with github.com/caddy-dns/hetzner \
    --with github.com/caddy-dns/route53 \
    --with github.com/caddy-dns/digitalocean \
    --with github.com/caddy-dns/duckdns \
    --with github.com/caddy-dns/porkbun \
    --with github.com/caddy-dns/namecheap \
    --with github.com/caddy-dns/ionos \
    --with github.com/caddy-dns/netcup \
    --with github.com/caddy-dns/linode

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Default-Caddyfile außerhalb des /etc/caddy-Mounts ablegen — das Volume
# überschreibt sonst alles unter /etc/caddy beim ersten Start.
RUN mkdir -p /usr/share/caddy && \
    printf '%s\n' \
      '# Auto-generated default — Magic Frame schreibt das hier bei jeder Caddy-Config-Änderung neu.' \
      '{' \
      '    admin 0.0.0.0:2019' \
      '    auto_https off' \
      '}' \
      '' \
      ':80 {' \
      '    # header_up: sonst sieht die App keine Client-Adresse und verbucht' \
      '    # jeden Anmeldeversuch auf denselben Platzhalter — dann sperrt die' \
      '    # Sperre gegen Passwort-Raten den ganzen Haushalt statt des Angreifers.' \
      '    # {remote_host} ist die Gegenstelle, die Caddy tatsächlich angenommen' \
      '    # hat, also nicht durch einen mitgeschickten Header fälschbar.' \
      '    reverse_proxy app:3000 {' \
      '        header_up X-Real-IP {remote_host}' \
      '        header_up X-Forwarded-For {remote_host}' \
      '        header_up X-Forwarded-Proto {scheme}' \
      '    }' \
      '}' \
      > /usr/share/caddy/Caddyfile.default

# Bei jedem Start: wenn /etc/caddy/Caddyfile leer ist (= leeres Volume beim
# allerersten Boot), kopiere die Default-Variante rein. Damit startet der
# Container auch bevor die App je etwas geschrieben hat.
# Beim Boot: wenn das File fehlt ODER noch das vom Caddy-Base-Image stammt
# (= enthält nicht den "Auto-generated"-Marker den wir + die App nutzen),
# Default reinschreiben. Sobald die App eigene Configs schreibt, bleiben
# die bestehen. `Auto-generated` ist bewusst der robusterer Marker als
# der App-Name selbst — überlebt Rebranding ohne Volume-Clear.
ENTRYPOINT ["sh", "-c", "if [ ! -f /etc/caddy/Caddyfile ] || ! grep -q 'Auto-generated' /etc/caddy/Caddyfile 2>/dev/null; then cp /usr/share/caddy/Caddyfile.default /etc/caddy/Caddyfile; fi; exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile"]
