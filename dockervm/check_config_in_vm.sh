#!/bin/bash

#
# This script needs to be run after every reboot!
#

# Exit if anything fails
set -e

[[ $SUDO_USER -eq "docker" ]] || { echo >&2 "This script should only be run inside a Docker VM"; exit 1; }


username=$1
uid=$2
gid=$3
#IP=$4
#GW=$5

# Assuming home directories are in /home
homedir="/home/$username/"

echo "username=$username";
echo "uid=$uid";
echo "gid=$gid";
echo "homedir=$homedir";
#echo "IP=$IP";
#echo "GW=$GW";

# Set the hostname
hostname docker-$username
echo docker-$username > /etc/hostname

echo "Activating Docker user namespace and binding to TCP..."
useradd -u $uid $username || (echo "user $username already exist!")
echo "$username:$uid:65536" > /etc/subuid
echo "$username:$gid:65536" > /etc/subgid
mkdir -p /etc/systemd/system/docker.service.d/
echo "[Service]" > /etc/systemd/system/docker.service.d/startup_options.conf
# Need two ExecStart or Docker will say "Service has more than one ExecStart=" :P
echo "ExecStart=" >> /etc/systemd/system/docker.service.d/startup_options.conf
echo "ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2376 --userns-remap $username" >> /etc/systemd/system/docker.service.d/startup_options.conf
systemctl daemon-reload
systemctl restart docker


# Mount the user home dir
echo "mounting $username home dir..."
mkdir -p $homedir
(mount userhome $homedir -t 9p -o trans=virtio) || (echo "mount failed"; exit 1)

# Set static IP
#ip addr add $IP/16 dev ens3

# todo: Make it so the Docker VM can use the same VPN as the user (netns)
# Maybe helpful: https://superuser.com/questions/1230206/route-vm-traffic-through-vpn-but-not-host-traffic

#route add default gw $GW ens3

echo "SUCCESS!"

