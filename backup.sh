#!/bin/bash

#
# This is an example script for backing up the user files when running the editor as a cloud IDE
# It asumes the user directories are ZFS file systems
# Send the files to at least one other server!!
#
# Use example:
# sudo crontab -e
# 30 2 * * * ssh user@server "bash /path/to/jzedit/backup.sh pool /home/ /somewhere/backup/" && scp user@server:/somewhere/backup/* /local/backup/directory/
#
# How to recover from a backup:
# gunzip -c /path/to/user.gz | ssh root@server.hostname zfs recv pool/home/user
# 
#

POOL=${1:-"tank"}
HOME=${2:-"/home/"}
BACKUP_FOLDER=${3:-"$(pwd)/backup/"}

echo "POOL=$POOL"
echo "HOME=$HOME"
echo "BACKUP_FOLDER=$BACKUP_FOLDER"

[[ ${HOME} != "/"*"/" ]] &&  echo "$HOME directory must start and end with a slash!" && exit 1
[[ ${BACKUP_FOLDER} != "/"*"/" ]] &&  echo "$BACKUP_FOLDER directory must start and end with a slash!" && exit 1

mkdir $BACKUP_FOLDER

zpool status $POOL > /dev/null || exit 1

ZFS_LIST=$(zfs list)
ZFS_SNAPS=$(zfs list -t snapshot)

cd $HOME || exit 1

for USER in *; do
    if [ -d "${USER}" ] && [[ ${USER} != "guest"* ]]; then
       FS="$POOL$HOME$USER"

       # Skip folders that are not listed as a zfs file-system
       [[ $ZFS_LIST != *"$FS "* ]] && echo "Not a ZFS: $USER" && continue
       
       SNAP="$FS@backup"

       # Destroy snapshot if it already exist
       [[ $ZFS_SNAPS == *"$SNAP "* ]] && zfs destroy $SNAP

       # Make new snapshop
       zfs snapshot $SNAP
       
       echo "Backing up $USER"
       zfs send $SNAP | gzip > $BACKUP_FOLDER$USER.gz
       
       #echo "${D}"
    fi
done


