# AI Medical Assistant: DevOps Implementation
## Presentation Content Outline

---

### **Slide 1: Title Slide**
**Title:** DevOps Implementation for AI Medical Assistant  
**Subtitle:** Containerization, CI/CD, and Microservices Orchestration  
**Presenter:** [Your Name]  
**Subject:** [Your DevOps Subject/Course Name]  

---

### **Slide 2: Project Overview (A DevOps Perspective)**
**Heading:** What is the AI Medical Assistant?
**Bullet Points:**
- A full-stack web application delivering AI-driven medical symptom triage.
- **The DevOps Challenge:** Managing a complex, polyglot architecture.
- Three distinct microservices: 
  - React.js (Frontend)
  - Node.js/Express (API Gateway)
  - Python/FastAPI (AI Inference Engine)
- **The DevOps Goal:** Ensure consistent development environments, automate testing/building, and achieve zero-downtime deployments.

---

### **Slide 3: The DevOps Tech Stack**
**Heading:** Tools & Technologies Utilized
**Bullet Points:**
- **Version Control:** Git & GitHub (Branching, Webhooks).
- **Containerization:** Docker (Isolated application environments).
- **Orchestration (Local/Staging):** Docker Compose (Multi-container networking).
- **CI/CD Automation:** Jenkins (Declarative Pipelines).
- **Infrastructure:** Linux/Ubuntu Server (Host environment).

---

### **Slide 4: Microservices Architecture**
**Heading:** Decoupling for Scalability
**Bullet Points:**
- Shifted from a Monolithic architecture to Microservices.
- **Separation of Concerns:** 
  - UI updates (Frontend) don't require AI backend reboots.
  - API Gateway (Node) handles load balancing and security.
  - Heavy computation (Python) is isolated to prevent system crashes.
- **Benefits:** Independent scaling, targeted debugging, and polyglot programming (using the best language for each specific job).

---

### **Slide 5: Containerization Strategy (Docker)**
**Heading:** Building Consistent Environments
**Bullet Points:**
- Created distinct `Dockerfile`s for each service.
- **Frontend Dockerfile:** Uses Node Alpine image, installs dependencies, exposes port 3000.
- **Node Backend Dockerfile:** Node environment, sets up Express routing on port 5000.
- **Python Backend Dockerfile:** Heavy image containing OS dependencies, Python 3.9, and ML libraries (PyTorch/Transformers) exposing port 8000.
- **Result:** "It works on my machine" syndrome is completely eliminated.

---

### **Slide 6: Microservice Orchestration (Docker Compose)**
**Heading:** Networking the Services
**Bullet Points:**
- `docker-compose.yml` serves as the blueprint for the entire infrastructure.
- **Custom Bridge Network:** Created `medassist_network` to isolate traffic from the host machine.
- **Internal DNS Resolution:** Node.js communicates with Python using the container name as the URL (`http://python-backend:8000`), completely bypassing public IP routing.
- **Volume Mounting:** Mapped local directories to container directories (`./frontend:/app`) to enable hot-reloading during development.

---

### **Slide 7: Continuous Integration / Continuous Deployment**
**Heading:** Automating the Pipeline with Jenkins
**Bullet Points:**
- Implemented a fully automated CI/CD pipeline to streamline development.
- **Trigger:** GitHub Webhooks automatically notify Jenkins upon every `push` to the `main` branch.
- **Pipeline-as-Code:** Defined infrastructure steps declaratively using a `Jenkinsfile` stored directly in the repository.
- **Goal:** Catch bugs early, build instantly, and deploy seamlessly.

---

### **Slide 8: The Jenkins Pipeline Stages**
**Heading:** Inside the `Jenkinsfile`
**Bullet Points:**
1. **Checkout Stage:** Pulls the latest commit from GitHub.
2. **Linting & Security Stage:** Runs `npm run lint` and `flake8` to enforce code quality.
3. **Dependency Installation:** Automates `npm install` and `pip install -r requirements.txt`.
4. **Build Stage:** Executes `docker-compose build --no-cache` to generate fresh Docker images.
5. **Deploy Stage:** Executes `docker-compose down` and `docker-compose up -d` to restart the application with the new code.

---

### **Slide 9: Results & Impact of DevOps Integration**
**Heading:** Why DevOps Mattered Here
**Bullet Points:**
- **Faster Release Cycles:** Developers push code to GitHub, and the application updates automatically in minutes.
- **High Reliability:** Automated dependency installation prevents production crashes due to missing packages.
- **Resource Efficiency:** Alpine Linux base images reduced container sizes by over 60%, speeding up deployment times.
- **Easy Onboarding:** New developers simply run `docker-compose up` to spin up the entire multi-tier architecture locally.

---

### **Slide 10: Future DevOps Enhancements**
**Heading:** The Road Ahead
**Bullet Points:**
- **Kubernetes (K8s) Migration:** Move from Docker Compose to Amazon EKS for production-grade pod auto-scaling and self-healing.
- **Observability Stack:** Integrate Prometheus and Grafana to monitor CPU/Memory usage of the AI backend container.
- **Log Aggregation:** Implement the ELK Stack (Elasticsearch, Logstash, Kibana) to centralize logs from all three microservices.
- **Infrastructure as Code (IaC):** Use Terraform to automatically provision the cloud servers required for deployment.

---

### **Slide 11: Q&A**
**Heading:** Questions?
**Bullet Points:**
- Thank you for your time!
- Opening the floor for questions regarding Docker, Jenkins, or microservices architecture.
