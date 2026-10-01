pipeline {
    agent any

    environment {
        // Internal URLs used by Playwright to reach the running containers.
        // These match the ports exposed in docker-compose.yml:
        //   node-backend  → 5000:5000
        //   python-backend → 8000:8000
        NODE_API_URL   = 'http://localhost:5000'
        PYTHON_API_URL = 'http://localhost:8000'
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

        // ── Stage 5: Create CI .env ──────────────────────────────────────
        stage('Create CI .env') {
            environment {
                MONGO_URI = credentials('MONGO_URI')
                JWT_SECRET = credentials('JWT_SECRET')
                GEMINI_API_KEY = credentials('GEMINI_API_KEY')
            }
            steps {
                sh '''
                    echo "MONGO_URI=${MONGO_URI}" > node-backend/.env
                    echo "JWT_SECRET=${JWT_SECRET}" >> node-backend/.env
                    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" >> node-backend/.env

                    echo "MONGO_URI=${MONGO_URI}" > backend/.env
                    echo "JWT_SECRET=${JWT_SECRET}" >> backend/.env
                    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" >> backend/.env
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
        // Start node-backend and python-backend in detached mode.
        // We intentionally skip the frontend container — Playwright only
        // talks to the two APIs (ports 5000 and 8000).
        stage('Start Services') {
            steps {
                sh 'docker compose down --remove-orphans || true'
                sh 'docker rm -f medassist_node_backend medassist_python_backend medassist_frontend || true'
                sh 'docker compose up -d node-backend python-backend'
            }
        }

        // ── Stage 7: Wait for services to be ready ───────────────────────
        // Poll until both services respond, up to 60 s each.
        // Node: GET /api/v1/user/profile → 401 (server alive, not 502)
        // Python: GET / → {"status":"ok"}
        stage('Wait for Services') {
            steps {
                sh '''
                    echo "Waiting for Node API Gateway on port 5000..."
                    for i in $(seq 1 30); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/v1/user/profile || true)
                        if [ "$STATUS" = "401" ]; then
                            echo "Node API Gateway is ready (HTTP 401 = auth required, server alive)"
                            break
                        fi
                        echo "  Attempt $i/30 — status: $STATUS — retrying in 2s..."
                        sleep 2
                    done

                    echo "Waiting for Python FastAPI on port 8000..."
                    for i in $(seq 1 30); do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ || true)
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

        // ── Stage 8: Install Playwright dependencies ─────────────────────
        stage('Install Playwright') {
            steps {
                dir('e2e-tests') {
                    sh 'npm install'
                    // Install Chromium browser only (lightest option, sufficient for API tests)
                    sh 'npx playwright install chromium --with-deps'
                }
            }
        }

        // ── Stage 9: Run Playwright tests ────────────────────────────────
        // THIS IS THE QUALITY GATE.
        // If any Playwright test fails, this stage fails and Jenkins will NOT
        // proceed to the Deploy stage.
        // The `|| true` is intentionally NOT used here — we want Jenkins to fail.
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

        // ── Stage 10: Deploy ─────────────────────────────────────────────
        // This stage only runs if Stage 9 (Playwright) passed.
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
