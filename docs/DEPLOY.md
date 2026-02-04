# Deployment Process

Using the same approach as the (old) NNS Beta deployment process https://github.com/dfinity/nns-dapp/blob/main/scripts/nns-dapp/release-beta.

## Production Deployment (via Orbit)

Production deployments are managed through Orbit for security and auditability.

### Prerequisites (one-time setup)

1. Install GitHub CLI (`gh`):
    - Required to download CI artifacts.
    - See: https://cli.github.com/

2. Install dfx-orbit:
    - `cargo install -f --git https://github.com/dfinity/orbit.git --bin dfx-orbit`

3. Create a password-protected dfx identity (dfx-orbit doesn't support Keyring):
    - `dfx identity new --storage-mode password-protected orbit`

4. Add the Orbit station:
    - `dfx-orbit station add --station-id fv4dp-biaaa-aaaal-amrua-cai --network ic "governance-team-mainnet"`

5. Register your identity with Orbit:
    - Get your principal: `dfx identity get-principal --identity orbit`
    - Ask a team member to add your principal to the Orbit station.

6. Get asset canister permissions (Prepare and Commit):
    - These are required to upload large WASMs. Ask a team member if you don't have them.

### Deployment Steps

1. Ensure CI has built your commit successfully (check GitHub Actions).

2. Run the release script:
    ```bash
    # Deploy latest main
    ./scripts/release-prod

    # Deploy specific commit
    ./scripts/release-prod --commit <COMMIT_HASH>

    # Skip pre-flight checks (if you know they pass)
    ./scripts/release-prod --skip-checks
    ```

3. Have another team member verify and approve the request in Orbit.

## Verification Steps (for reviewers)

Before approving an Orbit request, verify the build:

1. `git fetch && git checkout <COMMIT>`
2. `./scripts/build.sh --keep-wasm`
3. `sha256sum governance_app_backend.wasm`
4. Compare the hash with the one in the Orbit request.

## Canister IDs

| Canister | ID | Purpose |
|----------|-----|---------|
| Governance App | `mc7vh-sqaaa-aaaai-q33na-cai` | Main application canister |
| Asset Canister | `p6zoc-uyaaa-aaaai-q5zja-cai` | Stores WASM chunks for Orbit deployments |
| Orbit Station | `fv4dp-biaaa-aaaal-amrua-cai` | Multi-sig deployment approvals |
| CycleOps | `cpbhu-5iaaa-aaaad-aalta-cai` | Automatic cycle top-ups |

## Controllers

- Keep track of controllers, and add/remove them in case they change:
    - Orbit canister -> `fv4dp-biaaa-aaaal-amrua-cai`.
    - NNS root (emergency option) -> `r7inp-6aaaa-aaaaa-aaabq-cai`.
    - @TODO remove after testead and go-live:
        - Francesco -> `frlnd-a2ffv-cu3x5-3lvcb-i2lrh-ha3sp-p36py-356y5-b7y77-bxuri-zae`.
        - Yusef -> `pixf5-n6wii-oy2th-nnhvc-afaf4-2yu5l-aac32-pedif-s3o5c-i6qw7-uqe`.
- List all controllers: `dfx canister info mc7vh-sqaaa-aaaai-q33na-cai --network=ic`.
- Add a controller: via Orbit. 
- Remove a controller: via Orbit. 
- Canister ID on Mainnet: `mc7vh-sqaaa-aaaai-q33na-cai`.

## Asset Canister

The asset canister is used by dfx-orbit to upload large WASM files in chunks before installation. The asset canister must be on the **same subnet** as the governance-app canister because the IC's `install_chunked_code` method requires the chunk storage to be co-located with the target canister.
