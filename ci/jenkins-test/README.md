# Jenkins test harness

`run.sh` starts a **throwaway** Jenkins, points a job at this repository's `Jenkinsfile`, runs it with
`DEPLOY=false`, prints a per-stage summary and removes everything again. Use it to check changes to the
`Jenkinsfile` or `Dockerfile.jenkins` before they reach your real Jenkins.

```bash
./ci/jenkins-test/run.sh            # current branch (commit your changes first)
KEEP=1 ./ci/jenkins-test/run.sh     # leave Jenkins running to look around; prints the admin password
```

What it proves: the image has Go, Node and sonar-scanner; checkout works; Go vet/tests (with a throwaway
Postgres), frontend lint/tests/build, and the "missing credential" paths (Sonar and deploy are skipped and
the build is UNSTABLE rather than failed).

What it does not do: it never deploys, never touches your running `youpace_*` containers or your real Jenkins,
and does not reach SonarQube (the test Jenkins is not on your compose network).

Files: `Dockerfile` (adds the pipeline plugins on top of the repo's Jenkins image), `setup.groovy`
(creates a local admin from a random password and the job), `run.sh`.
Test-only settings (no CSRF crumb, local-directory checkouts allowed) exist only inside this throwaway container.
