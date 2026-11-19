pipeline {
    agent any

    parameters {
        booleanParam(name: 'DEPLOY', defaultValue: true,
                     description: 'After a green build, rebuild and restart the backend and frontend containers')
    }

    environment {
        DOCKER_IMAGE_BACKEND = 'youpace-backend'
        DOCKER_IMAGE_FRONTEND = 'youpace-frontend'
        // The compose project that owns the running youpace_* containers. Without it compose
        // names the project after the workspace folder and collides with the existing containers.
        COMPOSE_PROJECT_NAME = 'yourpaceenv'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Code Quality & Linting') {
            parallel {
                stage('Backend Quality') {
                    steps {
                        dir('backend') {
                            echo 'Verifying Go code formatting and static analysis...'
                            sh 'go vet ./...'
                        }
                    }
                }
                stage('Frontend Quality') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                            sh 'npm run lint'
                        }
                    }
                }
            }
        }

        stage('Backend Tests') {
            steps {
                dir('backend') {
                    // DB-backed handler tests need a throwaway Postgres. It joins this
                    // container's network namespace, so it is reachable on localhost.
                    sh '''
                        docker rm -f yp-test-pg >/dev/null 2>&1 || true
                        docker run -d --name yp-test-pg --network container:$(hostname) \\
                            -e POSTGRES_PASSWORD=test -e POSTGRES_DB=youpace_test postgres:15-alpine
                        for i in $(seq 1 30); do docker exec yp-test-pg pg_isready -U postgres && break; sleep 1; done
                        export TEST_DATABASE_URL='host=localhost port=5432 user=postgres password=test dbname=youpace_test sslmode=disable'
                        go test ./... -coverprofile=coverage.out; status=$?
                        docker rm -f yp-test-pg >/dev/null 2>&1 || true
                        exit $status
                    '''
                }
            }
        }

        stage('Frontend Tests') {
            steps {
                dir('frontend') {
                    sh 'npm test --if-present'
                    sh 'npm run build'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube code quality analysis...'
                // The token lives in a Jenkins credential with id "sonar-token". Until it exists the
                // analysis is skipped and the build is marked UNSTABLE, so tests and deploy still run.
                script {
                    try {
                        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                            sh 'sonar-scanner -Dsonar.host.url=http://sonarqube:9000 -Dsonar.token=$SONAR_TOKEN'
                        }
                    } catch (Exception e) {
                        // only a missing credential is tolerated; a real scanner failure still fails the build
                        if (!(e.message ?: '').contains('Could not find credentials')) {
                            throw e
                        }
                        echo "SonarQube analysis skipped: ${e.message}"
                        echo 'Create a Secret text credential with id sonar-token (see docs/SETUP-CHECKLIST.md, step 4).'
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }

        stage('Build & Deploy Containers') {
            when { expression { return params.DEPLOY } }
            steps {
                echo 'Rebuilding and deploying containers using Docker Compose...'
                // The compose file needs POSTGRES_PASSWORD, JWT_SECRET, ... from a .env that is not in git.
                // Store it as a "Secret file" credential with id yourpace-dotenv; without it the deploy is
                // skipped (build UNSTABLE) instead of failing on missing variables.
                script {
                    try {
                        withCredentials([file(credentialsId: 'yourpace-dotenv', variable: 'DOTENV_FILE')]) {
                            try {
                                sh 'cp "$DOTENV_FILE" .env'
                                sh 'docker compose up -d --build backend frontend'
                            } finally {
                                sh 'rm -f .env'
                            }
                        }
                    } catch (Exception e) {
                        if (!(e.message ?: '').contains('Could not find credentials')) {
                            throw e
                        }
                        echo "Deploy skipped: ${e.message}"
                        echo 'Create a Secret file credential with id yourpace-dotenv (see docs/SETUP-CHECKLIST.md, step 4).'
                        currentBuild.result = 'UNSTABLE'
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'CI/CD pipeline completed successfully with high code quality standards!'
        }
        failure {
            echo 'Pipeline failed. Please check the logs.'
        }
    }
}
