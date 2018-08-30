#!/bin/bash

SECRET="changeme"
STAGE="after"
NAME="${CERTBOT_DOMAIN}"
VALUE="${CERTBOT_VALIDATION}"
SERVER_URL="https://zetafiles.org/DNS/txt"
URL="$SERVER_URL?stage=$STAGE&name=$NAME&value=$VALUE&secret=$SECRET"

RESULT=$(curl $URL --silent)

# Square brackets need spaces!
[[ "$RESULT" == "OK" ]] && exit 0

echo $RESULT
exit 1
