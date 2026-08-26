#!/bin/bash

# Bones Report - Service Startup Script
# Usage: ./start-services.sh [OPTIONS]
# Options:
#   -dev, --dev       Start in development mode with file watching
#   -h, --help        Show this help message
#   --api-only        Start only API service
#   --orchestrator-only Start only orchestrator service
#   --rentcast-only   Start only RentCast fetcher service
#   --no-infra        Skip infrastructure startup
#   --clean           Clean build artifacts before starting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$PROJECT_ROOT/packages/api"
ORCHESTRATOR_DIR="$PROJECT_ROOT/packages/orchestrator"
RENTCAST_DIR="$PROJECT_ROOT/packages/rentcast-fetcher"

# Default options
DEV_MODE=false
API_ONLY=false
ORCHESTRATOR_ONLY=false
RENTCAST_ONLY=false
NO_INFRA=false
CLEAN_BUILD=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -dev|--dev)
      DEV_MODE=true
      shift
      ;;
    --api-only)
      API_ONLY=true
      shift
      ;;
    --orchestrator-only)
      ORCHESTRATOR_ONLY=true
      shift
      ;;
    --rentcast-only)
      RENTCAST_ONLY=true
      shift
      ;;
    --no-infra)
      NO_INFRA=true
      shift
      ;;
    --clean)
      CLEAN_BUILD=true
      shift
      ;;
    -h|--help)
      echo "Bones Report Service Startup Script"
      echo ""
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -dev, --dev           Start in development mode with file watching"
      echo "  --api-only            Start only API service"
      echo "  --orchestrator-only   Start only orchestrator service"
      echo "  --rentcast-only       Start only RentCast fetcher service"
      echo "  --no-infra            Skip infrastructure startup (Redis/Redpanda)"
      echo "  --clean               Clean build artifacts before starting"
      echo "  -h, --help            Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                    Start all services in production mode"
      echo "  $0 -dev               Start all services in development mode"
      echo "  $0 --api-only         Start only the API service"
      echo "  $0 -dev --clean       Clean build and start in dev mode"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    if ! command_exists node; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command_exists npm; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if ! command_exists docker; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        log_error "docker-compose is not installed"
        exit 1
    fi
    
    log_success "All prerequisites are available"
}

# Clean build artifacts
clean_build() {
    if [ "$CLEAN_BUILD" = true ]; then
        log_step "Cleaning build artifacts..."
        
        cd "$PROJECT_ROOT"
        find packages -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
        find packages -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
        rm -rf node_modules 2>/dev/null || true
        
        log_success "Build artifacts cleaned"
    fi
}

# Install dependencies
install_dependencies() {
    log_step "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    if command_exists pnpm; then
        pnpm install
    else
        npm install
    fi
    
    log_success "Dependencies installed"
}

# Build services
build_services() {
    if [ "$DEV_MODE" = false ]; then
        log_step "Building services..."
        
        cd "$PROJECT_ROOT"
        if command_exists pnpm; then
            pnpm run build
        else
            npm run build
        fi
        
        log_success "Services built"
    else
        log_info "Skipping build in development mode (using file watching)"
    fi
}

# Start infrastructure
start_infrastructure() {
    if [ "$NO_INFRA" = false ]; then
        log_step "Starting infrastructure (Redis, Redpanda)..."
        
        cd "$PROJECT_ROOT"
        docker-compose up -d redis redpanda redpanda-console
        
        # Wait for services to be ready
        log_info "Waiting for infrastructure to be ready..."
        sleep 5
        
        # Check Redis
        if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
            log_success "Redis is ready"
        else
            log_warning "Redis may not be ready yet"
        fi
        
        # Check Redpanda
        if docker-compose exec -T redpanda rpk cluster info >/dev/null 2>&1; then
            log_success "Redpanda is ready"
        else
            log_warning "Redpanda may not be ready yet"
        fi
        
        log_success "Infrastructure started"
        log_info "Redpanda Console: http://localhost:8081"
    else
        log_info "Skipping infrastructure startup"
    fi
}

# Start service in background
start_service() {
    local service_name=$1
    local service_dir=$2
    local port=$3
    
    cd "$service_dir"
    
    local service_name_lower=$(echo "$service_name" | tr '[:upper:]' '[:lower:]')
    
    if [ "$DEV_MODE" = true ]; then
        log_info "Starting $service_name in development mode (watching files)..."
        npm run dev > "$PROJECT_ROOT/logs/${service_name_lower}.log" 2>&1 &
        local pid=$!
        echo $pid > "$PROJECT_ROOT/logs/${service_name_lower}.pid"
        log_success "$service_name started in development mode (PID: $pid)"
        if [ ! -z "$port" ]; then
            log_info "$service_name URL: http://localhost:$port"
        fi
    else
        log_info "Starting $service_name in production mode..."
        node dist/index.js > "$PROJECT_ROOT/logs/${service_name_lower}.log" 2>&1 &
        local pid=$!
        echo $pid > "$PROJECT_ROOT/logs/${service_name_lower}.pid"
        log_success "$service_name started in production mode (PID: $pid)"
        if [ ! -z "$port" ]; then
            log_info "$service_name URL: http://localhost:$port"
        fi
    fi
}

# Create logs directory
create_logs_dir() {
    mkdir -p "$PROJECT_ROOT/logs"
}

# Stop existing services
stop_existing_services() {
    log_step "Stopping any existing services..."
    
    # Kill any existing Node.js services
    pkill -f "node dist/index.js" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    
    # Clean up PID files
    rm -f "$PROJECT_ROOT/logs"/*.pid 2>/dev/null || true
    
    log_success "Existing services stopped"
}

# Wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            log_success "$service_name is ready"
            return 0
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_warning "$service_name may not be ready (timeout after ${max_attempts} attempts)"
    return 1
}

# Main execution
main() {
    echo -e "${CYAN}"
    echo "🦴 Bones Report Service Startup"
    echo "==============================="
    echo -e "${NC}"
    
    # Check what services to start
    local start_api=true
    local start_orchestrator=true
    local start_rentcast=true
    
    if [ "$API_ONLY" = true ]; then
        start_orchestrator=false
        start_rentcast=false
    elif [ "$ORCHESTRATOR_ONLY" = true ]; then
        start_api=false
        start_rentcast=false
    elif [ "$RENTCAST_ONLY" = true ]; then
        start_api=false
        start_orchestrator=false
    fi
    
    start_api=false
    start_orchestrator=false
    start_rentcast=false
    
    # Show configuration
    log_info "Configuration:"
    log_info "  Mode: $([ "$DEV_MODE" = true ] && echo "Development" || echo "Production")"
    log_info "  API Service: $([ "$start_api" = true ] && echo "Yes" || echo "No")"
    log_info "  Orchestrator: $([ "$start_orchestrator" = true ] && echo "Yes" || echo "No")"
    log_info "  RentCast Fetcher: $([ "$start_rentcast" = true ] && echo "Yes" || echo "No")"
    log_info "  Infrastructure: $([ "$NO_INFRA" = false ] && echo "Yes" || echo "No")"
    echo ""
    
    # Execute startup sequence
    check_prerequisites
    create_logs_dir
    stop_existing_services
    clean_build
    install_dependencies
    build_services
    start_infrastructure
    
    # Start services
    if [ "$start_api" = true ]; then
        start_service "API" "$API_DIR" "8080"
        sleep 3
        wait_for_service "API" "http://localhost:8080/health"
    fi
    
    if [ "$start_orchestrator" = true ]; then
        start_service "Orchestrator" "$ORCHESTRATOR_DIR"
        sleep 3
    fi
    
    if [ "$start_rentcast" = true ]; then
        start_service "RentCast-Fetcher" "$RENTCAST_DIR"
        sleep 3
    fi
    
    echo ""
    log_success "🎉 All services started successfully!"
    echo ""
    log_info "Service URLs:"
    if [ "$start_api" = true ]; then
        log_info "  📋 API: http://localhost:8080"
        log_info "  🏥 Health: http://localhost:8080/health"
    fi
    log_info "  🖥️  Redpanda Console: http://localhost:8081"
    echo ""
    log_info "Log files:"
    log_info "  📊 API: $PROJECT_ROOT/logs/api.log"
    log_info "  🎯 Orchestrator: $PROJECT_ROOT/logs/orchestrator.log"
    log_info "  🏠 RentCast: $PROJECT_ROOT/logs/rentcast-fetcher.log"
    echo ""
    log_info "To stop services: ./stop-services.sh"
    log_info "To view logs: tail -f logs/api.log"
    
    if [ "$DEV_MODE" = true ]; then
        log_info ""
        log_info "🔄 Development mode: Files are being watched for changes"
        log_info "   Services will automatically restart when you modify code"
    fi
    
    echo ""
    log_info "Press Ctrl+C to stop all services"
    
    # Wait for interrupt
    trap 'log_info "Stopping services..."; ./stop-services.sh; exit 0' INT
    
    # Keep script running
    while true; do
        sleep 5
        
        # Check if services are still running
        if [ "$start_api" = true ] && [ -f "$PROJECT_ROOT/logs/api.pid" ]; then
            local api_pid=$(cat "$PROJECT_ROOT/logs/api.pid")
            if ! kill -0 "$api_pid" 2>/dev/null; then
                log_warning "API service has stopped unexpectedly"
            fi
        fi
        
        if [ "$start_orchestrator" = true ] && [ -f "$PROJECT_ROOT/logs/orchestrator.pid" ]; then
            local orch_pid=$(cat "$PROJECT_ROOT/logs/orchestrator.pid")
            if ! kill -0 "$orch_pid" 2>/dev/null; then
                log_warning "Orchestrator service has stopped unexpectedly"
            fi
        fi
        
        if [ "$start_rentcast" = true ] && [ -f "$PROJECT_ROOT/logs/rentcast-fetcher.pid" ]; then
            local rentcast_pid=$(cat "$PROJECT_ROOT/logs/rentcast-fetcher.pid")
            if ! kill -0 "$rentcast_pid" 2>/dev/null; then
                log_warning "RentCast Fetcher service has stopped unexpectedly"
            fi
        fi
    done
}

# Run main function
main "$@"