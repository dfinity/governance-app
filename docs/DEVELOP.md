# Development Environment

There are two ways to run a local replica as a local development environment:

- Locally on your machine.
- In a development environment (devenv).

Both approaches benefit from having a dedicated identity for this scenario. You can create one by running:

```sh
dfx identity new sns-testing --storage-mode=plaintext
```

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
   npm start
   ```

## DevEnv

It is also possible to run the pocketIc server in a devenv instance.

- Create an ssh tunnel to your devenv instance forwarding port `8080`:
```sh
ssh <>@<>.devenv.dfinity.network -L 8080:localhost:8080
```
- Download and extract the bundle for the Linux version:

```sh
./scripts/download-sns-testing-bundle.sh -o linux
```

- Start the PocketIc server:
```sh
./scripts/pocketic-server.sh -d <directory>
```

- Initialize required canisters:

```sh
./scripts/init-replica.sh -d <directory>
```

### Custom Instance

The main use case for running the replica in your DevEnv is to be able to customize the sns-testing-bundle. The following steps will guide you through the process of creating your own bundle and running it in your devenv instance.

Pre-requisites:

- A devenv instance `<username>@<username>.devenv.dfinity.network`
- The [IC repo](https://github.com/dfinity/ic) in your devenv instance

To run the dapp locally against a Replica we will be use the devenv to initialize a local Replica through [sns-testing](https://github.com/dfinity/ic/tree/master/rs/sns/testing).

- Create an ssh tunnel to your devenv instance forwarding port `8080`:

```sh
ssh <>@<>.devenv.dfinity.network -L 8080:localhost:8080
```

- Initialize a container to guarantee that all the dependencies are met, and then install `sns-testing`. By the end, of these steps you should have a `.tar` file with everything needed to run the local Replica with the required canisters:

```sh
./ci/container/container-run.sh
bazel build //rs/sns/testing:sns_testing_bundle
```

- Once it finished, it should spit out the location of the `.tar` file, something like:

```sh
Target //rs/sns/testing:sns_testing_bundle up-to-date:
bazel-bin/rs/sns/testing/sns_testing_bundle.tar.gz
```

- Create a folder at the root of the ic repo, something like `sns-testing-<date>`, move the file there and exit the container.

```sh
mkdir sns-testing
mv bazel-bin/rs/sns/testing/sns_testing_bundle.tar.gz sns-testing
exit
```

- Navigate into the folder recently created and extract the content of the `.tar` file:

```sh
cd sns-testing
tar -xvf sns_testing_bundle.tar.gz
```

- Start the PocketIc server with. Note that `ttl` represents the amount of time (in seconds) that the PocketIc server will be kept alive in the local Replica if idle:

```sh
source sns_testing_env.sh
$POCKET_IC_BIN --ttl 3000 --port 8888
```

- We will initialize the local Replica by opening a new terminal tab. Access your development environment, navigate to the `ic` repository, and then to the previously created `sns-testing` folder. Run the following command to initialize the local Replica with the required canisters:

```sh
ssh <user>@<user>.devenv.dfinity.network
cd ic/sns-testing
source sns_testing_env.sh
./sns-testing-init \
    --server-url "http://127.0.0.1:8888" \
    --dev-identity sns-testing \
    --deciding-nns-neuron-id 1
```

- Now, following canisters should be available in the following urls:
  - NNS dapp: http://qoctq-giaaa-aaaaa-aaaea-cai.localhost:8080
  - Internet Identity: http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8080

- We can now start the FE development server with the following commands from the root of the `governance-dapp` repo:

```sh
dfx deploy --network http://127.0.0.1:8080
npm start
```
