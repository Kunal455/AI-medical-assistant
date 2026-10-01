pipeline {
    agent any

    environment {
        // Internal URLs used by Playwright to reach the running containers.
        // Jenkins runs inside Docker, so we use host.docker.internal to
        // reach ports published on the Docker host.
        //   node-backend   → host:5000
        //   python-backend → host:8001 (mapped to container port 8000)
        NODE_API_URL   = 'http://host.docker.internal:5000'
        PYTHON_API_URL = 'http://host.docker.internal:8001'
        CI             = 'true'
    }

    stages {

        // ── Stage 1: Checkout ────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // ── Stage 2: Install frontend dependencies ───────────────────────
        stage('Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        // ── Stage 3: Install Node backend dependencies ───────────────────
        stage('Node Backend') {
            steps {
                dir('node-backend') {
                    sh 'npm install'
                }
            }
        }

        // ── Stage 4: Verify Python is available ──────────────────────────
        stage('Python Backend') {
            steps {
                dir('backend') {
                    sh 'python3 --version'
                }
            }
        }

        // ── Stage 5: Create CI .env from Jenkins credentials ─────────────
        stage('Create CI .env') {
            environment {
                MONGO_URI      = credentials('MONGO_URI')
                JWT_SECRET     = credentials('JWT_SECRET')
                GEMINI_API_KEY = credentials('GEMINI_API_KEY')
            }
            steps {
                sh '''
                    echo "MONGO_URI=${MONGO_URI}" > node-backend/.env
                    echo "JWT_SECRET=${JWT_SECRET}" >> node-backend/.env
                    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" >> node-backend/.env
                    echo "PORT=5000" >> node-backend/.env
                    echo "PYTHON_BACKEND_URL=http://python-backend:8000" >> node-backend/.env

                    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" > backend/.env
                '''
            }
        }

        // ── Stage 6: Build Docker images ─────────────────────────────────
        stage('Build Docker Images') {
            steps {
                sh 'docker compose build --no-cache'
            }
        }

        // ── Stage 7: Start services ──────────────────────────────────────
        // Clean up previous MedAssist containers, then start fresh.
        stage('Start Services') {
            steps {
                sh 'docker rm -f medassist_node_backend medassist_python_backend medassist_frontend 2>/dev/null || true'
                sh 'docker compose down --remove-orphans || true'
                sh 'docker compose up -d node-backend python-backend'
                // Give containers a moment to initialize
                sh 'sleep 5'
                // Print container logs for debugging in case of crashes
                sh 'echo "=== node-backend logs ===" && docker compose logs node-backend || true'
                sh 'echo "=== python-backend logs ===" && docker compose logs python-backend || true'
            }
        }

        // ── Stage 8: Wait for services to be ready ───────────────────────
        // Poll until both services respond, up to 60 s each.
        // Jenkins runs inside Docker, so we use host.docker.internal.
        stage('Wait for Services') {
            steps {
                sh '''
                    echo "Waiting for Node API Gateway on port 5000..."
                    for i in $(seq 1 30); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://host.docker.internal:5000/api/v1/user/profile || true)
                        if [ "$STATUS" = "401" ] || [ "$STATUS" = "200" ]; then
                            echo "Node API Gateway is ready (HTTP $STATUS)"
                            break
                        fi
                        echo "  Attempt $i/30 — status: $STATUS — retrying in 2s..."
                        sleep 2
                    done

                    echo "Waiting for Python FastAPI on port 8001..."
                    for i in $(seq 1 30); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://host.docker.internal:8001/ || true)
                        if [ "$STATUS" = "200" ]; then
                            echo "Python FastAPI is ready (HTTP 200)"
                            break
                        fi
                        echo "  Attempt $i/30 — status: $STATUS — retrying in 2s..."
                        sleep 2
                    done
                '''
            }
        }

        // ── Stage 9: Install Playwright dependencies ─────────────────────
        stage('Install Playwright') {
            steps {
                dir('e2e-tests') {
                    sh 'npm install'
                    // Install Chromium browser only.
                    // --with-deps requires root; install system deps separately.
                    sh 'npx playwright install chromium'
                }
            }
        }

        // ── Stage 10: Run Playwright tests ───────────────────────────────
        // THIS IS THE QUALITY GATE.
        // If any Playwright test fails, this stage fails and Jenkins will NOT
        // proceed to the Deploy stage.
        stage('Playwright Tests') {
            steps {
                dir('e2e-tests') {
                    sh 'npx playwright test --reporter=list,html'
                }
            }
            post {
                always {
                    // Archive the HTML report regardless of pass/fail.
                    // This makes it downloadable from the Jenkins build page.
                    archiveArtifacts artifacts: 'e2e-tests/playwright-report/**',
                                     allowEmptyArchive: true
                }
                failure {
                    echo 'Playwright tests FAILED — deployment will NOT proceed.'
                }
                success {
                    echo 'Playwright tests PASSED — proceeding to deployment.'
                }
            }
        }

        // ── Stage 11: Deploy ─────────────────────────────────────────────
        // This stage only runs if Stage 10 (Playwright) passed.
        // Brings up all services (including frontend) in detached mode.
        stage('Deploy') {
            steps {
                sh 'docker compose up -d'
                echo 'MedAssist deployed successfully.'
            }
        }

    }

    // ── Post-pipeline cleanup ─────────────────────────────────────────────
    post {
        always {
            // Always print container status for debugging
            sh 'docker compose ps || true'
        }
        failure {
            echo 'Pipeline FAILED. Check the Playwright report in build artifacts.'
            // Stop all containers on failure to free resources
            sh 'docker compose down || true'
        }
        success {
            echo 'Pipeline SUCCEEDED. MedAssist is running.'
        }
    }
}
