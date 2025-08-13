#!/bin/bash

PRINCIPAL=$(dfx identity get-principal)

# Convert principal to account identifier
ACCOUNT_ID=$(dfx ledger account-id --of-principal $PRINCIPAL)

cat > ./init-arguments/icp-ledger.did << EOF
(variant {
  Init = record {
    minting_account = "$ACCOUNT_ID";
    initial_values = vec {};
    send_whitelist = vec {};
    transfer_fee = opt record { e8s = 10_000 };
    token_symbol = opt "ICP";
    token_name = opt "Internet Computer";
    feature_flags = opt record {
      icrc2 = true;
    };
    archive_options = opt record {
      trigger_threshold = 2000;
      num_blocks_to_archive = 1000;
      node_max_memory_size_bytes = opt 3_221_225_472;
      max_message_size_bytes = opt 2_000_000;
      controller_id = principal "$PRINCIPAL";
      cycles_for_archive_creation = opt 10_000_000_000_000;
      max_transactions_per_response = opt 1000;
    };
  }
})
EOF
