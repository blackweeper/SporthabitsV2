"""IronFlow backend tests - health + parse-plan (Gemini 3 Flash)."""
import os, io, base64, pytest, requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://training-log-107.preview.emergentagent.com").rstrip("/")


def _make_workout_image_b64() -> str:
    """Create a real JPEG image containing workout plan text (real edges/textures)."""
    W, H = 900, 700
    img = Image.new("RGB", (W, H), (245, 240, 230))
    d = ImageDraw.Draw(img)
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        body_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
    except Exception:
        title_font = body_font = ImageFont.load_default()

    # Add texture (diagonal lines) to avoid uniform variance
    for i in range(0, W + H, 25):
        d.line([(i, 0), (0, i)], fill=(220, 215, 205), width=1)

    d.rectangle([(30, 30), (W - 30, H - 30)], outline=(40, 40, 40), width=3)
    d.text((60, 60), "Seance Pectoraux", fill=(20, 20, 20), font=title_font)
    lines = [
        "1. Developpe couche  4 x 8   90s repos",
        "2. Ecarte haltere    3 x 12  60s repos",
        "3. Dips              3 x 10  60s repos",
        "4. Pompes            3 x 15  45s repos",
    ]
    y = 160
    for ln in lines:
        d.text((70, y), ln, fill=(30, 30, 30), font=body_font)
        y += 60

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode()


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_health(api):
    r = api.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["llm_key_configured"] is True


def test_root(api):
    r = api.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200
    assert "message" in r.json()


def test_parse_plan_valid_image(api):
    b64 = _make_workout_image_b64()
    r = api.post(f"{BASE_URL}/api/parse-plan", json={"image_base64": b64}, timeout=90)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:400]}"
    data = r.json()
    assert "title" in data and isinstance(data["title"], str) and data["title"]
    assert "exercises" in data and isinstance(data["exercises"], list)
    assert len(data["exercises"]) >= 1, f"No exercises parsed: {data}"
    ex = data["exercises"][0]
    for k in ("name", "sets", "reps", "weight", "rest_seconds"):
        assert k in ex, f"Missing '{k}' in exercise: {ex}"
    assert isinstance(ex["sets"], int)
    assert isinstance(ex["reps"], str)
    assert isinstance(ex["rest_seconds"], int)


def test_parse_plan_malformed_base64(api):
    r = api.post(f"{BASE_URL}/api/parse-plan", json={"image_base64": "!!!not-valid-base64!!!"}, timeout=60)
    # Should fail gracefully (not 200, not 5xx from Python crash without handler)
    assert r.status_code in (400, 422, 500, 502), f"Unexpected status {r.status_code}: {r.text[:300]}"


def test_parse_plan_missing_field(api):
    r = api.post(f"{BASE_URL}/api/parse-plan", json={}, timeout=15)
    assert r.status_code == 422
