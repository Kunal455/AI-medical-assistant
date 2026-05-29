pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        stage('Node Backend') {
            steps {
                dir('node-backend') {
                    sh 'npm install'
                }
            }
        }

        stage('Python Backend') {
            steps {
                dir('backend') {
                    sh 'python3 -m venv venv'
                    sh './venv/bin/pip install -r requirements.txt'
                }
            }
        }
    }
}
