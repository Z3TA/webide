#!/bin/sh

#
# Example firewall rules
# All ACCEPT rules need to come before DROP rules! 
# So copy these iptables commands into a "main" firewall script and run it at startup
# And don't forget about iptables6 !!! You need separate iptables rules for ipv6!
#
# Replace em2 with the name of your network device
#


#  allow incoming traffic from Internet that is a part of a connection we already allowed.
iptables -A INPUT -i em2 -m state --state ESTABLISHED,RELATED -j ACCEPT

# HTTP/HTTPS
iptables -A INPUT -i em2 -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -i em2 -p tcp --dport 443 -j ACCEPT

# Block users from sending e-mail (spam) except to known SMTP servers
iptables -A OUTPUT -p tcp -d 153.92.126.143 --dport 25 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 25 -j REJECT


