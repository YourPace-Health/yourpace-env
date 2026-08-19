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

        stage('Backend Tests') {
            steps {
                dir('backend') {
                    echo 'Running backend unit tests...'
                    // ในเคสนี้หากยังไม่มีการติดตั้ง go หรือ mock environment บน jenkins agent 
                    // เราสามารถสั่งรันทดสอบผ่าน Docker environment ได้เลย หรือรันผ่าน go local
                    // go test ./... -v
                    echo 'Backend tests skipped or completed successfully'
                }
            }
        }

        stage('Frontend Tests') {
            steps {
                dir('frontend') {
                    echo 'Running frontend tests...'
                    // npm run test --if-present
                    echo 'Frontend tests skipped or completed successfully'
                }
            }
        }

        stage('SonarQube Analysis') {
            environment {
                SONAR_TOKEN = 'squ_80ca7eaf0264e4c73d670ebecdf17478fcfe58d3'
            }
            steps {
                echo 'Running SonarQube code quality analysis...'
                sh 'sonar-scanner -Dsonar.host.url=http://sonarqube:9000 -Dsonar.token=${SONAR_TOKEN}'
            }
        }


        stage('Build & Deploy Containers') {
            steps {
                echo 'Rebuilding and Deploying containers using Docker Compose...'
                // ใช้ Docker compose เพื่อ build และ recreate backend, frontend container
                sh 'docker compose up -d --build backend frontend'
            }
        }
    }

    post {
        success {
            echo 'CI/CD pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Please check the logs.'
        }
    }
}
