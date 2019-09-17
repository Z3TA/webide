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
  %HOME%%USERNAME%/** mr,
  owner %HOME%%USERNAME%/** wl,

  %HOME%%USERNAME%/dev/null rw,

  # Connect to other servers via ssh
  network,

  # Many scripts wants to access urandom ... For example when doing a SSL handshake!?
  /dev/urandom r,

  # bins that have their own profile
  %HOME%%USERNAME%/usr/bin/hg Px,
  %HOME%%USERNAME%/usr/bin/git Px,
  %HOME%%USERNAME%/usr/bin/node Px,
  %HOME%%USERNAME%/usr/bin/bash Px,
  %HOME%%USERNAME%/usr/bin/python Px,
  %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npm-cli.js Px,
  %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npx-cli.js Px,

  # bins without profile
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

  # other bins
  %HOME%%USERNAME%/** Cx -> scripts,

  # this profile should be more restrictive, otherwise put the bin as ix above
  profile scripts {
    deny %HOME%%USERNAME%/usr/** wl,
    deny %HOME%%USERNAME%/bin/** wl,
    deny %HOME%%USERNAME%/proc/** wl,
    deny %HOME%%USERNAME%/lib/** wl,
    deny %HOME%%USERNAME%/lib64/** wl,

    # Restrict network access! Only allow unix sockets
    network unix,

    %HOME%%USERNAME%/ r,
    %HOME%%USERNAME%/** mr,
    owner %HOME%%USERNAME%/** rwl,

    # /dev/null is often used
    %HOME%%USERNAME%/dev/null rw,
    /dev/urandom r,

    # Connecting to mySQL
    /run/mysqld/mysqld.sock rw,

    # bins that have their own profile
    %HOME%%USERNAME%/usr/bin/hg Px,
    %HOME%%USERNAME%/usr/bin/git Px,
    %HOME%%USERNAME%/usr/bin/node Px,
    %HOME%%USERNAME%/usr/bin/bash Px,
    %HOME%%USERNAME%/usr/bin/python Px,
    %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npm-cli.js Px,
    %HOME%%USERNAME%/usr/lib/node_modules/npm/bin/npx-cli.js Px,

    # Scripts of scripts
    %HOME%%USERNAME%/usr/bin/** ix,
    %HOME%%USERNAME%/bin/** ix,
    %HOME%%USERNAME%/usr/lib/node_modules/npm/** ix,
    %HOME%%USERNAME%/usr/share/npm/bin/** ix,

  }

}
