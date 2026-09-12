# AI Medical Assistant: Project Presentation
## Focus: 25% Architecture / 75% DevOps Implementation

---

### **Slide 1: Title Slide**
**Title:** AI Medical Assistant: Infrastructure & Deployment  
**Subtitle:** Automating a Microservices Healthcare Platform  
**Presenter:** [Your Name]  
**Course/Project:** [Your Course Name or Final Year Project]  

---

### **Slide 2: Project Overview & The Microservices Shift (25% Stack)**
**Heading:** From Idea to Microservices
**Bullet Points:**
- **The Application:** An AI-driven natural language medical triage chatbot.
- **The Stack Challenge:** We needed a fast UI, secure routing, and heavy machine learning processing.
- **The Solution:** A decoupled, 3-tier microservices architecture.
  - **Frontend:** React.js for a dynamic, real-time UI.
  - **API Gateway:** Node.js/Express for rapid routing and rate-limiting.
  - **AI Engine:** Python/FastAPI for loading complex ML models without blocking the web servers.

---

### **Slide 3: The DevOps Challenge (75% DevOps starts here)**
**Heading:** Why We Needed DevOps
**Bullet Points:**
- **"Works on My Machine":** Managing three distinct languages (Node, Python, React) caused local environment conflicts.
- **Integration Hell:** Merging UI updates occasionally broke the API gateway routing.
- **Manual Deployments:** Taking down the server, pulling code, installing pip/npm packages, and rebooting took too long and risked downtime.
- **The DevOps Mandate:** We needed complete environmental consistency and 100% automated deployments.

---

### **Slide 4: Containerization Strategy (Docker)**
**Heading:** Isolating the Environments
**Bullet Points:**
- We wrapped each microservice in its own isolated Docker container.
- **Custom Dockerfiles:**
  - `medassist_frontend`: Built on a lightweight Node Alpine Linux image.
  - `medassist_python_backend`: Built on a heavier Python image containing essential OS-level C++ compilers for Machine Learning libraries.
- **Impact:** Developers no longer need Python or Node installed natively; they just need the Docker Daemon.

---

### **Slide 5: Microservice Orchestration (Docker Compose)**
**Heading:** Connecting the Dots
**Bullet Points:**
- **Central Blueprint:** Used `docker-compose.yml` to orchestrate all three containers simultaneously.
- **Isolated Networking:** Created a custom bridge network (`medassist_network`). 
- **Internal DNS:** The Node container communicates with the Python container internally via `http://python-backend:8000`. No traffic is exposed to the public internet, maximizing security.
- **Developer Experience:** Volumes are mounted so code edits in VS Code instantly hot-reload inside the running containers.

---

### **Slide 6: Continuous Integration (Jenkins)**
**Heading:** Automating the Pipeline
**Bullet Points:**
- **The CI Server:** Deployed a Jenkins server to act as the traffic controller for our code repository.
- **Triggering Mechanisms:** Configured GitHub Webhooks. Every time a developer pushes code to the `main` branch, Jenkins is instantly notified.
- **Pipeline as Code:** Instead of clicking through UI menus, the entire build process is codified in a declarative `Jenkinsfile` stored directly inside the GitHub repository.

---

### **Slide 7: Deep Dive: The Jenkins Pipeline Stages**
**Heading:** Stage-by-Stage Automation
**Bullet Points:**
- **Stage 1 - Checkout:** Jenkins securely clones the latest commit from the GitHub repository.
- **Stage 2 - Parallel Linting:** Node.js (`npm lint`) and Python (`flake8`) code quality checks run simultaneously to save time.
- **Stage 3 - Dependency Install:** Automatically fetches missing NPM or PIP packages required by the new code.
- **Stage 4 - Image Build:** Executes `docker-compose build --no-cache` to bake the new code into fresh Docker images.

---

### **Slide 8: Continuous Deployment & Zero-Downtime**
**Heading:** Seamless Rollouts
**Bullet Points:**
- **The Deployment Stage:** Once the build is verified, Jenkins executes the deployment commands.
- **Command execution:** `docker-compose up -d` gracefully replaces the old containers with the newly built ones.
- **Rollbacks:** If a deployment fails, Docker tags allow us to instantly revert to the previous container image in seconds, ensuring high availability.

---

### **Slide 9: DevOps Results & Metrics**
**Heading:** The Impact of Automation
**Bullet Points:**
- **Deployment Time:** Reduced from 15+ minutes (manual) to under 3 minutes (automated).
- **Environment Parity:** Achieved 100% parity between Development, Staging, and Production.
- **Reliability:** The automated pipeline caught multiple syntax and dependency errors *before* they reached the production server.
- *(Note: Insert screenshot of the successful Jenkins Pipeline stages here)*

---

### **Slide 10: Future DevOps Enhancements**
**Heading:** Next Steps for Infrastructure
**Bullet Points:**
- **Container Orchestration Migration:** Move from local Docker Compose to **Kubernetes (Amazon EKS)** for intelligent, automated pod scaling when user traffic spikes.
- **Observability:** Integrate **Prometheus** for metrics gathering and **Grafana** for visual dashboards to monitor container CPU/Memory usage.
- **Infrastructure as Code (IaC):** Implement **Terraform** to automatically provision the cloud servers and network security groups required for the cluster.

---

### **Slide 11: Conclusion & Q&A**
**Heading:** Final Thoughts
**Bullet Points:**
- The AI Medical Assistant proves that modern healthcare applications require equally modern infrastructure.
- By dedicating resources to a robust DevOps pipeline, we ensured that the developers can focus on improving the AI, while Jenkins and Docker handle the heavy lifting of deployment.
- **Thank you!** Any questions regarding the architecture or CI/CD pipeline?
