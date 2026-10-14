# Development Environment

There are two ways to run a local replica as a local development environment:

- Locally on your machine.
- In a development environment (devenv).

## Prerequisites

### Node and npm

Node and npm versions are pinned in `package.json` under the `volta` block (currently `node` 25.8.0, `npm` 11.13.0). We use [Volta](https://volta.sh) to keep dev machines on those exact versions.

1. Install Volta once: `curl https://get.volta.sh | bash`
2. `cd` into the repo — Volta auto-installs and switches to the pinned versions.
3. Verify with `node -v` and `npm -v`.

If you'd rather not use Volta, install the same versions manually (e.g. via `nvm`). `.npmrc` has `engine-strict=true`, so `npm install` will fail loudly if the running Node/npm doesn't satisfy the `engines` range — there is no silent drift.

When bumping versions, update both the `volta` block (exact pin) and `engines` (compatibility range) together.

## Local

To run the project locally, start the local network and then start the frontend.

1. **Start the local network:**

```sh
npm run start:ic
```

The script uses [icp-cli](https://github.com/dfinity/icp-cli) to start the network that [icp.yaml](/icp.yaml) defines. `npm ci` installs icp-cli, because it is a devDependency. The first start downloads the network launcher.

The network has the system canisters (NNS, SNS, II). Update calls get a 2-second delay to simulate mainnet. A new network begins with a clean state and gets `governance-app-backend` with its mainnet canister ID.

If the network already runs, the script only upgrades `governance-app-backend`. Neurons, balances and canister data stay. A stopped network loses its state, because icp-cli always starts from a clean state.
  - Governance app: http://mc7vh-sqaaa-aaaai-q33na-cai.localhost:8080
  - NNS dapp: http://qoctq-giaaa-aaaaa-aaaea-cai.localhost:8080
  - SNS Aggregator: http://3r4gx-wqaaa-aaaaq-aaaia-cai.localhost:8080
  - Internet Identity: http://uqzsh-gqaaa-aaaaq-qaada-cai.localhost:8080

To start a network without the delay (the e2e tests in CI use it), run `npm run start:ic -- --environment e2e`.
To stop the network, press Ctrl+C, or run `npx icp network stop` if the network runs in the background.

Note: The network uses port 8080. If a dfx replica still runs, stop it first with `dfx stop`.

2. **Start the frontend:**

```sh
npm run start:local 		# Starts the frontend connected to the local replica
npm run start:mainnet 	# Starts the frontend connected to the mainnet
```

## DevEnv

TBD
