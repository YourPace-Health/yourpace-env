pipeline {
    agent any

    environment {
        DOCKER_IMAGE_BACKEND = 'youpace-backend'
        DOCKER_IMAGE_FRONTEND = 'youpace-frontend'
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
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh 'sonar-scanner -Dsonar.host.url=http://sonarqube:9000 -Dsonar.token=$SONAR_TOKEN'
                }
            }
        }

        stage('Build & Deploy Containers') {
            steps {
                echo 'Rebuilding and Deploying containers using Docker Compose...'
                sh 'docker compose up -d --build backend frontend'
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
