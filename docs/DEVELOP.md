# Development Environment

There are two ways to run a local replica as a local development environment:

- Locally on your machine.
- In a development environment (devenv).


## Local

To run the project locally, you need to start the local replica and then deploy the application.

1. **Start the local replica:** This will download the version of `pocket-ic` specified in [config.json](/config.json) if it is not already present. It will then start `dfx` with system canisters (NNS, II, SNS) and a delay for Update calls to simulate real mainnet conditions.

```sh
npm run start:ic
```

This script downloads the required `pocket-ic` binary (version defined in `config.json`) if needed, and starts the replica with system canisters (NNS, II, SNS) enabled.
  - NNS dapp: http://qoctq-giaaa-aaaaa-aaaea-cai.localhost:8080
  - SNS Aggregator: http://3r4gx-wqaaa-aaaaq-aaaia-cai.localhost:8080
  - Internet Identity: http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8080
  
Note: This requires a version of dfx that supports the `--system-canisters` flag (version 0.30.1 or higher).
It can be installed with `dfxvm install 0.30.1`.

2. **Start the frontend:**

```sh
npm run start:local 		# Starts the frontend connected to the local replica
npm run start:mainnet 	# Starts the frontend connected to the mainnet
```

## DevEnv

TBD
