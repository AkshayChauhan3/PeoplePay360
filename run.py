import sys
from pathlib import Path
import uvicorn

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print(f"Starting PeoplePay360 Backend from {backend_dir}...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True, app_dir=str(backend_dir))
