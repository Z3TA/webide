#!/bin/bash

#
# This script needs to be run after every reboot!
#

# Exit if anything fails
set -e

[[ $SUDO_USER -eq "docker" ]] || { echo >&2 "This script should only be run inside a Docker VM"; exit 1; }


USERNAME=$1
HNAME=$
#IP=$2
#GW=$3

# Assuming home directories are in /home
HOMEDIR="/home/$USERNAME/"

echo "USERNAME=$USERNAME";
echo "HOMEDIR=$HOMEDIR";
#echo "IP=$IP";
#echo "GW=$GW";

# Set the hostname
echo docker_$USERNAME > /etc/hostname

# Mount the user home dir
echo "mounting $USERNAME home dir..."
mkdir -p $HOMEDIR
(mount userhome $HOMEDIR -t 9p -o trans=virtio) || (echo "mount failed"; exit 1)

# Set static IP
#ip addr add $IP/16 dev ens3

# todo: Make it so the Docker VM can use the same VPN as the user (netns)
# Maybe helpful: https://superuser.com/questions/1230206/route-vm-traffic-through-vpn-but-not-host-traffic

#route add default gw $GW ens3

echo "SUCCESS!"

