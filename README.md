# Governande dApp

A decentralized governance application built on the Internet Computer, featuring a Rust backend canister and React frontend with Internet Identity authentication.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16.0.0 or higher)
- [npm](https://www.npmjs.com/) (v7.0.0 or higher)
- [DFX](https://internetcomputer.org/docs/current/developer-docs/setup/install/) (Internet Computer SDK)
- [Rust](https://rustup.rs/) (for backend development)

## Quick Start

For local development you can run the following commands:

```bash
cd src/governance-app-frontend
npm install
npm start
```

Alternatively, you can use `dfx` to build the wasm with the frontend assets injected similar to a production setup.

```bash
dfx start --clean --background
dfx deploy
```

The frontend will be available at `http://[canister-id].localhost:8080/`.
