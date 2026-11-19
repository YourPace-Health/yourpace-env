# Throwaway Jenkins for testing the repo's Jenkinsfile. Not used in production.
FROM yp-jenkins-base
USER root

# Pipeline + git + credential binding (file and secret-text credentials)
RUN jenkins-plugin-cli --plugins workflow-aggregator git credentials-binding plain-credentials

# the repo is bind-mounted from the host with a different owner
RUN git config --system --add safe.directory '*'

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
COPY setup.groovy /usr/share/jenkins/ref/init.groovy.d/setup.groovy
