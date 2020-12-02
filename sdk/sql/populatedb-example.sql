INSERT INTO tokens VALUES (
  <uuid>,
  'DOS NETWORK BEP2 Testnet',
  'DOS',
  'DOS1-55F',
  1000000000,
  <testnet erc20_address>,
  true,
  <min_swap_amount>,
  <fee_per_swap>,
  <eth_account_row_uuid (can be arbitrary)>,
  <bnb_account_row_uuid>,
  true (can be arbitrary),
  true (can be arbitrary),
  1 (can be arbitrary),
  true,
  now()
);


INSERT INTO bnb_accounts VALUES (
  <bnb_account_row_uuid>,
  <bnb_public_key>,
  <aes256seed>,
  <address>,
  <key_name (can be arbitrary)>,
  <aes256password>,
  <dbPassword>,
  now()
);
