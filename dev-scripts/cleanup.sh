
# Delete all emoty files and folders from when we used chroot

dir=$1

find $dir -size 0 -delete -print
find $dir -empty -type d -delete -print

