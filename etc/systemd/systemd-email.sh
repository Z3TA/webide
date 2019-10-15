#!/bin/bash

#
#  Send error report
#  
#  cp etc/systemd/systemd-email.sh /usr/local/bin/
#  chmod 774 /usr/local/bin/systemd-email.sh
#
#  Test: systemctl start status-email-user@webide.service
#

echo "Sending report ..."

# Ubuntu has sendmail in /usr/sbin/

sendmail -t <<ERRMAIL
To: $1
From: systemd <root@$HOSTNAME>
Subject: $2
Content-Transfer-Encoding: 8bit
Content-Type: text/plain; charset=UTF-8

$(systemctl status --full "$2")
ERRMAIL
