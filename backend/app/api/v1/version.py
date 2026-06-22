import subprocess
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(tags=["version"])

def _read_version() -> str:
    for candidate in [
        Path(__file__).parents[5] / "VERSION",
        Path(__file__).parents[4] / "VERSION",
        Path("/var/www/lawcrm/VERSION"),
    ]:
        if candidate.exists():
            return candidate.read_text().strip()
    return "unknown"

def _read_commit() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            cwd=str(Path(__file__).parents[4]),
        ).decode().strip()
    except Exception:
        return "unknown"

@router.get("/version")
def get_version():
    return {"version": _read_version(), "commit": _read_commit()}
