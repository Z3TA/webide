#
# Used for testing the editor within the cloud IDE itself
# Not intended for production use. (the production needs to be able to create new virutal machines, create ZFS file-systems etc)
#
# docker build -t cloudide --build-arg DOMAIN=d80.$(whoami).webide.se --build-arg EMAIL=editor@webtigerteam.com .
# 
# if we got Nginx to work: (would need dedicated IP inside clooud ide, todo: give each user their own IPv6 and allow tcp/udp)
# docker run -v /home/$(whoami)/repo/jzedit/:/srv/webide/ -p 80:80 cloudide
# Without Nginx (jush a bash shell)
# docker run -it -v /home/$(whoami)/repo/jzedit/:/srv/webide/ -p 80:80 cloudide
# 
# Inside the container:
# ip a
# (take note of the ip and change it below)
# node server/server.js --hostname=d80.johan.webide.se -noguest -insidedocker -nonginx -pp 80 --port=80 -ip 172.17.0.2
# Access from: https://d80.johan.webide.se/
#
# Before running tests: Run ssh-keygen in the "d80.johan.webide.se" terminal (not docker) and cat /home/ltest1/.ssh/id_rsa.pub - then add the ssh public key to the Github test account
# 
# hint: EDITOR.changeWorkingDir("/home/ltest1/wwwpub/");
#

# FROM must be the first instruction!
#FROM ubuntu:bionic
FROM debian:11.3

ARG DOMAIN=d80.johan.webide.se
ENV DOMAIN=${DOMAIN}

ARG EMAIL=editor@webtigerteam.com
ENV EMAIL=${EMAIL}

RUN apt-get update
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get update
RUN apt-get install curl gcc g++ make -y
RUN apt-get install nano -y
RUN apt-get install git -y

RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get update
RUN apt-get install -y nodejs


ADD . /srv/webide/

WORKDIR /srv/webide/

RUN ./cloudide_install.sh ${DOMAIN} ${EMAIL} -test

RUN ./adduser.js ltest1 123 -nozfs

RUN echo true > /home/ltest1/.webide/storage/jsx

RUN rm -rf /srv/webide
# Will be mounted when running the container

EXPOSE 80

#CMD ["nginx", "-g", "daemon off;"]

# docker exec -it cloudide bash
# or without Nginx:
# docker run -it -v /home/$(whoami)/repo/jzedit/:/srv/webide/ -p 80:80 cloudide

