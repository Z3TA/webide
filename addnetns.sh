#
# 
# note: If custom_iptables.service is not used, you need to manually add the following rule:
# sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/16 -j MASQUERADE
#
# Also make sure sysctl net.ipv4.ip_forward is set, or set it:
# sysctl -w net.ipv4.ip_forward=1
#
# Test connectivity:
# sudo ip netns exec username ping google.com
#

if [[ $* != *--unattended ]]; then
    echo "This will create a new Linux network namespace for user $1"
    read -p "Press enter to continue"
fi

USERID=$(id -u $1)
echo USERID=$USERID

dec2ip () {
    local ip dec=$@
    for e in {3..0}
    do
        ((octet = dec / (256 ** e) ))
        ((dec -= octet * 256 ** e))
        ip+=$delim$octet
        delim=.
    done
    printf '%s\n' "$ip"
}

DECIMAL_IP=$((167772162 + $USERID))
echo DECIMAL_IP=$DECIMAL_IP

IP=$(dec2ip $DECIMAL_IP)
echo "IP=$IP"

if [ -e "/var/run/netns/$1" ] ; then 
  echo "Network namespace for $1 already exist!"
  exit 17
  # 17=EXIST
fi

## add network namespace (guide: https://ops.tips/blog/using-network-namespaces-and-bridge-to-isolate-servers/)
sudo ip netns add $1
# create veth pair
sudo ip link add $1 type veth peer name br-$1
# Move one end of the "cable" to the namespace
sudo ip link set $1 netns $1
# Enable the loopback interface (127.0.0.1)
sudo ip netns exec $1 ip link set lo up
# Enable the "cable" on both ends
sudo ip link set br-$1 up
sudo ip netns exec $1 ip link set $1 up
# Give the device inside the namespace and IP address
sudo ip netns exec $1 ip addr add $IP/16 dev $1
# Attach the cable to the "router"
sudo ip link set br-$1 master netnsbridge
# Set the routing route inside the namespace to go via the "router"
sudo ip netns exec $1 ip route add default via 10.0.0.1
# Configurate resolvers
mkdir /etc/netns/$1/ -p
echo nameserver 8.8.8.8 > /etc/netns/$1/resolv.conf
echo nameserver 8.8.4.4 >> /etc/netns/$1/resolv.conf

echo "Done!"
