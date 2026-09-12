# AI Medical Assistant: Architecture & DevOps Workflow

You can copy this Mermaid diagram code into any Markdown viewer that supports Mermaid (like GitHub, Notion, or an online viewer like [Mermaid Live Editor](https://mermaid.live/)) to instantly generate a visual flowchart of your system architecture!

```mermaid
graph TD
    %% Define Styles
    classDef user fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef frontend fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000;
    classDef nodejs fill:#68A063,stroke:#333,stroke-width:2px,color:#fff;
    classDef python fill:#FFD43B,stroke:#333,stroke-width:2px,color:#000;
    classDef docker fill:#0db7ed,stroke:#333,stroke-width:2px,color:#fff;
    classDef devops fill:#D32D41,stroke:#333,stroke-width:2px,color:#fff;

    %% User Interaction
    User((User / Patient)):::user
    
    %% Docker Network Boundary
    subgraph Docker_Compose_Network ["Docker Compose Bridge Network (medassist_network)"]
        
        %% Microservices
        React["React.js Frontend (Port 3000)"]:::frontend
        Node["Node.js / Express API Gateway (Port 5000)"]:::nodejs
        Python["Python / FastAPI AI Engine (Port 8000)"]:::python
        
        %% Application Data Flow
        React -- "HTTP POST (JSON Query)" --> Node
        Node -- "Internal HTTP Request" --> Python
        Python -- "AI Inference Response" --> Node
        Node -- "Returns JSON" --> React
    end

    %% User Connection
    User -- "Types Symptoms in Browser" --> React

    %% DevOps Pipeline
    subgraph CI_CD_Pipeline ["Continuous Integration / Deployment"]
        Dev((Developer)):::user
        GitHub["GitHub Repository"]:::devops
        Jenkins["Jenkins CI/CD Server"]:::devops
        
        %% DevOps Flow
        Dev -- "git push origin main" --> GitHub
        GitHub -- "Triggers Webhook" --> Jenkins
        Jenkins -- "1. Lints Code (npm / flake8)" --> Jenkins
        Jenkins -- "2. Builds Docker Images" --> Docker_Compose_Network
        Jenkins -- "3. docker-compose up -d" --> Docker_Compose_Network
    end
```

### How to use this for your presentation:
1. Go to **[mermaid.live](https://mermaid.live/)**
2. Paste the code block above into the "Code" section on the left.
3. The website will instantly generate a clean, colorful diagram on the right.
4. Click the **"Save as PNG"** button at the top right of the website to download the image.
5. Paste the image directly into your PowerPoint presentation!
