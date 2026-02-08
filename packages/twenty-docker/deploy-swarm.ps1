# Deploy to Docker Swarm

# Set the project root relative to this script
$ScriptIdx = $MyInvocation.MyCommand.Path.LastIndexOf('\packages\twenty-docker\')
$ProjectRoot = $MyInvocation.MyCommand.Path.Substring(0, $ScriptIdx)

Write-Host "Project Root: $ProjectRoot"

# Navigate to project root
cd $ProjectRoot

# Build the image
Write-Host "Building twenty:latest image..."
docker build -f ./packages/twenty-docker/twenty/Dockerfile -t twenty:latest .

# Initialize Swarm if not already active
$swarmStatus = docker info --format '{{.Swarm.LocalNodeState}}'
if ($swarmStatus -ne "active") {
    Write-Host "Initializing Docker Swarm..."
    docker swarm init
} else {
    Write-Host "Docker Swarm is already active."
}

# Deploy the stack
Write-Host "Deploying stack 'twenty-swarm'..."
docker stack deploy -c ./packages/twenty-docker/docker-compose.swarm.yml twenty-swarm

Write-Host "Deployment initiated. Check status with 'docker stack services twenty-swarm'"
