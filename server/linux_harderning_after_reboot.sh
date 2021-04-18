# Linux prevent unprivileged users from viewing dmesg
sysctl -w kernel.dmesg_restrict=1

# Prevent users from seeing who is logged in and from where (ip)
chmod 660 /var/log/wtmp
chmod 660 /var/run/utmp
