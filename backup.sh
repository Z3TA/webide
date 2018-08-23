
#
#

POOL=${1:-"ben"}
HOME=${2:-"/home/"}
BACKUP_FOLDER=${3:-"$(pwd)/backup/"}

[[ ${HOME} != "/"*"/" ]] &&  echo "$HOME directory must start and end with a slash!" && exit 1
[[ ${BACKUP_FOLDER} != "/"*"/" ]] &&  echo "$BACKUP_FOLDER directory must start and end with a slash!" && exit 1


mkdir $BACKUP_FOLDER

zpool status $POOL > /dev/null || exit 1

ZFS_LIST=$(zfs list)
ZFS_SNAPS=$(zfs list -t snapshot)

cd $HOME || exit 1

for D in *; do
    # for each directory that does not start with guest
    if [ -d "${D}" ] && [[ ${D} != "guest"* ]]; then
       FS="$POOL$HOME$D"

       # Skip folders that are not listed as a zfs file-system
       [[ $ZFS_LIST != *"$FS "* ]] && echo "Not a ZFS: $D" && continue
       
       SNAP="$FS@backup"

       # Destroy snapshot if it already exist
       [[ $ZFS_SNAPS == *"$SNAP "* ]] && zfs destroy $SNAP

       # Make new snapshop
       zfs snapshot $SNAP
       
       echo "Backing up $D"
       zfs send $SNAP | gzip > $BACKUP_FOLDER$D.gz
       
       #echo "${D}"
    fi
done


