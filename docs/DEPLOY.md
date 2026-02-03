# Deployment Process

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
    - `dfx-orbit station add --station-id fv4dp-biaaa-aaaal-amrua-cai --network ic "governance-team"`

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

## Controllers

- Keep track of controllers, and add/remove them in case they change:
    - CycleOps canister -> `cpbhu-5iaaa-aaaad-aalta-cai`.
    - Orbit canister -> `fv4dp-biaaa-aaaal-amrua-cai`.
- List all controllers: `dfx canister info mc7vh-sqaaa-aaaai-q33na-cai --network=ic`.
- Add a controller: via Orbit. 
- Remove a controller: via Orbit. 
- Canister ID on Mainnet: `mc7vh-sqaaa-aaaai-q33na-cai`.
