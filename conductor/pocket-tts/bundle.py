import os
import subprocess
import sys
import platform
import shutil

def get_target_triple():
    system = platform.system().lower()
    machine = platform.machine().lower()
    
    if system == "darwin":
        os_name = "apple-darwin"
    elif system == "linux":
        os_name = "unknown-linux-gnu"
    elif system == "windows":
        os_name = "pc-windows-msvc"
    else:
        os_name = "unknown"
        
    if machine == "x86_64":
        arch = "x86_64"
    elif machine in ["arm64", "aarch64"]:
        arch = "aarch64"
    else:
        arch = machine
        
    return f"{arch}-{os_name}"

def run_bundle():
    print("Starting Pocket TTS bundling process...")
    
    target_triple = get_target_triple()
    executable_name = f"pocket-tts-{target_triple}"
    
    # PyInstaller command
    # --onedir: bundle into a directory (faster startup, no extraction)
    # --name: the name of the directory/executable
    # --clean: clean cache
    # --hidden-import: ensure these are included
    cmd = [
        "pyinstaller",
        "--onedir",
        "--noconfirm",
        f"--name={executable_name}",
        "--clean",
        "--hidden-import=flask",
        "--hidden-import=flask_cors",
        "--hidden-import=scipy",
        "--hidden-import=scipy.signal",
        "--hidden-import=scipy.special",
        "--hidden-import=pocket_tts",
        "--hidden-import=sentencepiece",
        "server.py"
    ]
    
    print(f"Executing: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)
    
    print(f"Bundling complete. Executable: dist/{executable_name}")

if __name__ == "__main__":
    run_bundle()
