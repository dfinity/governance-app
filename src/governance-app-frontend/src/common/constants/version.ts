export const GIT_COMMIT = __GIT_COMMIT__;
export const BUILD_DATE = __BUILD_DATE__;
export const APP_VERSION = `${BUILD_DATE} (${GIT_COMMIT.slice(0, 7)})`;
