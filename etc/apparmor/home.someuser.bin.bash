#
# Apparmor manual:
# http://manpages.ubuntu.com/manpages/trusty/man5/apparmor.d.5.html
#

#include <tunables/global>

%HOME%%USERNAME%/bin/bash {

  signal receive set=hup peer=%HOME%%USERNAME%/bin/bash,
  signal send set=hup peer=%HOME%%USERNAME%/bin/bash,

  signal send set=hup peer=%HOME%%USERNAME%/usr/bin/node,
  signal send set=hup peer=%HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npm-cli.js,

  %HOME%%USERNAME%/ r,
  %HOME%%USERNAME%/** rwl,

  # Connect to other servers via ssh
  network,

  #/dev/tty rw,

  %HOME%%USERNAME%/usr/bin/hg Px,
  %HOME%%USERNAME%/usr/bin/git Px,
  %HOME%%USERNAME%/usr/bin/node Px,
  %HOME%%USERNAME%/usr/bin/bash Px,
  %HOME%%USERNAME%/usr/bin/npm ix,
  %HOME%%USERNAME%/usr/bin/env ix,
  %HOME%%USERNAME%/usr/bin/ssh ix,
  %HOME%%USERNAME%/usr/bin/ssh-keygen ix,
  %HOME%%USERNAME%/bin/ls ix,
  %HOME%%USERNAME%/bin/tar ix,
  %HOME%%USERNAME%/bin/gunzip ix,
  %HOME%%USERNAME%/bin/sh ix,
  %HOME%%USERNAME%/bin/gzip ix,
  %HOME%%USERNAME%/usr/bin/unzip ix,
  %HOME%%USERNAME%/usr/bin/unrar ix,
  %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npm-cli.js Px,
  %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npx-cli.js Px,
  %HOME%%USERNAME%/** Cx -> scripts,

  profile scripts {
    network,

    %HOME%%USERNAME%/ r,
    %HOME%%USERNAME%/** rwl,

    # Connecting to mySQL
    /run/mysqld/mysqld.sock rw,

    %HOME%%USERNAME%/usr/bin/hg Px,
    %HOME%%USERNAME%/usr/bin/git Px,
    %HOME%%USERNAME%/usr/bin/node Px,
    %HOME%%USERNAME%/usr/bin/bash Px,
    %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npm-cli.js Px,
    %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npx-cli.js Px,

    %HOME%%USERNAME%/usr/bin/ssh ix,

  }

}
