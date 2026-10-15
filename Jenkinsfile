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
                            sh 'test -z "$(gofmt -l .)" || { gofmt -l .; echo "Files above are not gofmt-formatted"; exit 1; }'
                            sh 'go vet ./...'
                        }
                    }
                }
                stage('Frontend Quality') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci --no-audit --no-fund'
                            sh 'npm run lint'
                        }
                    }
                }
            }
        }

        stage('Backend Tests') {
            environment {
                // Throwaway value for tests only; production secrets never come from here.
                JWT_SECRET = 'ci-test-only-secret'
            }
            steps {
                dir('backend') {
                    sh 'go test ./... -cover'
                }
            }
        }

        // The frontend has no test script yet, so the build is the check.
        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo 'Running SonarQube code quality analysis...'
                sh 'sonar-scanner -Dsonar.host.url=http://sonarqube:9000 -Dsonar.token=${SONAR_TOKEN}'
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
            echo 'Pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Please check the logs.'
        }
    }
}
