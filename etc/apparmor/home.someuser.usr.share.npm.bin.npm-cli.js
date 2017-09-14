#include <tunables/global>

/home/%USERNAME%/usr/share/npm/bin/npm-cli.js {

  signal receive set=abrt peer=/home/%USERNAME%/usr/share/npm/bin/npm-cli.js,
  signal receive set=hup peer=/usr/bin/nodejs_%USERNAME%,
  signal receive set=int peer=/home/%USERNAME%/usr/bin/nodejs,
  signal receive set=int peer=/usr/bin/nodejs_%USERNAME%,
  signal receive set=kill peer=/usr/bin/nodejs_%USERNAME%,
  signal receive set=quit peer=/usr/bin/nodejs_%USERNAME%,
  signal receive set=rtmin+1 peer=/usr/bin/nodejs_%USERNAME%,
  signal receive set=term peer=/usr/bin/nodejs_%USERNAME%,
  
  signal send set=abrt peer=/home/%USERNAME%/usr/share/npm/bin/npm-cli.js,
  signal send set=int peer=/home/%USERNAME%/usr/bin/nodejs,
  signal send set=rtmin+1 peer=/home/%USERNAME%/usr/bin/nodejs,
  
  deny capability dac_override,
  deny capability dac_read_search,

  network,

  #/dev/tty rw,

  /home/%USERNAME%/ r,
  /home/%USERNAME%/** rw,

    /home/%USERNAME%/usr/local/** rw,
    
  /usr/bin/nodejs ix,

}
