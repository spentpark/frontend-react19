pipeline {

    agent any

    tools {
        nodejs 'node20'
    }

    environment {
        SONAR_HOST_URL      = "http://172.17.0.1:9000"
        SONAR_TOKEN = "squ_d27dacd45a6c18772d7e941fd44e1617cf5c4c38"

        NEXUS_URL           = "172.17.0.1:8081"
        NEXUS_REPOSITORY    = "raw-releases"
        NEXUS_CREDENTIAL_ID = "nexus"

        APP_NAME    = "frontend-react"
        APP_VERSION = "1.0.0"
        ARTIFACT = "frontend.tar.gz"
    }

    stages {

        

        stage('Install') {
            steps {
                sh 'npm install --legacy-peer-deps'
            }
        }

        stage('Test coverage') {
            steps {
                sh 'npm run test:coverage'
            }
        }

        stage('Build React (Vite)') {
            steps {
                sh 'npm run build'
            }
        }

        stage('SonarQube Analysis') {
            steps {                
                    sh '''
                        npm install -g sonar-scanner

                        sonar-scanner \
                          -Dsonar.projectKey=frontend-react \
                          -Dsonar.projectName=frontend-react \
                          -Dsonar.sources=src \
                          -Dsonar.host.url=$SONAR_HOST_URL \
                          -Dsonar.login=squ_d27dacd45a6c18772d7e941fd44e1617cf5c4c38
                          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    '''
                }
            
        }

        stage('Package Dist') {
            steps {
                sh '''
                cd dist
                tar -czf ../frontend.tar.gz .
                '''
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

        archiveArtifacts artifacts: 'coverage/**', fingerprint: true

        cleanWs()
    }
}
}