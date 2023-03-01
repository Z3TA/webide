echo "It's important that we don't switch to the latest version right away "
echo "as the running Node.JS scripts module version will break!"

CURRENT=$(node -v)

read -p "Current version is $CURRENT Press any key to install latest LTS or Ctrl+C to abort"

n install LTS
n $CURRENT

if [$(node -v) = $CURRENT]
then
  echo "Great, we are still on $CURRENT"
else
  echo "Ohh shit! Try to move back to $CURRENT"
fi
