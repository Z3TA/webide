
# 
# Change the domain to a server you have access to
# 

# Make sure the folder containing the script is the working dir
cd $(dirname $0)

# Sync the parent dir (because this file is in dev-scripts/
rsync -aPz ../ root@harry.100m.se:/root/backup/webide/
