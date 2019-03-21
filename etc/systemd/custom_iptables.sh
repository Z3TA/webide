#!/bin/bash

#
#  Rules for ACCEPT should always be placed before DROP or REJECT!
#
#


# Reset
iptables -F
ip6tables -F

# Set default chain policies
ip6tables -P INPUT ACCEPT
iptables -P INPUT ACCEPT

ip6tables -P FORWARD ACCEPT
iptables -P FORWARD ACCEPT

ip6tables -P OUTPUT ACCEPT
iptables -P OUTPUT ACCEPT


# Accept already astablished connections

ip6tables -A INPUT -m conntrack -j ACCEPT --ctstate RELATED,ESTABLISHED
iptables -A INPUT -m conntrack -j ACCEPT --ctstate RELATED,ESTABLISHED

ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

ip6tables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT


# Accept all ICMP packets. 
ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
iptables -A INPUT -p icmp -j ACCEPT

ip6tables -A OUTPUT -p ipv6-icmp -j ACCEPT
iptables -A OUTPUT -p icmp -j ACCEPT


# Accept all traffic from/to the local interface:
ip6tables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT

ip6tables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT


# Accept DHCP traffic. 
ip6tables -A INPUT -d fe80::/64 -p udp -m udp --dport 546 -m state --state NEW -j ACCEPT
iptables -A INPUT -p udp --dport 67:68 --sport 67:68 -j ACCEPT

ip6tables -A INPUT -p udp --sport 67 --dport 68 -j ACCEPT
iptables -A INPUT -p udp --sport 67 --dport 68 -j ACCEPT

ip6tables -A OUTPUT -p udp --sport 68 --dport 67 -j ACCEPT
iptables -A OUTPUT -p udp --sport 68 --dport 67 -j ACCEPT


# Incoming SSH via ipv4 only
iptables -A INPUT -p tcp -m state --state NEW -m tcp --dport 22 -j ACCEPT


# Allow incoming HTTP/HTTPS
ip6tables -A INPUT -p tcp -m tcp -m multiport --dports 80,443 -j ACCEPT
iptables -A INPUT -p tcp -m tcp -m multiport --dports 80,443 -j ACCEPT

#ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
#ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT


# Allow outgoing HTTP/HTTPS
ip6tables -A OUTPUT -p tcp -m tcp -m multiport --dports 80,443 -j ACCEPT
iptables -A OUTPUT -p tcp -m tcp -m multiport --dports 80,443 -j ACCEPT


# Allow outgoing FTP
ip6tables -A INPUT -p tcp --sport 21 -m state --state ESTABLISHED -j ACCEPT
iptables -A INPUT -p tcp --sport 21 -m state --state ESTABLISHED -j ACCEPT

ip6tables -A INPUT -p tcp --sport 20 -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --sport 20 -m state --state ESTABLISHED,RELATED -j ACCEPT

ip6tables -A INPUT -p tcp --sport 1024: --dport 1024: -m state --state ESTABLISHED -j ACCEPT
iptables -A INPUT -p tcp --sport 1024: --dport 1024: -m state --state ESTABLISHED -j ACCEPT

ip6tables -A OUTPUT -p tcp --dport 21 -m state --state NEW,ESTABLISHED -j ACCEPT
iptables -A OUTPUT -p tcp --dport 21 -m state --state NEW,ESTABLISHED -j ACCEPT

ip6tables -A OUTPUT -p tcp --dport 20 -m state --state ESTABLISHED -j ACCEPT
iptables -A OUTPUT -p tcp --dport 20 -m state --state ESTABLISHED -j ACCEPT

ip6tables -A OUTPUT -p tcp --sport 1024: --dport 1024: -m state --state ESTABLISHED,RELATED,NEW -j ACCEPT
iptables -A OUTPUT -p tcp --sport 1024: --dport 1024: -m state --state ESTABLISHED,RELATED,NEW -j ACCEPT


# Allow connecting to SSH
ip6tables -A OUTPUT -p tcp --dport 22 -m state --state NEW -j ACCEPT
iptables -A OUTPUT -p tcp --dport 22 -m state --state NEW -j ACCEPT

# Allow DNS requests
ip6tables -A OUTPUT -p udp --dport 53 -m state --state NEW -j ACCEPT
iptables -A OUTPUT -p udp --dport 53 -m state --state NEW -j ACCEPT


# Allow NTP Client
ip6tables -A OUTPUT -p udp --dport 123 -m state --state NEW -j ACCEPT
iptables -A OUTPUT -p udp --dport 123 -m state --state NEW -j ACCEPT

# Allow rsync
ip6tables -A INPUT -p tcp --dport 873 -m state --state NEW -j ACCEPT
iptables -A INPUT -p tcp --dport 873 -m state --state NEW -j ACCEPT

ip6tables -A OUTPUT -p tcp --dport 873 -m state --state NEW -j ACCEPT
iptables -A OUTPUT -p tcp --dport 873 -m state --state NEW -j ACCEPT


# Allow rsyslogd
ip6tables -A OUTPUT -p tcp --dport 514 -m state --state NEW -j ACCEPT
iptables -A OUTPUT -p tcp --dport 514 -m state --state NEW -j ACCEPT



# Prevent sending spam
iptables -A OUTPUT -p tcp -d 153.92.126.143 --dport 25 -j ACCEPT
ip6tables -A OUTPUT -p tcp --dport 25 -j REJECT
iptables -A OUTPUT -p tcp --dport 25 -j REJECT



# Reject all incoming
ip6tables -A INPUT -j REJECT --reject-with icmp6-adm-prohibited
iptables -A INPUT -j REJECT


# Reject all outgoing
ip6tables -A OUTPUT -j REJECT
iptables -A OUTPUT -j REJECT


# We are not a router
ip6tables -A FORWARD -j REJECT --reject-with icmp6-adm-prohibited
iptables -A FORWARD -j REJECT

