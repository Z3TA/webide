#!/bin/bash

# todo: Make this into a Node.JS script

# Change SECRET here, certbot-manual-cleanup-hook.js and letsEncryptDns.js on the DNS master server
SECRET="changeme"
STAGE="before"
NAME="${CERTBOT_DOMAIN}"
VALUE="${CERTBOT_VALIDATION}"
# Change SERVER_URL to your DNS master server 
SERVER_URL="https://zetafiles.org/DNS/txt"
URL="$SERVER_URL?stage=$STAGE&name=$NAME&value=$VALUE&secret=$SECRET"

RESULT=$(curl $URL --silent)

# We might have to wait for the DNS to propagate
sleep 3

# Square brackets need spaces!
[[ "$RESULT" == "OK" ]] && exit 0

echo $RESULT
exit 1
