#!/bin/bash

# Only run this script if you want to install the editor as a cloud editor!


# exit when any command fails
set -e

# Same as "server_name" in nginx profile or "VirtualHost" on other web servers
HOSTNAME=$1 

# E-mail address for letsencrypt
ADMIN_EMAIL=$1 

if [ -z "$HOSTNAME" ]; then 
  echo "### First argument should be the host/domain"
  exit 1
fi

if [ -z "$ADMIN_EMAIL" ]; then 
  echo "### Second argument should be the admin email"
  exit 1
fi


	
apt-get update


# Make sure we are inside the webide root folder ...
# The following will crash the script if the files doesn't exist
chmod +x removeuser.js
chmod +x adduser.js


# Enabled package forwarding, needed for Linux network namespace bridges
sysctl net.ipv4.ip_forward=1


# Install some dependencies usually found in Ubuntu
apt-get install software-properties-common -y


#### WireGuard / VPN support
# Ubuntu 19.04 and earlier:
# Add the WireGuard repository
echo "#webide: Installing WireGuard for VPN support..."
#add-apt-repository ppa:wireguard/wireguard -y
# Ubuntu 17.10 and earlier:
# Update the list of available packages
apt-get update
# Install the tools and kernel module:
apt install wireguard openresolv -y


# Docker support

apt-get remove docker docker-engine docker.io containerd runc -y
apt-get install apt-transport-https ca-certificates curl gnupg-agent software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt-get update
apt-get install docker-ce-cli

curl -L "https://github.com/docker/compose/releases/download/1.25.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

mkdir -p /root/.ssh/
# Create private key for accessing docker VM's
apt-get install openssh-client -y
# Might give an error if this script is run a second time because the key already exist
yes '' | ssh-keygen -b 2048 -t rsa -f /root/.ssh/dockervm -q -N "" || true
chown root:root /root/.ssh/dockervm
chmod 700 /root/.ssh/dockervm



echo "#webide: Editing defaults"
sed -i "s/zeta@zetafiles.org/$ADMIN_EMAIL/g" ./server/default_settings.js
sed -i "s/webide.se/$HOSTNAME/g" ./server/default_settings.js



# Set hostname
echo $HOSTNAME > /etc/hostname


apt-get install systemd -y

# for sending error reports
# edit the service you want emails for and add OnFailure=status-email-user@%n.service to the [Unit] section. 
# %n passes the unit's name to the template.
echo "#webide: Installing status-email-user@.service"
apt-get install sendmail -y
cp etc/systemd/systemd-email.sh /usr/local/bin/
chmod 774 /usr/local/bin/systemd-email.sh

cp ./etc/systemd/status-email-user@.service /etc/systemd/system/status-email-user@.service
sed -i "s/zeta@zetafiles.org/$ADMIN_EMAIL/g" /etc/systemd/system/status-email-user@.service
systemctl enable status-email-user@.service



# Install the cloud-IDE service that runs server/server.js
echo "#webide: Installing webide.service
cp etc/systemd/webide.service /etc/systemd/system/webide.service
sed -i "s/webide.se/$HOSTNAME/g" /etc/systemd/system/webide.service
sed -i "s/zeta@zetafiles.org/$ADMIN_EMAIL/g" /etc/systemd/system/webide.service
systemctl enable webide


# Signup service to let users signup
# If you enable automatic signup you probably also want to edit client/signup/signup.htm
echo "#webide: Installing webide_signup.service"
echo "#webide: Automatic signup available at: http://$HOSTNAME/signup/signup.htm
cp etc/systemd/webide_signup.service /etc/systemd/system/webide_signup.service
sed -i "s/webide.se/$HOSTNAME/g" /etc/systemd/system/webide_signup.service
systemctl enable webide_signup


# Install Service that let users run nodejs micro-services
echo "#webide: Installing webide_nodejs_init.service"
cp etc/systemd/webide_nodejs_init.service /etc/systemd/system/webide_nodejs_init.service
systemctl enable webide_nodejs_init


# Install Nginx (needed to let users have their own home page under user.yourdomain.com)
echo "#webide: Installing Nginx"
apt-get install nginx -y



if [[ "$*" == *-test* ]]
then
    echo "#webide: Installing test nginx conf"
    cp etc/nginx/webide-dev.se.nginx /etc/nginx/sites-available/$HOSTNAME.nginx
    sed -i "s/webide-dev.se/$HOSTNAME/g" /etc/nginx/sites-available/$HOSTNAME.nginx
else
    echo "#webide: Installing production nginx conf"
    cp etc/nginx/webide.se.nginx /etc/nginx/sites-available/$HOSTNAME.nginx
    sed -i "s/webide.se/$HOSTNAME/g" /etc/nginx/sites-available/$HOSTNAME.nginx
fi

ln -sf /etc/nginx/sites-available/" + HOSTNAME + ".nginx  /etc/nginx/sites-enabled/$HOSTNAME


echo "#webide: Installing signup.$HOSTNAME.nginx config"
cp etc/nginx/signup.webide.se.nginx /etc/nginx/sites-available/signup.$HOSTNAME.nginx
sed -i "s/webide.se/$HOSTNAME/g" /etc/nginx/sites-available/signup.$HOSTNAME.nginx
ln -sf /etc/nginx/sites-available/signup.$HOSTNAME.nginx  /etc/nginx/sites-enabled/signup.$HOSTNAME

echo "#webide: Adding default Nginx config"
cp etc/nginx/default.nginx /etc/nginx/sites-available/default

service nginx reload

echo "#webide: Installing logrotate script for nginx log files"
ln -sf $(pwd)/etc/nginx/nginx.logrotate.conf /etc/logrotate.d/nginx.logrotate.conf


echo "#webide: Installing VNC dependencies"
apt-get install xvfb x11vnc socat -y


echo "#webide: Installing Mercurial"
apt install mercurial -y


echo "#webide: Installing hggit for Mercruial"
apt-get install python-pip -y
# Fix problems with Python
apt -f install -y
# Yes, again, because of Python issues
apt-get install python-pip -y
pip install hg-git


echo "#webide: Installing Letsencrypt's certbot"
apt-get install software-properties-common -y
add-apt-repository ppa:certbot/certbot -y
apt-get update
apt-get install python-certbot-nginx -y


echo "#webide: Installing archive extractor utilities"
apt-add-repository multiverse && apt-get update
apt-get install zip unzip unrar -y

echo "#webide: Installing CGSF dependencies"
apt-get install fuse -y


echo "#webide: Installing MySQL server"
apt-get install mysql-server -y
apt-get install mysql-client -y

echo "#webide: Configuring MySQL server"
sed  '/\[mysqld\]/a \nplugin-load-add=auth_socket.so\nauth_socket=FORCE_PLUS_PERMANENT\n' /etc/my.cnf


# So that users cant list other user's files
chmod 711 /home

# Able to run: setfacl -m u:username:rwx /dev/kvm
apt-get install acl -y

# Allow ip forwarding so that users in netns can talk to the Internet
sysctl -w net.ipv4.ip_forward=1


# Install KVM support
apt-get install qemu-kvm libvirt-clients libvirt-daemon-system bridge-utils virt-manager -y

# Don't let normal users see the guts
chmod 771 /srv


echo "#webide: Finish!"

echo "You might need to edit the following files:"
echo "/etc/nginx/sites-available/$HOSTNAME.nginx"
echo "/etc/nginx/sites-available/signup.$HOSTNAME.nginx"
echo "$(pwd)/default.js"
echo ""
echo "then run systemctl reload nginx"
echo "(use nginx -T to check for errors)"

