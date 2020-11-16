ALTER TABLE swaps ADD COLUMN direction char(3);


ALTER TABLE IF EXISTS client_accounts RENAME TO client_accounts_bnb;


DROP TABLE IF EXISTS client_accounts_eth;
CREATE TABLE client_accounts_eth (
  uuid char(36) primary key,
  eth_address varchar(64),
  client_bnb_account_uuid char(36),
  created timestamp
);


DROP TABLE IF EXISTS client_bnb_accounts;
CREATE TABLE client_bnb_accounts (
  uuid char(36) primary key,
  public_key varchar(128),
  seed_phrase varchar(512),
  address varchar(64),
  key_name varchar(64),
  password varchar(128),
  encr_key varchar(128),
  created timestamp
);
