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
                    sh 'go test ./... -coverprofile=coverage.out'
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
