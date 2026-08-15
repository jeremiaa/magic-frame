ARG BUILD_FROM
FROM ${BUILD_FROM}

# Das App-Image ist alpine-basiert (node:20-alpine), deshalb apk. Die
# Binärdateien landen in /usr/bin, nicht im sonst üblichen
# /usr/lib/postgresql/<version>/bin — darauf verlässt sich run.sh.
# su-exec brauchen wir, weil Postgres nicht als root starten will.
# curl fehlte hier, und zwei Stellen in run.sh brauchen es: die Abfrage des
# veroeffentlichten Ports beim Supervisor und die Zeitzone. Beide scheiterten
# still — die Startseite zeigte dann immer 8098, auch wenn der Nutzer den Port
# unter "Netzwerk" umgelegt hatte, und niemand konnte sehen warum.
RUN apk add --no-cache postgresql16 postgresql16-client su-exec curl

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
