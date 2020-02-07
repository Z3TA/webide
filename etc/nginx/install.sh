#!/bin/bash

#
# Domain as first argument 
# Copies nginx config to /etc/sites-available/
#
# Run with -nossl to not use HTTPS certificates
#

DOMAIN=${1?First argument need to be a domain name}

echo "DOMAIN=$DOMAIN"

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root" 
   exit 1
fi

cp -v ./default.nginx /etc/nginx/sites-available/
cp -v ./webide.se.nginx /etc/nginx/sites-available/$DOMAIN.nginx
cp -v ./signup.webide.se.nginx /etc/nginx/sites-available/signup.$DOMAIN.nginx

sed -i "s/webide.se/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN.nginx
sed -i "s/webide.se/$DOMAIN/g" /etc/nginx/sites-available/signup.$DOMAIN.nginx

removeSSL () {

  sed -i "s/listen 443/#listen 443/g" $1
  sed -i "s/listen \[::\]:443/#listen \[::\]:443/g" $1
  sed -i "s/ssl_certificate/#ssl_certificate/g" $1
  sed -i "s/ssl_certificate_key/#ssl_certificate_key/g" $1

  sed -i '/# Redirect to https:/,+6d' $1

		sed -i "s/https:/http:/g" $1

  echo "Removed SSL from $1"
}

if [[ "$@" =~ "-nossl" ]]; then

  removeSSL "/etc/nginx/sites-available/$DOMAIN.nginx"
  removeSSL "/etc/nginx/sites-available/signup.$DOMAIN.nginx"

fi

if [[ "$@" =~ "-dev" ]]; then

  sed -i '/# Serve the bundle/,+6d' /etc/nginx/sites-available/$DOMAIN.nginx
  
  echo "Not serving bundle!"

fi 

ln -s /etc/nginx/sites-available/$DOMAIN.nginx /etc/nginx/sites-enabled/$DOMAIN
ln -s /etc/nginx/sites-available/signup.$DOMAIN.nginx /etc/nginx/sites-enabled/signup.$DOMAIN

service nginx reload

echo 'Run "sudo nginx -T" if  you get any Nginx errors'



