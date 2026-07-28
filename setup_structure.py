"""
setup_structure.py
Creates the folder/file skeleton for the Customer Support Knowledge Assistant project.

Usage:
    python setup_structure.py
"""

import os

# Folders to create (relative to project root)
FOLDERS = [
    "backend",
    "backend/routers",
    "backend/services",
    "backend/tests",
    "frontend",
    "data",
    ".github/workflows",
]

# Files to create (empty), relative to project root
FILES = [
    "backend/main.py",
    "backend/config.py",
    "backend/database.py",
    "backend/models.py",
    "backend/schemas.py",
    "backend/dependencies.py",
    "backend/routers/__init__.py",
    "backend/services/__init__.py",
    "backend/tests/__init__.py",
    "frontend/app.py",
    "data/sample_data.json",
    "Dockerfile",
    "docker-compose.yml",
    "requirements.txt",
    ".env.example",
    "README.md",
    ".github/workflows/deploy.yml",
]


def create_folders():
    for folder in FOLDERS:
        os.makedirs(folder, exist_ok=True)
        print(f"[created folder] {folder}")


def create_files():
    for file_path in FILES:
        # Ensure parent folder exists (safety net in case FOLDERS list is out of sync)
        parent_dir = os.path.dirname(file_path)
        if parent_dir and not os.path.exists(parent_dir):
            os.makedirs(parent_dir, exist_ok=True)

        if not os.path.exists(file_path):
            with open(file_path, "w") as f:
                pass  # create empty file
            print(f"[created file]   {file_path}")
        else:
            print(f"[skipped]        {file_path} (already exists)")


if __name__ == "__main__":
    print("Setting up project structure...\n")
    create_folders()
    print()
    create_files()
    print("\nDone. Run 'tree' (or check your file explorer) to verify.")