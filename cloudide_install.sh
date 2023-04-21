#!/bin/bash

# Only run this script if you want to install the editor as a cloud editor!
# Unless you are feeling lucky - you should go though these steps manually one by one
# Feel free to create a cloudide_install_archdist.sh 

# Change this to your timezone:
TZ=Europe/Stockholm
ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Change this to a SMTP-server host (for example postfix. Can run locally) 
SMTP_SERVER=zetafiles.org
SMTP_PORT=255

# exit when any command fails
set -e

# Don't ask questions in the pty
DEBIAN_FRONTEND=noninteractive

# Same as "server_name" in nginx profile or "VirtualHost" on other web servers
HOSTNAME=$1 

# E-mail address for letsencrypt
ADMIN_EMAIL=$2

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


echo "#webide: Installing MySQL server"
apt-get install mariadb-server -y
apt-get install mariadb-client -y

echo "#webide: Configuring MySQL server"
#sed '/\[mysqld\]/a \nplugin-load-add=auth_socket.so\nauth_socket=FORCE_PLUS_PERMANENT\n' /etc/mysql/my.cnf
# Ubunt 20 or MySQL 8 moved settings to /etc/mysql/mysql.conf.d/mysqld.cnf
sed '/\[mysqld\]/a \nplugin-load-add=auth_socket.so\nauth_socket=FORCE_PLUS_PERMANENT\n' /etc/mysql/mariadb.conf.d/50-server.cnf

# So that users cant list other user's files
chmod 711 /home

# Able to run: setfacl -m u:username:rwx /dev/kvm
apt-get install acl -y


# Install KVM support
apt-get install qemu-kvm libvirt-clients libvirt-daemon-system bridge-utils virt-manager -y

# Don't let normal users see the guts
chmod 771 /srv

# Install tools for debugging
apt-get install dnsutils -y


echo "#webide: Installing archive extractor utilities"
apt-add-repository multiverse && apt-get update
apt-get install zip -y
apt-get install unzip -y
apt-get install unrar -y || true
apt-get install unrar-free -y || true

echo "#webide: Installing CGSF dependencies"
apt-get install fuse -y



# Allow ip forwarding so that users in netns can talk to the Internet
sysctl -w net.ipv4.ip_forward=1 || true


# Enabled package forwarding, needed for Linux network namespace bridges
sysctl net.ipv4.ip_forward=1 || true


# Install some dependencies usually found in Ubuntu
apt-get install software-properties-common -y

# Some packages usually missing in Docker container
apt-get install iptables iproute2 iputils-ping -y


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


echo "#webide: Editing defaults"
if [[ "$*" != *-test* ]]; then
  sed -i "s/zeta@zetafiles.org/$ADMIN_EMAIL/g" ./server/default_settings.js
  sed -i "s/webide.se/$HOSTNAME/g" ./server/default_settings.js
fi


# Set hostname
#echo $HOSTNAME > /etc/hostname


apt-get install systemd -y

# for sending error reports
# edit the service you want emails for and add OnFailure=status-email-user@%n.service to the [Unit] section. 
# %n passes the unit's name to the template.
echo "#webide: Installing status-email-user@.service"
apt-get install ssmtp -y
echo "mailhub=z$SMTP_SERVER:$SMTP_PORT" >> /etc/ssmtp/ssmtp.conf
cp etc/systemd/systemd-email.sh /usr/local/bin/
chmod 774 /usr/local/bin/systemd-email.sh

cp ./etc/systemd/status-email-user@.service /etc/systemd/system/status-email-user@.service
sed -i "s/zeta@zetafiles.org/$ADMIN_EMAIL/g" /etc/systemd/system/status-email-user@.service
systemctl enable status-email-user@.service



# Install the cloud-IDE service that runs server/server.js
echo "#webide: Installing webide.service"
cp etc/systemd/webide.service /etc/systemd/system/webide.service
sed -i "s/webide.se/$HOSTNAME/g" /etc/systemd/system/webide.service
sed -i "s/zeta@zetafiles.org/$ADMIN_EMAIL/g" /etc/systemd/system/webide.service
systemctl enable webide
# systemctl daemon-reload

# Signup service to let users signup
# If you enable automatic signup you probably also want to edit client/signup/signup.htm
echo "#webide: Installing webide_signup.service"
echo "#webide: Automatic signup available at: http://$HOSTNAME/signup/signup.htm"
cp etc/systemd/webide_signup.service /etc/systemd/system/webide_signup.service
sed -i "s/webide.se/$HOSTNAME/g" /etc/systemd/system/webide_signup.service
systemctl enable webide_signup


# Install Service that let users run nodejs micro-services
echo "#webide: Installing webide_nodejs_init.service"
cp etc/systemd/webide_nodejs_init.service /etc/systemd/system/webide_nodejs_init.service
systemctl enable webide_nodejs_init


# Install Node.js ( just so we can then install n )
apt install curl -y
curl -sL https://deb.nodesource.com/setup_18.x | bash -
apt update && apt install -y nodejs


# Allow users to swtich between Node.js versions
npm install -g n
#chmod 700 /usr/lib/node_modules/n/bin/n
n 0
n 10
n 12
n 14
n 16
n 18

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

ln -sf /etc/nginx/sites-available/$HOSTNAME.nginx  /etc/nginx/sites-enabled/$HOSTNAME

if [[ "$*" != *-test* ]]; then
  echo "#webide: Installing signup.$HOSTNAME.nginx config"
  cp etc/nginx/signup.webide.se.nginx /etc/nginx/sites-available/signup.$HOSTNAME.nginx
  sed -i "s/webide.se/$HOSTNAME/g" /etc/nginx/sites-available/signup.$HOSTNAME.nginx
  ln -sf /etc/nginx/sites-available/signup.$HOSTNAME.nginx  /etc/nginx/sites-enabled/signup.$HOSTNAME
fi

echo "#webide: Adding default Nginx config"
cp etc/nginx/default.nginx /etc/nginx/sites-available/default

service nginx reload || true


nginx -T || true
echo
echo "Don't forget to generate the certificates!"
echo


echo "#webide: Installing logrotate script for nginx log files"
ln -sf $(pwd)/etc/nginx/nginx.logrotate.conf /etc/logrotate.d/nginx.logrotate.conf


echo "#webide: Installing VNC dependencies"
apt-get install xvfb x11vnc socat -y


echo "#webide: Installing Mercurial"
apt-get install mercurial -y

echo "#webide: Installing Git"
apt-get install git -y

echo "#webide: Installing Python"
apt-get install python -y

echo "#webide: Installing hggit for Mercruial"
apt-get install python-pip -y || true
# Fix problems with Python
apt -f install -y
# Yes, again, because of Python issues
apt-get install python-pip -y || true
# For Ubuntu 20
apt-get install python3-pip -y

pip install hg-git
# Ubuntu 18 and earlier
apt-get install python-brotli -y || true
# Ubuntu 20
# todo: python-brotli does not exist in Ubuntu 20 ! Will hggit work!?

# The official hggit package seem to be broken. Install directly from source:
cd /tmp/
hg clone https://foss.heptapod.net/mercurial/hg-git/
cd hg-git
python3 -m pip install .
# todo: test the above line (it has not been tested)!

echo "#webide: Installing Letsencrypt's certbot"
# For Ubuntu 18 and earlier
#apt-get install software-properties-common -y
#add-apt-repository ppa:certbot/certbot -y
#apt-get update
#apt-get install python-certbot-nginx -y

# For Ubuntu 20
apt-get install certbot python3-certbot-nginx -y

# So that users can only see their own home dir
chmod 751 /home

# For testing the "local desktop"
apt-get install x11-apps -y


echo "#webide: Finish!"

echo "You might need to edit the following files:"
echo "/etc/nginx/sites-available/$HOSTNAME.nginx"
echo "/etc/nginx/sites-available/signup.$HOSTNAME.nginx"
echo "$(pwd)/default.js"
echo ""
echo "systemctl reload nginx"
echo "(use nginx -T to check for errors)"
echo ""
echo "(The nginx profile expects the top level domain (TLD) cert to live in /etc/ssl/certs/letsencrypt/ and /etc/ssl/private/ "
echo " because you probably want to control the TLD from the Letsencrypt DNS challange server... )"
echo ""
echo "npm install"
echo ""
echo "You have to setup the following features manually:"
echo " * Docker (see docs.docker.com) only install docker-ce-cli !"
echo " * Docker daemon base VM (see README.txt)"
echo " * userdir_skeleton (see README.txt)"
echo " * Firewall (see etc/systemd/custom_iptables.service)"
echo " * Letsencrypt DNS challange server (see letsencrypt folder in webide repo)"
echo " * Setup rsyslogd (see README.txt)"
exit 0