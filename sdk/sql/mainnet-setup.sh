#!/bin/bash

if [[ -z $DBUSER ]]; then
  echo "Export DBUSER to environment variable"
  exit
fi

if [[ -z $DBPASSWORD ]]; then
  echo "Export DBPASSWORD to environment variable"
  exit
fi

if [[ -z $DBNAME ]]; then
  echo "Export DBNAME to environment variable"
  exit
fi

if [[ -z $KEY ]]; then
  echo "Export KEY to environment variable"
  exit
fi

if [[ -z $MNEMONIC ]]; then
  echo "Export MNEMONIC to environment variable"
  exit
fi

if [[ -z $CLIPASSWORD ]]; then
  echo "Export CLIPASSWORD to environment variable"
  exit
fi

set +o history


sudo adduser $DBUSER
sudo -u postgres createuser --superuser $DBUSER
sudo -u postgres psql -c "ALTER USER $DBUSER WITH PASSWORD '$DBPASSWORD';"
sudo -u $DBUSER createdb -O $DBUSER $DBNAME
# Creating tables from setup.sql
sudo -u $DBUSER psql "postgresql://$DBUSER:$DBPASSWORD@localhost/$DBNAME" -f ${PWD}/setup.sql


# Gen encryption keys and encrypted password
var=$(ISTESTNET=0 MNENOMIC=$MNEMONIC KEY=$KEY CLIPASSWORD=$CLIPASSWORD node keygen.js)
bnbPubKey=$(echo $var | cut -d, -f1)
bnbAddress=$(echo $var | cut -d, -f2)
encr_seed=$(echo $var | cut -d, -f3)
encr_clipassword=$(echo $var | cut -d, -f4)
encr_key=$(echo $var | cut -d, -f5)
encr_eth_pk=$(echo $var | cut -d, -f6)
ethAddr=$(echo $var | cut -d, -f7)
# echo "encr_seed = $encr_seed"
# echo "encr_clipassword = $encr_clipassword"
# echo "encr_key = $encr_key"
echo "bnbPubKey = $bnbPubKey"
echo "bnbAddress = $bnbAddress"
echo "ethAddress = $ethAddress"

# Polulate eth_accounts, bnb_accounts, and tokens table
sudo -u $DBUSER psql "postgresql://$DBUSER:$DBPASSWORD@localhost/$DBNAME" -c "
  INSERT INTO eth_accounts VALUES (
    '0e844974-3006-11eb-b1d9-fbf2567bac0e',
    '$encr_eth_pk',
    '$ethAddress',
    '$encr_key',
    now()
  );
"

sudo -u $DBUSER psql "postgresql://$DBUSER:$DBPASSWORD@localhost/$DBNAME" -c "
  INSERT INTO bnb_accounts VALUES (
    'ca32432b-e5a9-4bae-acb0-3f3492c69754',
    '$bnbPubKey',
    '$encr_seed',
    '$bnbAddress',
    'bnbcli-keyname-optional',
    '$encr_clipassword',
    '$encr_key',
    now()
  );
"

sudo -u $DBUSER psql "postgresql://$DBUSER:$DBPASSWORD@localhost/$DBNAME" -c "
  INSERT INTO tokens VALUES (
    '3100c73f-2e54-4b19-ade5-7d58805fcac6',
    'DOS NETWORK BEP2',
    'DOS',
    'DOS-120',
    1000000000,
    '0x0A913beaD80F321E7Ac35285Ee10d9d922659cB7',
    true,
    100,
    5,
    'eth-uuid-optional-mainnet',
    'ca32432b-e5a9-4bae-acb0-3f3492c69754',
    true,
    true,
    'listing-proposal-uuid-mainnet',
    true,
    now()
  );
"


set -o history

# You should keep your own copy of the following secrets. unset to ensure safety.
# You might also need to clear bash history to avoid leaking secrets.
unset DBPASSWORD
unset MNEMONIC
