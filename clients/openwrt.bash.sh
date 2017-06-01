#!/bin/sh
# Url for your OpenDDNS server
# Example: http://my.host.com/
DDNS_URL=""
# Provider. Available: regru
# Example: regru
PROVIDER="regru"
# Username in provider's account
# Example: myusername@email.com
USERNAME=""
# Domain for update
# Example: mydomain.com
DOMAIN=""
# Host name for update
# Example: home
HOST=""
# Secret phrase. Should be equal with OpenDDNS config
# Example: mySuPERsecret1
SECRET=""

MY_IP="`wget -qO- http://ifconfig.co/ip`"
echo "Current ip: ${MY_IP}"

SIGNATURE="`echo -n ${PROVIDER}${USERNAME}${DOMAIN}${HOST}${MY_IP}${SECRET} | md5sum`"
REQ="${DDNS_URL}?provider=${PROVIDER}&username=${USERNAME}&domain=${DOMAIN}&host=${HOST}&ip=${MY_IP}&signature=${SIGNATURE}"
echo "Request: ${REQ}"
wget -qO- $REQ
echo "\n";

