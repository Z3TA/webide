#
# Used for testing the editor within the cloud IDE itself
# Not intended for production use. (the production needs to be able to create new virutal machines, create ZFS file-systems etc)
#
# docker build -t cloudide --build-arg DOMAIN=d80.johan.webide.se --build-arg EMAIL=editor@webtigerteam.com .
# 
# docker start -v /home/johan/repo/jzedit/:/srv/webide/ -p 80:80 cloudide
# docker run -it -v /home/johan/repo/jzedit/:/srv/webide/ cloudide
# 
# Inside the container:
# cd /srv/webide/
# npm install
# ./adduser.js ltest1 123 -nozfs
# node server/server.js --hostname=1337.johan.webide.se -noguest -insidedocker
#
#

FROM ubuntu:18.04

RUN apt-get update
RUN apt-get install nodejs npm nano -y

ADD . /srv/webide/

WORKDIR /srv/webide/

RUN ./cloudide_install.sh ${DOMAIN} ${EMAIL} -test

RUN rm -rf /srv/webide
# Will be mounted when running the container

EXPOSE 80



# The image has no entry-point/CMD, you have to run the image and start the server manually!



