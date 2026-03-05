pipeline {

    agent any

    tools {
        nodejs 'node20'
    }

    environment {
        SONAR_HOST_URL = "http://172.17.0.1:9000"

        NEXUS_URL           = "172.17.0.1:8081"
        NEXUS_REPOSITORY    = "raw-releases"
        NEXUS_CREDENTIAL_ID = "nexus"

        APP_NAME    = "frontend-react"
        APP_VERSION = ""
        ARTIFACT    = ""
    }

    stages {

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:run'
            }
        }

        stage('Build React (Vite)') {
            steps {
                sh 'npm run build'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        npm install -g sonar-scanner

                        sonar-scanner \
                          -Dsonar.projectKey=frontend-react \
                          -Dsonar.projectName=frontend-react \
                          -Dsonar.sources=src \
                          -Dsonar.host.url=$SONAR_HOST_URL \
                          -Dsonar.login=$SONAR_TOKEN
                    '''
                }
            }
        }

        stage('Package Dist') {
            steps {
                script {

                    def packageJson = readJSON file: 'package.json'
                    env.APP_VERSION = packageJson.version
                    env.ARTIFACT = "${APP_NAME}-${APP_VERSION}.zip"

                    sh """
                        cd dist
                        zip -r ../${ARTIFACT} .
                    """

                    echo "Generated artifact: ${ARTIFACT}"
                }
            }
        }

        stage('Upload to Nexus (Raw)') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: "${NEXUS_CREDENTIAL_ID}",
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASS'
                    )
                ]) {

                    sh """
                        curl -v -u $NEXUS_USER:$NEXUS_PASS \
                        --upload-file ${ARTIFACT} \
                        http://${NEXUS_URL}/repository/${NEXUS_REPOSITORY}/${APP_NAME}/${APP_VERSION}/${ARTIFACT}
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Build SUCCESS"
        }
        failure {
            echo "Build FAILED"
        }
        always {
            cleanWs()
        }
    }
}