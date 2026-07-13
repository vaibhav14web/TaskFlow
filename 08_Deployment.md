# Module 08: Deployment, Docker & CI/CD

---

## 1. Purpose

### Why This Module Exists
The **Deployment, Docker & CI/CD** module represents the production execution pipeline of TaskFlow. In senior engineering interviews, candidates must prove they can package applications securely using containerization (Docker), configure zero-downtime integration pipelines (CI/CD), manage environments securely (secrets), and architect high-availability servers.

### What Problem It Solves
Moving applications from local development to production introduces several issues:
* **Dependency drift**: "It works on my machine" issues where local and server library versions mismatch.
* **Large Docker images**: Standard Node.js images contain build tools that add unnecessary storage overhead and expose security vulnerabilities in production.
* **Broken builds**: Deploying code that has syntax errors or failing tests to production.

Using multi-stage Docker builds and automated CI/CD verification pipelines ensures deployments are secure, consistent, and stable.

### How It Interacts With Other Modules
This deployment engine packages all application code:
* Compiles **Frontend TypeScript** assets into static production builds.
* Installs dependencies and runs migration scripts on the **Database Schema**.
* Boots Node.js execution instances managed by process managers.

```
[ Developer Commit ]
         |
         v
[ GitHub CI/CD Pipeline ]
  ├── Run ESLint & Prettier
  ├── Run Unit & Integration Tests
  └── Build Docker Images (Multi-Stage)
         |
         v
[ Docker Registry ]
         |
         v
[ Production Load Balancer / Nginx ] ---> [ Docker App Containers ] ---> [ Database ]
```

### Real-World Analogy
Think of the deployment pipeline as a car shipping process.
* **Docker** is the shipping container. It locks the car (application) inside a uniform box, ensuring it loads and unloads identically on any cargo ship (AWS, GCP, DigitalOcean) regardless of the destination.
* **CI/CD** is the quality inspection track. Before the car is loaded, it undergoes crash tests (unit tests) and alignment checks (linting). If any check fails, the car is sent back for repairs, never reaching the ship.
* **Environment Secrets** represent the ignition key, which is kept separate from the car and only handed to the driver at the destination.

---

## 2. High-Level Overview

TaskFlow utilizes Docker for containerization and GitHub Actions for CI/CD automation.

---

## 3. Detailed Workflow

Let us trace the deployment pipeline: **A developer merges a PR to the main branch.**

### Execution Sequence
1. **GitHub Actions Trigger**:
   * The merge triggers the production CI/CD workflow defined in `.github/workflows/deploy.yml`.
2. **Quality Gates (CI)**:
   * The pipeline installs dependencies and runs the linter (`npm run lint`).
   * Runs the complete test suite (`npm test`). If any tests fail, the pipeline halts and sends alerts.
   * Runs `tsc --noEmit` to verify type compilation on the frontend and backend.
3. **Container Compilation (Docker Multi-Stage)**:
   * **Stage 1 (Builder)**: Installs all dependencies (including devDependencies) and compiles TypeScript into Javascript.
   * **Stage 2 (Production)**: Copies only the compiled JavaScript, production dependencies, and static assets into a minimal base image (like Node-Alpine), keeping the image size small (<150MB).
4. **Deploy & Migration**:
   * The new image is pushed to the Docker Registry.
   * The deployment script triggers a rolling update on the host server.
   * The server runs database migrations (`npx prisma migrate deploy`) before starting the new app containers.
   * PM2 or Docker Swarm scales the new containers, executing health checks before routing user traffic to them.

---

## 4. Classes (Dockerfiles Configuration)

Orchestration is defined in configuration files. Below is our optimized Docker configuration:

### `Dockerfile.backend` (Multi-Stage Configuration)
* **Purpose**: Compiles and packages the Node.js backend securely.
* **Key Directives**:
  * `FROM node:18-alpine AS builder`: Minimizes the build environment footprint.
  * `RUN npm ci && npm run build`: Installs dependencies and compiles code.
  * `FROM node:18-alpine AS runner`: The clean production execution stage.
  * `USER node`: Runs the process as a non-root user to mitigate security risks.
* **Why This Design**: Splitting the build process into builder and runner stages excludes compilation tools (like compilers and headers) from the final production container, reducing the attack surface.

---

## 5. Functions (CI/CD Actions)

API configurations are mapped in YAML pipelines.

### `deploy.yml` (GitHub Pipeline Step)
* **Purpose**: Automates the build and deployment checks.
* **Key Configuration**:
  ```yaml
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Install dependencies
          run: npm ci
        - name: Run Tests
          run: npm test
  ```
* **Why Written This Way**: Using `npm ci` (clean install) ensures the runner installs the exact version hashes locked in `package-lock.json`, preventing build discrepancies.

---

## 6. Architecture Discussion

### Multi-Stage Containerization & Security Controls
* **Distroless or Alpine Base**: We use Alpine base images because they are lightweight (~5MB) and exclude shell utilities, reducing the vulnerability footprint.
* **Non-Root Execution**: By default, Docker runs as root. We add `USER node` to enforce privileges isolation; if the application is compromised, the attacker cannot access the host kernel.

---

## 7. Interview Questions

### Easy (15)

#### 1. What is Docker?
* **Answer**: An open-source platform that uses OS-level virtualization to deliver software in isolated packages called containers.
* **Explanation**: Docker ensures that applications run identically across different local machines and production servers.
* **Follow-up**: *How does it differ from a virtual machine?* Containers share the host OS kernel, making them lighter and faster to boot than VMs, which run full guest operating systems.
* **Common Mistakes**: Claiming that Docker containers require full hypervisors to run.

#### 2. What is a Dockerfile?
* **Answer**: A text document containing all the commands a user could call on the command line to assemble a Docker image.
* **Explanation**: It defines the base image, environment variables, working directories, file copies, and startup commands.
* **Follow-up**: *What is the difference between an Image and a Container?* An image is a read-only blueprint; a container is a running instance of an image.
* **Common Mistakes**: Editing running containers directly instead of modifying the Dockerfile.

#### 3. What does CI/CD stand for?
* **Answer**: Continuous Integration and Continuous Delivery (or Deployment).
* **Explanation**: CI automates testing and building code changes. CD automates deploying stable builds to production environments.
* **Follow-up**: *What is the benefit of CI/CD?* It reduces manual deployment errors and catches bugs early.
* **Common Mistakes**: Assuming CI/CD requires manual approval steps for every phase.

#### 4. Why do we use `npm ci` instead of `npm install` in CI/CD pipelines?
* **Answer**: `npm ci` installs the exact dependency versions locked in `package-lock.json` and deletes existing `node_modules` before starting, ensuring clean and consistent builds.
* **Explanation**: `npm install` can update minor versions dynamically, leading to build discrepancies.
* **Follow-up**: *What happens if package-lock.json is missing?* `npm ci` fails, forcing developers to check it in.
* **Common Mistakes**: Running `npm install` in automation environments.

#### 5. What is a multi-stage Docker build?
* **Answer**: A Docker build method that uses multiple `FROM` instructions in a single Dockerfile, copying artifacts from builder stages to a minimal runner stage.
* **Explanation**: This keeps the final image size small by excluding build dependencies (like compilers or devDependencies).
* **Follow-up**: *What is the benefit?* Smaller image sizes, faster deployments, and a reduced security attack surface.
* **Common Mistakes**: Storing devDependencies in production runner stages.

#### 6. What is the role of `.dockerignore`?
* **Answer**: A file that specifies folders and files to exclude from the Docker build context (e.g. `node_modules`, `.git`).
* **Explanation**: This reduces build context sizes, making image compilation faster.
* **Follow-up**: *What happens if node_modules is not ignored?* Local dependencies are copied into the container, potentially causing compatibility issues.
* **Common Mistakes**: Forgetting to add `.env` files to `.dockerignore`.

#### 7. Why should we avoid running Docker containers as root?
* **Answer**: Running as root allows attackers who exploit an application vulnerability to gain root access to the host operating system.
* **Explanation**: Enforcing a non-root user (like `USER node`) isolates privileges and protects the host.
* **Follow-up**: *How do you change the user?* Using the `USER` directive in the Dockerfile.
* **Common Mistakes**: Assuming Docker containers are completely secure by default.

#### 8. What is GitHub Actions?
* **Answer**: An automated workflow platform integrated with GitHub, used to run CI/CD tasks on code pushes or pull requests.
* **Explanation**: Workflows are defined in YAML files inside the `.github/workflows` directory.
* **Follow-up**: *What are runners?* Server VMs provided by GitHub (or self-hosted) to execute pipeline jobs.
* **Common Mistakes**: Hardcoding API secrets in pipeline configuration YAML files.

#### 9. What is a container registry?
* **Answer**: A secure storage hosting platform used to store and manage compiled Docker images (e.g., Docker Hub, AWS ECR).
* **Explanation**: Build pipelines push compiled images to the registry, and deployment servers pull them to run containers.
* **Follow-up**: *How do you version images?* By tagging them with version markers (e.g. `:v1.0.0`) or Git commit hashes.
* **Common Mistakes**: Using the `:latest` tag for production image tags, which makes rollback tracking difficult.

#### 10. What is the purpose of `npx prisma migrate deploy` in CD?
* **Answer**: A Prisma command that applies all pending database migrations to the production database without starting development interactive prompts.
* **Explanation**: It updates the production database schema to match the new release before starting the application containers.
* **Follow-up**: *Why do we avoid running migrate dev in production?* Because `migrate dev` is interactive and can reset database tables.
* **Common Mistakes**: Running migration scripts inside the Dockerfile build phase.

#### 11. What is an Alpine Docker image?
* **Answer**: A lightweight Linux distribution base image (~5MB) based on musl libc and busybox, optimized for container size.
* **Explanation**: Using Alpine reduces image sizes significantly compared to standard Debian-based images.
* **Follow-up**: *What is the drawback?* Some Node packages requiring C++ compilation can experience build issues due to musl compatibility.
* **Common Mistakes**: Assuming Alpine contains standard debugging tools like `bash` (it uses `sh` by default).

#### 12. What does port mapping do in Docker?
* **Answer**: Maps a port on the host machine to a port inside the running Docker container (e.g., `-p 80:5000`).
* **Explanation**: This allows external traffic to access services running inside the isolated container environment.
* **Follow-up**: *What happens if the host port is already in use?* The container fails to start.
* **Common Mistakes**: Exposing internal database container ports to the public network.

#### 13. What are environment secrets in GitHub?
* **Answer**: Encrypted variables stored in GitHub repository settings, injected securely into workflows during execution.
* **Explanation**: They keep API keys and deployment credentials out of the public YAML configuration files.
* **Follow-up**: *How do you reference them in YAML?* Using `{{ secrets.SECRET_NAME }}`.
* **Common Mistakes**: Logging secret variables to the workflow console logs.

#### 14. What is a health check in Docker?
* **Answer**: A directive that tells the container runtime how to test the container's health status (e.g., querying a `/health` endpoint).
* **Explanation**: If the health check fails, the orchestrator marks the container as unhealthy and restarts it.
* **Follow-up**: *What HTTP status code indicates health?* `200 OK`.
* **Common Mistakes**: Directing health check scripts to heavy database query endpoints.

#### 15. What does the `CMD` directive do in a Dockerfile?
* **Answer**: Specifies the default command to execute when starting a container.
* **Explanation**: In our backend Dockerfile, it executes `node dist/app.js`.
* **Follow-up**: *How does it differ from RUN?* RUN executes commands during the image build phase; CMD defines the execution command when launching containers.
* **Common Mistakes**: Using multiple CMD directives in a single Dockerfile (only the last one is executed).

---

### Medium (20)

#### 1. How do you design and structure a multi-stage Dockerfile for a TypeScript Node.js application to minimize image size and maximize security?
* **Interviewer's Intent**: To verify knowledge of containerization best practices, security controls, and image optimizations.
* **Answer**: 
  1. **Stage 1 (Build)**: Use a full Node image, copy the package lock and source code, run `npm ci`, and compile TypeScript to JavaScript using `tsc`.
  2. **Stage 2 (Production)**: Use a minimal Node-Alpine base image. Copy only the compiled JavaScript (`dist/`), production dependencies (`package.json`), and database client files.
  3. Enforce security by running as a non-root user using the `USER node` directive.
* **Why Interviewer Asks**: Standard single-stage builds include devDependencies and compilers, resulting in large image sizes (>1GB) and increased security vulnerabilities.
* **Common Mistakes**: Copying the entire project directory including source code and local `node_modules` into the final runner image.
* **Follow-up**: *How do you install only production dependencies in Stage 2?* By running `npm prune --production` or running `npm ci --only=production`.
* **Production Example**: Secure backend Dockerfiles.

#### 2. What is the difference between rolling updates and blue-green deployments in CI/CD?
* **Interviewer's Intent**: To evaluate deployment strategy knowledge and risk mitigation capabilities.
* **Answer**: 
  * **Rolling Updates**: Gradually replaces old container instances with new ones. Uptime is maintained, but both old and new versions run concurrently during the update window.
  * **Blue-Green Deployments**: Boots a complete duplicate environment (Green) running the new version alongside the stable environment (Blue). Once green is verified, the load balancer redirects traffic to it instantly.
* **Why Interviewer Asks**: Poorly planned deployment strategies can result in downtime or database conflicts.
* **Common Mistakes**: Defaulting to blue-green deployments for systems that cannot handle concurrent schema updates.
* **Follow-up**: *Which strategy is easier to rollback?* Blue-Green, as we only need to revert the load balancer pointer back to Blue.
* **Production Example**: Rolling updates in Kubernetes rolling upgrades.

#### 3. How do you manage database migrations safely during automated deployments?
* **Interviewer's Intent**: To check database reliability design and migration automation pipeline skills.
* **Answer**: We run migration scripts as a distinct step in the deployment pipeline, executing them *after* the new Docker image is pushed but *before* the new application containers start. We use `npx prisma migrate deploy` to apply migrations in a non-interactive, transactional block.
* **Why Interviewer Asks**: Running migrations inside application startup scripts can lead to race conditions if multiple container instances run migrations concurrently.
* **Common Mistakes**: Running interactive migrations (`migrate dev`) in automated CI/CD pipelines.
* **Follow-up**: *What happens if a migration fails?* The deployment halts, prevents container updates, and logs alerts, rolling back database changes if supported by the transaction.
* **Production Example**: CD pipeline configurations.

#### 4. How do you inject environment secrets into Docker containers in production securely?
* **Interviewer's Intent**: To check security policies regarding secrets management in container environments.
* **Answer**: We never bake secrets into the Docker image or commit them to source control. In production, we inject environment secrets at runtime using container orchestration parameters (like Kubernetes Secrets or ECS Task Definitions) or retrieve them dynamically from key stores (like AWS Parameter Store).
* **Why Interviewer Asks**: Hardcoding secrets in images exposes credentials to anyone who has access to the container registry.
* **Common Mistakes**: Storing `.env` files inside compiled Docker images.
* **Follow-up**: *Why do we avoid passing secrets via standard command-line arguments?* Because command-line arguments are visible in process monitoring tools (like `ps -ef`).
* **Production Example**: Injecting DB credentials as environment parameters in EKS clusters.

#### 5. What are the benefits and drawbacks of using Alpine base images in Node.js?
* **Interviewer's Intent**: To evaluate container design trade-offs.
* **Answer**: 
  * *Benefits*: Small image footprint (~5MB), fast download speeds, and a minimal security attack surface.
  * *Drawbacks*: Alpine uses `musl libc` instead of the standard `glibc` library. Node packages requiring C++ compilation (like bcrypt) can experience build failures or performance drops due to compatibility issues.
* **Why Interviewer Asks**: Senior engineers must evaluate C-library compatibility before choosing Alpine for CPU-heavy applications.
* **Common Mistakes**: Assuming Alpine is a drop-in replacement for Debian for all Node projects.
* **Follow-up**: *How did we resolve bcrypt build issues on Alpine?* By installing compiler tools in the builder stage or using pre-compiled binaries.
* **Production Example**: Lightweight Node-Alpine containers.

#### 6. What is the difference between Docker Compose and Kubernetes?
* **Answer**: Docker Compose is a tool for defining and running multi-container applications on a single host. Kubernetes is a container orchestration platform designed to scale, coordinate, and manage containers across a cluster of multiple host machines.
* **Why Interviewer Asks**: Clarifies container orchestration tools.
* **Common Mistakes**: Recommending Docker Compose for high-availability multi-server production environments.
* **Follow-up**: *When is Docker Compose appropriate?* For local development environments and simple staging setups.
* **Production Example**: Local development environment configurations.

#### 7. How does a load balancer handle WebSocket connection sticky sessions?
* **Answer**: WebSockets begin as an HTTP handshake. If the load balancer uses standard round-robin routing, subsequent websocket packets can land on different server instances, breaking the handshake. We configure the load balancer to use **Sticky Sessions** (session affinity), binding a client's requests to a specific server instance using cookies.
* **Why Interviewer Asks**: Essential for Socket.io scaling.
* **Common Mistakes**: Deploying Socket.io across multiple servers without configuring sticky sessions on the load balancer.
* **Follow-up**: *What is an alternative?* Scaling sockets using a Redis pub/sub adapter.
* **Production Example**: Nginx upstream sticky session configurations.

#### 8. What is the purpose of the Docker build cache?
* **Answer**: Docker caches the result of each step (layer) in the Dockerfile. If the files or commands in a step have not changed, Docker reuses the cached layer, speeding up image build times.
* **Why Interviewer Asks**: Tests Dockerfile structure optimization skills.
* **Common Mistakes**: Copying all source code before running `npm install`, which invalidates the npm cache layer on every code edit.
* **Follow-up**: *How do we optimize it?* By copying `package.json` first, running `npm install`, and copying source files last.
* **Production Example**: Structured Dockerfiles.

#### 9. How do you implement automated rollbacks in CD pipelines?
* **Answer**: We configure the deployment pipeline to monitor health checks on the new container instances. If health checks fail or error rates spike, the load balancer automatically reverts traffic back to the old stable container versions and stops the deployment.
* **Why Interviewer Asks**: Ensures system reliability on failed deployments.
* **Common Mistakes**: Deploying updates without rollback automation.
* **Follow-up**: *What metrics trigger rollbacks?* High error rates (5xx status codes) and health check failures.
* **Production Example**: AWS ECS rolling updates with alarm monitoring.

#### 10. Why do we run type checks (`tsc --noEmit`) in CI pipelines?
* **Answer**: To verify that no type errors exist in the codebase before compiling code for production. This prevents runtime bugs caused by broken type contracts.
* **Why Interviewer Asks**: Tests type safety enforcement in CI pipelines.
* **Common Mistakes**: Relying only on local IDE compiler checks, which can be bypassed.
* **Follow-up**: *Can we skip this to speed up builds?* No, type checks are critical gatekeepers for code stability.
* **Production Example**: CI pipelines.

#### 11. What is the difference between `COPY` and `ADD` directives in a Dockerfile?
* **Answer**: `COPY` simply copies files from the host machine to the container. `ADD` can download files from URLs and automatically extract compressed archives (like `.tar.gz`) during copying.
* **Why Interviewer Asks**: Clarifies Dockerfile syntax selection.
* **Common Mistakes**: Using `ADD` for standard file copies where `COPY` is more secure and explicit.
* **Follow-up**: *Which is preferred?* `COPY`, as `ADD` can download untrusted external files.
* **Production Example**: Dockerfile configurations.

#### 12. How do you configure a clean environment teardown in integration test workflows?
* **Answer**: We use Jest teardown hooks (`afterAll`) to execute SQL scripts that delete database tables in cascade order, and close all open database connection pools to prevent memory leaks and hanging processes.
* **Why Interviewer Asks**: Clean teardowns prevent test interference and resource exhaustion.
* **Common Mistakes**: Leaving database connections open, causing test processes to hang.
* **Follow-up**: *What error indicates hanging connections?* Jest warnings stating that the test suite did not exit cleanly.
* **Production Example**: Test teardown hooks.

#### 13. What is a linter, and why is it part of CI?
* **Answer**: A code analysis tool that checks code for style guidelines and potential syntax bugs. We run it in CI to enforce code consistency across the development team.
* **Why Interviewer Asks**: Essential for code quality.
* **Common Mistakes**: Bypassing linter errors locally.
* **Follow-up**: *What linter did we use?* ESLint.
* **Production Example**: CI linting jobs.

#### 14. How do you configure Docker volume mounts?
* **Answer**: Volume mounts map a directory on the host machine to a directory inside the container, allowing data to persist even if the container is destroyed.
* **Why Interviewer Asks**: Essential for database container data persistence.
* **Common Mistakes**: Storing database files inside standard container directories without volume mounts, leading to data loss on container restarts.
* **Follow-up**: *What is a bind mount?* A volume mount that maps a specific, absolute directory path on the host.
* **Production Example**: Mounting PostgreSQL data directories.

#### 15. What does the `EXPOSE` directive do in a Dockerfile?
* **Answer**: It document the port on which the container application runs. It acts as documentation, and does not map ports to the host automatically.
* **Why Interviewer Asks**: Clarifies port configuration.
* **Common Mistakes**: Thinking `EXPOSE` automatically opens port traffic on the host machine.
* **Follow-up**: *How do you map ports?* Using the `-p` parameter during container startup.
* **Production Example**: Exposing port 5000 in the backend Dockerfile.

#### 16. What is the difference between monorepo and polyrepo architectures?
* **Answer**: A monorepo stores multiple related projects (like frontend and backend) in a single code repository. A polyrepo stores each project in its own separate code repository.
* **Why Interviewer Asks**: Explains codebase organization choices.
* **Common Mistakes**: Conflating monorepo with monolithic deployment.
* **Follow-up**: *Which one did we use?* Monorepo, keeping TaskFlow code unified.
* **Production Example**: Monorepos in large tech platforms (Google, Meta).

#### 17. How do you handle secrets rotation in production?
* **Answer**: We update the secrets in our secure key vault (like AWS Secrets Manager) and trigger a rolling update of the application containers to load the new values without downtime.
* **Why Interviewer Asks**: Critical security practice.
* **Common Mistakes**: Hardcoding secrets, which requires code updates and rebuilds to rotate keys.
* **Follow-up**: *What happens to old sessions during JWT secret rotation?* All active sessions are invalidated, forcing users to re-log in.
* **Production Example**: Automating secret rotation.

#### 18. What is the role of Docker Compose in local development?
* **Answer**: It allows spinning up the entire development environment (database, backend, frontend) with a single command (`docker-compose up`), managing network and volume configurations automatically.
* **Why Interviewer Asks**: Essential tool for local developer setup.
* **Common Mistakes**: Using Docker Compose configurations directly in multi-server production environments.
* **Follow-up**: *How do you share networks in Compose?* Compose creates a default network linking all defined services.
* **Production Example**: Compose configuration files.

#### 19. How do you compile TypeScript configuration files for production?
* **Answer**: We use the TypeScript compiler (`tsc`) and configure `tsconfig.json` to write compiled JavaScript files to a build output folder (e.g. `dist/`).
* **Why Interviewer Asks**: Tests TypeScript deployment patterns.
* **Common Mistakes**: Running `.ts` files directly in production using development tools (like `ts-node`).
* **Follow-up**: *What option excludes devDependencies?* We only copy production dependencies to the runner image.
* **Production Example**: TypeScript compiler configurations.

#### 20. What is a staging environment, and why is it necessary?
* **Answer**: A duplicate of the production environment used to test deployments, migrations, and new features under production-like conditions before public release.
* **Why Interviewer Asks**: Essential risk mitigation phase.
* **Common Mistakes**: Deploying directly from local machines to production.
* **Follow-up**: *What database is used in staging?* A duplicate staging database containing anonymized production-like datasets.
* **Production Example**: Staging deployment pipelines.

---

### Hard (20)

#### 1. How would you design a highly available, auto-scaling deployment architecture for TaskFlow on AWS?
* **Detailed Answer**: We deploy TaskFlow inside an ECS cluster using Fargate.
  1. Traffic enters via an **Application Load Balancer (ALB)** configured with SSL certificates and sticky sessions.
  2. The ALB distributes connections across ECS Fargate tasks running in multiple **Availability Zones (AZs)**.
  3. We configure Auto Scaling policies that scale Fargate tasks dynamically based on CPU and memory utilization thresholds.
  4. The Fargate tasks connect to an **Amazon RDS Aurora PostgreSQL** cluster with a primary writer instance and synchronous read replicas in secondary AZs.
  5. Sockets state is synced across containers using a managed **Redis ElastiCache** adapter.
* **Deep Explanation**: Scaling stateless containers is simple. We use Redis to coordinate socket events across instances, and Aurora Auto-Scaling replicas to scale database read capacity.
* **Alternative Approach**: Deploying on AWS EC2 instances managed by Auto Scaling Groups.
  * *Pros*: Full OS access, low-level performance tuning capabilities.
  * *Cons*: High management overhead, as we must manage OS patches, security updates, and scaling speeds manually.
* **Production Example**: Large-scale SaaS platform deployments.
* **Cross Questions**: *How do you ensure zero-downtime during rolling updates in ECS?* By configuring the ECS deployment controller with minimum and maximum healthy task thresholds (e.g., min 100%, max 200%).

#### 2. How do you secure container workloads against kernel exploits and host escapes in Docker?
* **Detailed Answer**:
  1. Never run container processes as `root`; enforce privileges isolation using `USER node`.
  2. Drop default Linux capabilities using the `--cap-drop` flag (e.g. drop `NET_ADMIN`, `SYS_ADMIN`).
  3. Use read-only root filesystems (`--read-only`) to block attackers from writing files or downloading malicious scripts.
  4. Implement security profiles (Seccomp and AppArmor) to restrict system calls to the host kernel.
* **Deep Explanation**: Host escapes occur when an attacker exploits a container vulnerability to access the host operating system kernel. Dropping capabilities and restricting system calls minimizes the attack surface.
* **Alternative Approach**: Virtual Machine isolation per tenant.
  * *Pros*: Maximum security, zero risk of cross-tenant escapes.
  * *Cons*: Massive resource overhead and slow deployment speeds.
* **Production Example**: Secure container execution in financial and healthcare platforms.
* **Cross Questions**: *What is the purpose of Seccomp?* A security facility in the Linux kernel that filters system calls made by a process.

#### 3. How do you design a CI/CD pipeline that handles database schema rollback for migrations that contain breaking column modifications?
* **Detailed Answer**: We use the **Expand/Contract migration pattern** split across deployment versions.
  1. *Version N (Deploy)*: Add new column as nullable, keeping the old column active.
  2. *Data Sync*: Deploy a background job to copy data to the new column.
  3. *Version N+1 (Deploy)*: Update code to write to the new column, and drop the old column.
  If a rollback is required at Version N, we simply revert the application code because the database schema remains backward-compatible. If rollback is required at Version N+1, we run custom down-migration scripts to restore the old column and copy data back before rolling back application code.
* **Deep Explanation**: Avoid running database updates that drop columns until all application instances running the old code are terminated.
* **Alternative Approach**: Restoring database backups.
  * *Pros*: Simple, guarantees restoration to a specific timestamp.
  * *Cons*: Results in data loss for transactions processed after the backup was taken.
* **Production Example**: Migrations management in Stripe or GitHub.
* **Cross Questions**: *How do you test down-migrations?* In a staging database before deploying to production.

#### 4. How would you design a secure secrets distribution pipeline for a multi-tenant microservices architecture?
* **Detailed Answer**: We use a centralized vault (like HashiCorp Vault or AWS Secrets Manager) with IAM policies.
  1. During deployment, the CI/CD pipeline retrieves short-lived access tokens or IAM roles for the service.
  2. When starting, the service queries the Vault API to fetch its secrets dynamically, decrypting them in-memory.
  3. Secrets are never written to disk or logged to console logs.
* **Deep Explanation**: Centrally managed secrets allow rotation, access auditing, and prevent exposure in source control or built images.
* **Alternative Approach**: Injecting secrets as environment parameters in Dockerfiles.
  * *Pros*: Simple setup.
  * *Cons*: Vulnerable if the container registry is compromised, as anyone with image access can inspect the secrets.
* **Production Example**: Enterprise secrets distribution.
* **Cross Questions**: *How do you handle secrets rotation?* The service listens to rotation events and reloads secrets dynamically without restarting the process.

#### 5. How would you optimize Docker build speeds in large-scale CI/CD pipelines?
* **Detailed Answer**:
  1. Structure the Dockerfile to maximize caching: copy dependencies config files, run installs, and copy source code last.
  2. Implement **Docker BuildKit** with remote cache backends (`--cache-from` and `--cache-to`).
  3. Use multi-stage builds to skip unnecessary steps in dev environments.
  4. Maintain a local image registry on the CI runner to avoid downloading base images on every run.
* **Deep Explanation**: BuildKit caches compilation layers, pushing cache metadata to the registry so secondary runners can reuse layers without local image history.
* **Alternative Approach**: Monolithic single-stage builds.
  * *Pros*: Simple Dockerfile structure.
  * *Cons*: Slow builds, as any code change invalidates the entire dependency cache.
* **Production Example**: Build optimizations in large-scale devops pipelines.
* **Cross Questions**: *How do you enable BuildKit?* By setting the environment variable `DOCKER_BUILDKIT=1` before building.

#### 6. What is the difference between `docker run` and `docker exec`?
* **Answer**: `docker run` creates and starts a new container instance from an image. `docker exec` runs a new command inside an existing, already running container.
* **Why Interviewer Asks**: Tests basic Docker command proficiency.
* **Common Mistakes**: Using `docker run` to open shells inside running containers.
* **Follow-up**: *What flag keeps the session interactive?* `-it` (interactive, pseudo-TTY).
* **Production Example**: Running database migration scripts inside active containers.

#### 7. How do you implement logging and log aggregation for Docker containers?
* **Answer**: We configure Docker containers to write logs to standard output (`stdout`) and standard error (`stderr`). We deploy log collection daemons (like Filebeat or Fluentbit) on the host machine to collect, parse, and forward container logs to a centralized log shipper (like Elasticsearch or Datadog).
* **Why Interviewer Asks**: Essential for container observability.
* **Common Mistakes**: Writing application logs to files inside the container directory, which exhausts storage.
* **Follow-up**: *What logging driver does Docker use by default?* The JSON-file logging driver.
* **Production Example**: ELK Stack logging pipelines.

#### 8. What is the purpose of the `npm prune` command?
* **Answer**: It removes unnecessary packages (like devDependencies) from `node_modules` to keep the folder size small for production builds.
* **Why Interviewer Asks**: Tests build size optimization.
* **Common Mistakes**: Leaving devDependencies in production images.
* **Follow-up**: *When do we run it in multi-stage builds?* In the builder stage before copying production dependencies to the runner stage.
* **Production Example**: Dockerfile optimizations.

#### 9. How do you handle configuration changes in production without restarting containers?
* **Answer**: We store configuration parameters in a centralized dynamic configuration registry (like Consul or AWS AppConfig). The application polls the registry or listens to updates, modifying its internal state dynamically without restarting.
* **Why Interviewer Asks**: Restarts cause connection drops. Dynamic configuration prevents downtime.
* **Common Mistakes**: Restarting all containers for simple feature flag updates.
* **Follow-up**: *What is this pattern called?* Dynamic Configuration pattern.
* **Production Example**: Feature flags management.

#### 10. How do you design a CI/CD pipeline that blocks merges if test coverage drops below 80%?
* **Answer**: We configure Jest to generate coverage reports and enforce coverage thresholds in `jest.config.js`. During the CI build step, if coverage falls below the threshold, the test script returns exit code 1, which blocks the PR merge.
* **Why Interviewer Asks**: Ensures code quality is maintained over time.
* **Common Mistakes**: Relying only on manual reviews to check test coverage.
* **Follow-up**: *What parameters define thresholds in Jest?* `coverageThreshold` with `branches`, `functions`, `lines`, and `statements` options.
* **Production Example**: CI pipelines.

#### 11. What is the difference between Docker `entrypoint` and `cmd`?
* **Answer**: `ENTRYPOINT` defines the executable command to run on container startup. `CMD` specifies default arguments passed to the entrypoint, which can be overridden during container launch.
* **Why Interviewer Asks**: Clarifies container startup configurations.
* **Common Mistakes**: Conflating the two as the same directive.
* **Follow-up**: *How do you write them in exec form?* Using JSON array syntax: `ENTRYPOINT ["node", "app.js"]`.
* **Production Example**: Dockerfile setups.

#### 12. How do you implement zero-downtime rolling updates in Kubernetes?
* **Answer**: We use the `RollingUpdate` deployment strategy, configuring `maxSurge` (max number of extra pods allowed during deployment) and `maxUnavailable` (max number of unavailable pods allowed). Kubernetes spins up new pods, verifies their health, and shuts down old pods incrementally.
* **Why Interviewer Asks**: Explains Kubernetes deployment mechanics.
* **Common Mistakes**: Setting `maxUnavailable` to 100%, causing downtime during updates.
* **Follow-up**: *Which probes verify pod health?* Liveness probes (verify pod is running) and Readiness probes (verify pod is ready to accept traffic).
* **Production Example**: Kubernetes deployment configurations.

#### 13. What is the purpose of static analysis tools in CI pipelines?
* **Answer**: Static analysis tools (like SonarQube) analyze source code to identify security vulnerabilities, code smells, and design issues before compilation.
* **Why Interviewer Asks**: Advanced code quality check.
* **Common Mistakes**: Assuming compilers find all code quality issues.
* **Follow-up**: *What is the benefit?* It prevents security flaws (like hardcoded keys or SQL injection paths) from reaching production.
* **Production Example**: SonarQube integration in build pipelines.

#### 14. How do you configure Docker network modes?
* **Answer**: Docker supports network modes like `bridge` (default isolated network), `host` (container shares the host machine's network stack), and `none` (isolated network stack).
* **Why Interviewer Asks**: Explains container networking.
* **Common Mistakes**: Running database containers in `host` network mode in production, which exposes database ports.
* **Follow-up**: *Which mode is suited for local development?* Bridge network mode.
* **Production Example**: Docker networking.

#### 15. What is the purpose of Docker build arguments (`ARG`)?
* **Answer**: Dynamic variables passed to the Dockerfile during the build phase (`docker build --build-arg`). They are not accessible inside running containers.
* **Why Interviewer Asks**: Clarifies build configuration parameters.
* **Common Mistakes**: Using `ARG` to store runtime application credentials.
* **Follow-up**: *How do they differ from ENV?* ARG is build-time only; ENV defines runtime environment variables.
* **Production Example**: Dockerfile setups.

#### 16. How do you implement blue-green deployments on AWS?
* **Answer**: We deploy two identical ECS target groups (Blue and Green). During deployment, we push the new version to Green, run integration tests, and update the Application Load Balancer listener rule to swap traffic from Blue to Green.
* **Why Interviewer Asks**: Explains cloud deployment execution.
* **Common Mistakes**: Dropping the blue environment immediately after swapping traffic, preventing rollbacks on errors.
* **Follow-up**: *How do you route traffic?* Using ALB target group weights or route53 DNS record routing.
* **Production Example**: AWS CodeDeploy configurations.

#### 17. How do you monitor container resource utilization in production?
* **Answer**: We deploy monitoring agents (like cAdvisor or Datadog agent) on the host machine. These agents read metrics from the container control groups (cgroups), exporting CPU, memory, and network utilization data to centralized dashboards.
* **Why Interviewer Asks**: Critical for resource capacity planning.
* **Common Mistakes**: Running resource monitoring scripts inside the application container.
* **Follow-up**: *What is cgroups?* A Linux kernel feature that limits and records resource usage of process groups.
* **Production Example**: Container monitoring setups.

#### 18. What is the role of the `package-lock.json` file in CI pipelines?
* **Answer**: It locks the exact versions and hashes of dependencies installed, guaranteeing that the CI runner builds the application using the same libraries as local development.
* **Why Interviewer Asks**: Prevents dependency drift.
* **Common Mistakes**: Ignoring package-lock.json edits during PR reviews.
* **Follow-up**: *What command verifies lock file integrity?* `npm ci`.
* **Production Example**: CI pipeline configurations.

#### 19. How do you configure a clean environment teardown in Docker?
* **Answer**: By running `docker compose down -v`. The `-v` flag deletes all volumes associated with the containers, ensuring a clean state for subsequent builds.
* **Why Interviewer Asks**: Prevents data pollution in local development environments.
* **Common Mistakes**: Leaving old volumes active, causing database schema mismatch errors in new builds.
* **Follow-up**: *How do you clean up unused images?* By running `docker system prune`.
* **Production Example**: Docker cleanup scripts.

#### 20. What is a canary deployment, and how does it compare to blue-green?
* **Answer**: Canary deployments gradually route a small percentage of production traffic (e.g. 5%) to the new version to verify stability under live load. Blue-green swaps 100% of traffic instantly after staging verification.
* **Why Interviewer Asks**: Tests advanced deployment strategies.
* **Common Mistakes**: Swapping all traffic instantly without testing canary instances first.
* **Follow-up**: *Which is safer?* Canary, as any deployment bug only affects a small subset of users.
* **Production Example**: Canary routing setups in Kubernetes.

---

## 8. Resume-Based Questions

### Why did you select GitHub Actions for CI/CD?
* **Answer**: GitHub Actions is built directly into our repository host, requires no external infrastructure setup, and has a massive marketplace of pre-built integration actions, making it the most efficient choice for TaskFlow's pipeline automation.

### How did you test your Docker container configurations locally?
* **Answer**: We use Docker Compose to spin up local containers for the backend, frontend, and PostgreSQL database, verifying network communication, database migration runs, and build health before pushing code to GitHub.

---

## 9. Code Review Questions

### Why do you run `USER node` in the final stage of the Dockerfile?
* **Answer**: By default, Docker containers run as `root`. If an attacker exploits a vulnerability in the Node application, they gain root access to the host machine kernel. Enforcing a non-root user (`USER node`) limits privileges and protects the host.

### What happens if the CI build step fails?
* **Answer**: The GitHub Actions workflow aborts, blocks the PR merge, and alerts the development team. The deploy step is skipped, protecting production from unstable code releases.

---

## 10. Production Readiness

### Image Scanning
* Integrate vulnerability scanners (like Trivy or Snyk) into the CI pipeline to scan built Docker images for security issues before pushing them to the registry.

### Secrets Injection
* Inject secrets at runtime using environment variables managed by ECS or Kubernetes configurations, keeping sensitive credentials out of source control.

---

## 11. Common Mistakes

* **Baking Secrets into Images**: Committing `.env` files or credentials into the Dockerfile context.
* **Running as Root**: Leaving containers running as `root` in production.
* **Neglecting Caching Rules**: Copying source code before running `npm install`, slowing down build times.

---

## 12. Cheat Sheet

* **Multi-Stage Build**: Installs dev dependencies in the builder stage, copying only compiled build outputs to the runner stage.
* **Docker Security**: Always use Alpine base images and run as `USER node`.
* **CI clean install**: Use `npm ci` in CI/CD pipelines to ensure consistent dependency builds.

---

## 13. Mock Interview

### 1. How do you run database migrations safely in multi-container setups?
* **Interviewer Expectations**: Concurrency checks.
* **Ideal Answer**: We execute migrations as an independent single-run job in the CI/CD pipeline, running it *before* the application containers scale up to prevent concurrent migration attempts.

### 2. Can you access the host machine filesystem from a Docker container?
* **Interviewer Expectations**: Privileges boundary knowledge.
* **Ideal Answer**: Only if the container is run with elevated privileges (`--privileged`) or specific host directories are mounted, which we block in production for security.

### 3. How do you reduce Docker image size?
* **Interviewer Expectations**: Image optimization techniques.
* **Ideal Answer**: By using multi-stage builds, Alpine base images, and ignoring unnecessary files in `.dockerignore`.

---

## 14. Summary

1. TaskFlow uses Docker to containerize services consistently.
2. GitHub Actions automates the CI/CD integration pipelines.
3. Multi-stage builds separate compilation from production execution.
4. Production containers run as a non-root `node` user for security.
5. Environment variables inject secrets dynamically at runtime.
6. DB migrations are automated and run as distinct deployment steps.
7. Linting, tests, and type checks are enforced in the CI pipeline.
8. Alpine base images minimize container sizes.
9. Local volume mounts persist database container data.
10. Rolling updates replace container instances without downtime.
