#
# Apparmor manual:
# http://manpages.ubuntu.com/manpages/trusty/man5/apparmor.d.5.html
#

#include <tunables/global>

%HOME%%USERNAME%/bin/bash {

  %HOME%%USERNAME%/ r,
  %HOME%%USERNAME%/** rw,

  #/dev/tty rw,

  %HOME%%USERNAME%/usr/bin/hg Px,
  %HOME%%USERNAME%/usr/bin/node Px,
  %HOME%%USERNAME%/usr/bin/bash Px,
  %HOME%%USERNAME%/usr/bin/npm ix,
  %HOME%%USERNAME%/usr/bin/env ix,
  %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npm-cli.js Px,

}
