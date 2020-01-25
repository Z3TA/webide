
echo "This will create a new Linux network namespace for user $1"
read -p "Press enter to continue"

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
  echo "Network namespace already exist!"
  exit 1
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
sudo ip link set br-$1 master br0
# Set the routing route inside the namespace to go via the "router"
sudo ip netns exec $1 ip route add default via 10.0.0.1

echo "Done!"
