
# Runs URL in "app mode": with no browser toolbars.

URL="file://$(pwd)/index.htm"

chromium-browser --app=$URL
