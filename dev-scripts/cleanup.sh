
# Delete all emoty files and folders from when we used chroot

dir=$1

echo "Cleaning $dir..."

[[ -z "$dir" ]] && { echo "Error: First argument should be a path to user home dir"; exit 1; }

find $dir -size 0 -delete -print
find $dir -empty -type d -delete -print
rm -rf $dir/etc/
rm -rf $dir/run/
