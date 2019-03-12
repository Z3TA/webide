#
# Apparmor manual:
# http://manpages.ubuntu.com/manpages/trusty/man5/apparmor.d.5.html
#

#include <tunables/global>

%HOME%%USERNAME%/bin/bash {

  # Just in case (deny overrides allow)
  deny %HOME%%USERNAME%/usr/** wl,
  deny %HOME%%USERNAME%/bin/** wl,
  deny %HOME%%USERNAME%/proc/** wl,
  deny %HOME%%USERNAME%/lib/** wl,
  deny %HOME%%USERNAME%/lib64/** wl,

  # New in ubuntu 18
  %HOME%%USERNAME%/lib/** mr,
  %HOME%%USERNAME%/lib64/** mr,
  %HOME%%USERNAME%/usr/** mr,
  %HOME%%USERNAME%/bin/** mr,

  signal receive set=hup peer=%HOME%%USERNAME%/bin/bash,
  signal send set=hup peer=%HOME%%USERNAME%/bin/bash,

  signal send set=hup peer=%HOME%%USERNAME%/usr/bin/node,
  signal send set=hup peer=%HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npm-cli.js,

  %HOME%%USERNAME%/ r,
  owner %HOME%%USERNAME%/** rwl,

  # Connect to other servers via ssh
  network,

  #/dev/tty rw,

  %HOME%%USERNAME%/usr/bin/hg Px,
  %HOME%%USERNAME%/usr/bin/git Px,
  %HOME%%USERNAME%/usr/bin/node Px,
  %HOME%%USERNAME%/usr/bin/bash Px,
  %HOME%%USERNAME%/usr/bin/python Px,
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

  # pty in Ubuntu 18
  %HOME%%USERNAME%/lib/x86_64-linux-gnu/** mr,

  profile scripts {
    network,

    deny %HOME%%USERNAME%/usr/** wl,
    deny %HOME%%USERNAME%/bin/** wl,
    deny %HOME%%USERNAME%/proc/** wl,
    deny %HOME%%USERNAME%/lib/** wl,
    deny %HOME%%USERNAME%/lib64/** wl,

    %HOME%%USERNAME%/ r,
    owner %HOME%%USERNAME%/** rwl,

    %HOME%%USERNAME%/lib/** mr,
    %HOME%%USERNAME%/lib64/** mr,
    %HOME%%USERNAME%/usr/** mr,
    %HOME%%USERNAME%/bin/** mr,


    # Connecting to mySQL
    /run/mysqld/mysqld.sock rw,

    %HOME%%USERNAME%/bin/bash Px,

    %HOME%%USERNAME%/usr/bin/hg Px,
    %HOME%%USERNAME%/usr/bin/git Px,
    %HOME%%USERNAME%/usr/bin/node Px,

    %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npm-cli.js Px,
    %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npx-cli.js Px,

    %HOME%%USERNAME%/usr/bin/ssh ix,

    # pty in Ubuntu 18
    %HOME%%USERNAME%/lib/x86_64-linux-gnu/** mr,

  }

}
