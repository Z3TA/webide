#!/bin/bash

# todo: Make this into a Node.JS script

# Change SECRET here, certbot-manual-auth-hook.js and letsEncryptDns.js on the DNS master server
SECRET="changeme"
STAGE="after"
NAME="${CERTBOT_DOMAIN}"
VALUE="${CERTBOT_VALIDATION}"
# Change SERVER_URL to your DNS master server 
SERVER_URL="https://zetafiles.org/DNS/txt"
URL="$SERVER_URL?stage=$STAGE&name=$NAME&value=$VALUE&secret=$SECRET"

RESULT=$(curl $URL --silent)

# Square brackets need spaces!
[[ "$RESULT" == "OK" ]] && exit 0

echo $RESULT
exit 1
