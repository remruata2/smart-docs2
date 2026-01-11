# Docling Production Setup Script
# Run this on your Azure Ubuntu server

set -e # Exit on error

# Use the current directory where the script is run
APP_DIR=$(pwd)
SERVICE_NAME="docling-service"

echo "🚀 Starting Docling Setup..."

# 1. Install System Dependencies
echo "📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip libgl1-mesa-glx

# 2. Setup Python Virtual Environment
echo "🐍 Setting up Python environment..."
cd $APP_DIR

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "Created virtual environment."
else
    echo "Virtual environment already exists."
fi

# 3. Install Python Libraries
echo "⬇️ Installing Python packages (this may take a few minutes)..."
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install docling fastapi uvicorn python-multipart

# 4. Setup Systemd Service
echo "⚙️ Configuring Systemd service..."

# Update the user/path in the service file dynamically based on current user/pwd
CURRENT_USER=$(whoami)
CURRENT_DIR=$(pwd)

sed -i "s|User=ubuntu|User=$CURRENT_USER|g" docling-service.service
sed -i "s|Group=ubuntu|Group=$CURRENT_USER|g" docling-service.service
sed -i "s|WorkingDirectory=/home/ubuntu/ai-exam-prep|WorkingDirectory=$CURRENT_DIR|g" docling-service.service
sed -i "s|ExecStart=/home/ubuntu/ai-exam-prep/.venv/bin/uvicorn|ExecStart=$CURRENT_DIR/.venv/bin/uvicorn|g" docling-service.service

# Copy to systemd directory
sudo cp docling-service.service /etc/systemd/system/$SERVICE_NAME.service

# Reload and Start
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

echo "✅ Setup Complete!"
echo "Service Status:"
sudo systemctl status $SERVICE_NAME --no-pager
