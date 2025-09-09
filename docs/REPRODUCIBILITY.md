# Reproducibility

How to create reproducible builds (via Docker).

## Base image

- Generate a base image to fix all the toolings and versions (`Dockerfile.base`).
    - `docker build -t builder-base:X.X.X -f docker/Dockerfile.base .`. 
- Enter and verify that the image has everything you need.
    - `docker run --rm -it builder-base:X.X.X /bin/bash`.

## Publish

- Publish the image in GHCR (GitHub Container Registry) using the `dfinity` project.
- Login in GHCR.
    - `docker login ghcr.io --username GITHUB_USERNAME`
    - As password create a new Personal Access Token via GitHub.
        - Authorize it via Okta SSO.
- Tag the image.
    - `docker tag builder-base:X.X.X ghcr.io/dfinity/governance-app/builder-base:X.X.X`.
- Push it.
    - `docker push ghcr.io/dfinity/governance-app/builder-base:X.X.X`.
- Set it as "public" in GHCR (so that everyone can download and use it to verify builds).

## Build the WASM

- Use a script file to automate the process via a single command for both the CI pipeline and the local verification.
    -  `./scripts/build.sh`.
    - Use the flag `--keep-wasm` if you need it (e.g. CI).