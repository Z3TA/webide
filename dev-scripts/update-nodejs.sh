echo "It's important that we don't switch to the latest version right away "
echo "as the running Node.JS scripts module version will break!"

CURRENT=$(node -v)
LATEST=$(./get-latest-node-version.js)

if ["$CURRENT" = "$LATEST"]
then
  echo "Already running $LATEST" 
  exit 0
fi

read -p "Current version is $CURRENT Press any key to install $LATEST or Ctrl+C to abort"

n install $LATEST
n $CURRENT

if [$(node -v) = "$CURRENT"]
then
  echo "Great, we are still on $CURRENT (and can switch to $LATEST using n)"
else
  echo "Ohh shit! Try to move back to $CURRENT"
fi
