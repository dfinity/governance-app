# Hacking

This document list a couple of useful information to develop the Governance-dapp frontend.

## Table of Contents

- [Tools](#tools)
- [Local](#local)

## Tools

- A devenv instance `<username>@<username>.devenv.dfinity.network`
- The [IC repo](https://github.com/dfinity/ic) in your devenv instance

## Local

To run the dapp locally against a Replica we will be use the devenv to initialize a local Replica through [sns-testing](https://github.com/dfinity/ic/tree/master/rs/sns/testing).

- Create an ssh tunnel to your devenv instance forwarding port `8080`:
```sh
ssh yhabib@yhabib.devenv.dfinity.network -L 8080:localhost:8080
```
- Initialize a container with `./gitlab-ci/ci/container/container-run.sh`.
- Install `sns-testing` by running `bazel build //rs/sns/testing:sns_testing_bundle` this will generate a `.tar` file with everything needed to run the local Replica with the required canisters.
- Once it finished, it should spit out the location of the `.tar` file, something like:
```sh
Target //rs/sns/testing:sns_testing_bundle up-to-date:
bazel-bin/rs/sns/testing/sns_testing_bundle.tar.gz
```
- Create a folder at the root of the ic repo, something like `sns-testing-<date>`, move the file there and exit the container.
```sh
mv bazel-bin/rs/sns/testing/sns_testing_bundle.tar.gz sns-testing
exit
```
- Navigate into the folder recently created and extract the content of the `.tar` file:
```sh
cd sns-testing
tar -xvf sns_testing_bundle.tar.gz
```
- Start the PocketIc server with:
```sh
source sns_testing_env.sh
$POCKET_IC_BIN --ttl 300 --port 8888
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
