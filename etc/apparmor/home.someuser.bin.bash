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
  %HOME%%USERNAME%/usr/bin/nodejs Px,
  %HOME%%USERNAME%/usr/share/npm/bin/npm-cli.js Px,

}
