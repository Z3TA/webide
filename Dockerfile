#
# Used for testing the editor within the cloud IDE itself
# Not intended for production use. (the production needs to be able to create new virutal machines, create ZFS file-systems etc)
#
# docker build -t cloudide --build-arg DOMAIN=1337.johan.webide.se --build-arg EMAIL=editor@webtigerteam.com .
# 
# docker run -it -v /home/johan/repo/jzedit/:/srv/webide/ cloudide
# 
# Inside the container:
# cd /srv/webide/
# node server/server.js --hostname=1337.johan.webide.se -pp 80 -noguest
#
#

FROM ubuntu:18.04

RUN apt update
RUN apt install nodejs npm nano -y

#ADD . /srv/webide/

WORKDIR /srv/webide/

#RUN ./cloudide_install.js --hostname=${DOMAIN} --email=${EMAIL}

#RUN rm -rf /srv/webide
# Will be mounted when running the container

# The image has no entry-point/CMD, you have to run the image and start the server manually!
