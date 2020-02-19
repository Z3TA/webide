#
# Run this script before making another snapshot
# sudo zfs snapshot rpool/home/userskeleton@base2
#
# Then send snapshot to prod server...
# If the fs do not exist:
# sudo zfs send rpool/home/userskeleton@base2 | ssh root@webide.se zfs recv ben/home/userskeleton
#
# If the fs already exist: (send incremental data)
# sudo zfs send -i rpool/home/userskeleton@base1 rpool/home/userskeleton@base2 | ssh root@webide.se zfs recv ben/home/userskeleton
#
# zfs list -t snapshot
#

dir=/home/userskeleton

rm $dir/.android/avd/Pixel_2_API_25.avd/*.lock
rm $dir/log/*
rm $dir/.webide/storage/__*
rm $dir/.webide/storage/state_*
rm $dir/.webide/storage/lastLogin
rm $dir/.webide/storage/loginCounter
rm $dir/.AndroidStudio3.5/system/log/*
rm -rf $dir/.dbus/
rm $dir/.bash_history
rm $dir/.emulator_console_auth_token
rm $dir/testfile.txt
rm -rf $dir/.local
