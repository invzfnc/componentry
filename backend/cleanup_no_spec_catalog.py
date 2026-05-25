import json
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).parent


def load_env_file() -> None:
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()


def env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def supabase_headers() -> dict[str, str]:
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SERVICE_KEY")
        or env("SUPABASE_ANON_KEY")
    )
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def request_json(url: str, method: str = "GET") -> list[dict]:
    request = Request(url, method=method, headers=supabase_headers())
    with urlopen(request, timeout=30) as response:
        if response.status == 204:
            return []
        return json.loads(response.read().decode("utf-8"))


def main() -> None:
    supabase_url = env("SUPABASE_URL").rstrip("/")
    rows_url = urljoin(supabase_url + "/", "rest/v1/catalog?select=*")
    rows = request_json(rows_url)
    no_spec_rows = [row for row in rows if not row.get("specs")]

    backup_dir = Path("C:/tmp")
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"catalog_no_specs_backup_{timestamp}.json"
    backup_path.write_text(json.dumps(no_spec_rows, indent=2), encoding="utf-8")

    for row in no_spec_rows:
        row_id = quote(row["id"])
        delete_url = urljoin(supabase_url + "/", f"rest/v1/catalog?id=eq.{row_id}")
        request_json(delete_url, method="DELETE")

    print(f"Backed up {len(no_spec_rows)} no-spec rows to {backup_path}")
    print(f"Deleted {len(no_spec_rows)} no-spec rows from Supabase catalog.")


if __name__ == "__main__":
    main()
