#!/usr/bin/env bash
# Runs the repository's Jenkinsfile in a throwaway Jenkins and reports the result.
# Nothing here touches your real Jenkins or the running youpace_* containers: the job is
# started with DEPLOY=false, and everything is removed afterwards (KEEP=1 keeps it).
#
#   ./ci/jenkins-test/run.sh                 # tests the current branch (it must be committed)
#   ./ci/jenkins-test/run.sh my-branch
#   PORT=18081 KEEP=1 ./ci/jenkins-test/run.sh
#
# Needs Docker. First run takes several minutes (Go, Node and sonar-scanner are downloaded).
# Exit code: 0 = SUCCESS or UNSTABLE (UNSTABLE is expected until the sonar-token credential exists),
#            1 = the pipeline failed.
set -euo pipefail

cd "$(dirname "$0")/../.."
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
PORT="${PORT:-18080}"
NAME="yp-jenkins-ci"
PW="t$(date +%s%N | sha256sum | cut -c1-16)"
export MSYS_NO_PATHCONV=1   # Git Bash on Windows must not rewrite container paths

# the checked-out repo, in a form Docker understands (Windows path under Git Bash)
REPO="$(pwd -W 2>/dev/null || pwd)"

cleanup() { [[ "${KEEP:-0}" == "1" ]] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> building the Jenkins image from Dockerfile.jenkins"
docker build -q -f Dockerfile.jenkins -t yp-jenkins-base . >/dev/null
docker build -q -f ci/jenkins-test/Dockerfile -t yp-jenkins-test ci/jenkins-test >/dev/null

echo "==> starting a throwaway Jenkins on http://localhost:$PORT (branch $BRANCH)"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" --user root -p "$PORT:8080" \
  -e TEST_ADMIN_PASSWORD="$PW" -e TEST_BRANCH="$BRANCH" \
  -e JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Dhudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT=true" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$REPO:/repo:ro" \
  yp-jenkins-test >/dev/null

for _ in $(seq 1 60); do
  [[ "$(curl -s -o /dev/null -w '%{http_code}' -u "admin:$PW" "http://localhost:$PORT/api/json")" == "200" ]] && break
  sleep 5
done
sleep 3

echo "==> running the pipeline with DEPLOY=false"
curl -s -o /dev/null -u "admin:$PW" -X POST "http://localhost:$PORT/job/yourpace-ci/buildWithParameters?DEPLOY=false"
for _ in $(seq 1 360); do
  info="$(curl -s -u "admin:$PW" "http://localhost:$PORT/job/yourpace-ci/1/api/json?tree=building,result" || true)"
  if echo "$info" | grep -q '"building":false'; then break; fi
  sleep 10
done
RESULT="$(echo "$info" | sed -n 's/.*"result":"\([A-Z]*\)".*/\1/p')"
LOG="$(curl -s -u "admin:$PW" "http://localhost:$PORT/job/yourpace-ci/1/consoleText")"

echo "==> per-stage summary"
echo "$LOG" | grep -E "^\[Pipeline\] \{ \(|^ok |^FAIL|Test Files|^.*Tests +[0-9]|built in|skipped|Finished:" | sed 's/\x1b\[[0-9;]*m//g' | cut -c1-140

echo "==> result: ${RESULT:-unknown}"
if [[ "$RESULT" == "FAILURE" || -z "$RESULT" ]]; then
  echo "---- last lines of the console ----"
  echo "$LOG" | tail -40
  [[ "${KEEP:-0}" == "1" ]] && echo "Jenkins kept at http://localhost:$PORT (user admin, password $PW)"
  exit 1
fi
[[ "${KEEP:-0}" == "1" ]] && echo "Jenkins kept at http://localhost:$PORT (user admin, password $PW)"
exit 0
