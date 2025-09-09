# Deployment Process

How to deploy the Project.

## Pre Steps (skip if already done)

### Identity

- Generate a new DFX dev-identity for yourself.
    - `dfx identity new NewGovAppController`. 
- Same for each member of the team.

### ICPs & Cycles

- Get the ledger account.
    - `dfx ledger account-id`.
- Ask for ICPs to be transferred via Slack `#icp-to-go`.
    - Check the balance.
    - `dfx ledger balance --network=ic`.
- Convert some of them to Cycles.
    - `dfx cycles convert --amount AMOUNT --network=ic`. 
- Check the balance.
    - `dfx cycles balance --network=ic`.
- Base fees:
    - Canister creation: `500,000,000,000` (500B) cycles.
    - Transfer (if using cycles ledger): `100,000,000` (100M) cycles.
    - Recommended starting amount: `5,000,000,000,000` (5T) cycles.
    - Conversion rate: 1T cycles equals 1 XDR, that is around 1.30 USD as of early 2025.

### Canister

- Use the previous identity.
    - `dfx identity use NewGovAppController`. 
- Create a new canister.
    - `dfx canister create governance-app-backend --network=ic`.
- Add the dev-identities of the other team members as controllers.
    - `dfx identity get-principal`. 
    - `dfx canister update-settings CANISTER_ID --add-controller PRINCIPAL_ID --network ic`. 
- Top-up the canister.
    - `dfx cycles top-up CANISTER_ID CYCLES_AMOUNT --network ic`.
- Check the canister balance.
    - `dfx canister status CANISTER_ID --network=ic | grep Balance`.

## Deploy

### Build

- Refer to the other docs for these steps:
    - Download the repository & install the dependencies.
    - Build the code: front-end + back-End (with Asset Certification).
    - Get the resulting WASM.

### Manual Deployment

- `dfx canister install CANISTER_ID --mode upgrade --wasm PATH-TO-WASM --network ic`.

### Automated Deployment (CI/CD)

- Use the steps above to:
    - Create a new DFX dev-identity for the GitHub pipeline.
    - Add it as a canister new controller.
- Export the DFX dev-identity `.pem` file.
- Store it in a GitHub Actions secret.
- Create a new GitHub Action that replicates the Build and Manual Deployment steps.

## Controllers

- Keep track of controllers, and add/remove them in case they change:
    - Francesco -> `frlnd-a2ffv-cu3x5-3lvcb-i2lrh-ha3sp-p36py-356y5-b7y77-bxuri-zae`.
    - Max -> `hpikg-6exdt-jn33w-ndty3-fc7jc-tl2lr-buih3-cs3y7-tftkp-sfp62-gqe`.
    - Yusef -> `pixf5-n6wii-oy2th-nnhvc-afaf4-2yu5l-aac32-pedif-s3o5c-i6qw7-uqe`.
    - GitHub -> `ldg4v-647m6-7j6tf-nrdea-wzdsu-espvw-cl2t4-vkzic-hi6dp-y2azm-yae`.
- List all controllers: `dfx canister info CANISTER_ID --network=ic`.
- Add a controller: `dfx canister update-settings CANISTER_ID --add-controller PRINCIPAL_ID`. 
- Remove a controller: `dfx canister update-settings CANISTER_ID --remove-controller PRINCIPAL_ID`. 
- Canister ID on Mainnet: `mc7vh-sqaaa-aaaai-q33na-cai`.