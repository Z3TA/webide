#
# Used for testing the editor within the cloud IDE itself
# Not intended for production use. (the production needs to be able to create new virutal machines, create ZFS file-systems etc)
#
# docker build -t cloudide --build-arg DOMAIN=d80.johan.webide.se --build-arg EMAIL=editor@webtigerteam.com .
# 
# if we got Nginx to work: (would need dedicated IP inside clooud ide, todo: give each user their own IPv6 and allow tcp/udp)
# docker run -v /home/johan/repo/jzedit/:/srv/webide/ -p 80:80 cloudide
# Without Nginx (jush a bash shell)
# docker run -it -v /home/johan/repo/jzedit/:/srv/webide/ -p 80:80 cloudide
# 
# Inside the container:
# cd /srv/webide/
# npm install
# ./adduser.js ltest1 123 -nozfs
# ip a
# node server/server.js --hostname=d80.johan.webide.se -noguest -insidedocker -pp 80 --port=80 -ip 172.17.0.2
# Access from: https://d80.johan.webide.se/
#

# FROM must be the first instruction!
FROM ubuntu:18.04

ARG DOMAIN=d80.johan.webide.se
ENV DOMAIN=${DOMAIN}

ARG EMAIL=editor@webtigerteam.com
ENV EMAIL=${EMAIL}

RUN apt-get update
RUN apt-get install nodejs npm nano -y

ADD . /srv/webide/

WORKDIR /srv/webide/

RUN ./cloudide_install.sh ${DOMAIN} ${EMAIL} -test

RUN rm -rf /srv/webide
# Will be mounted when running the container

EXPOSE 80

#CMD ["nginx", "-g", "daemon off;"]

# docker exec -it cloudide bash
# or without Nginx:
# docker run -it -v /home/johan/repo/jzedit/:/srv/webide/ -p 80:80 cloudide

