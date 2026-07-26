"""IronFlow backend tests - health + parse-plan (Gemini 3 Flash)."""
import os, io, base64, pytest, requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = (
    os.environ.get("EXPO_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://training-log-107.preview.emergentagent.com"
).rstrip("/")


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


def _make_wod_image_b64() -> str:
    """Create a real JPEG describing a WOD (time-based)."""
    W, H = 900, 600
    img = Image.new("RGB", (W, H), (255, 245, 230))
    d = ImageDraw.Draw(img)
    try:
        tf = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
        bf = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
    except Exception:
        tf = bf = ImageFont.load_default()
    for i in range(0, W + H, 22):
        d.line([(i, 0), (0, i)], fill=(230, 220, 200), width=1)
    d.rectangle([(30, 30), (W - 30, H - 30)], outline=(60, 30, 30), width=3)
    d.text((60, 55), "WOD Cardio", fill=(20, 20, 20), font=tf)
    for i, ln in enumerate([
        "5 min burpees",
        "5 min mountain climbers",
        "5 min jumping jacks",
    ]):
        d.text((70, 150 + i * 70), ln, fill=(30, 30, 30), font=bf)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode()


def _make_amrap_image_b64() -> str:
    W, H = 900, 500
    img = Image.new("RGB", (W, H), (240, 250, 255))
    d = ImageDraw.Draw(img)
    try:
        tf = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        bf = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except Exception:
        tf = bf = ImageFont.load_default()
    for i in range(0, W + H, 20):
        d.line([(i, 0), (0, i)], fill=(220, 230, 240), width=1)
    d.rectangle([(30, 30), (W - 30, H - 30)], outline=(30, 30, 60), width=3)
    d.text((60, 55), "AMRAP 12 min", fill=(20, 20, 20), font=tf)
    d.text((70, 180), "10 squats", fill=(30, 30, 30), font=bf)
    d.text((70, 240), "+ 5 pompes", fill=(30, 30, 30), font=bf)
    d.text((70, 330), "Autant de tours que possible", fill=(60, 60, 60), font=bf)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode()


def test_parse_plan_wod_time_mode(api):
    b64 = _make_wod_image_b64()
    r = api.post(f"{BASE_URL}/api/parse-plan", json={"image_base64": b64}, timeout=90)
    assert r.status_code == 200, f"Got {r.status_code}: {r.text[:400]}"
    data = r.json()
    assert isinstance(data.get("exercises"), list) and len(data["exercises"]) >= 1
    # Every exercise must expose mode & duration_seconds fields (regression on schema)
    for ex in data["exercises"]:
        assert "mode" in ex
        assert "duration_seconds" in ex
    time_ex = [e for e in data["exercises"] if e["mode"] == "time"]
    assert len(time_ex) >= 1, f"Expected at least 1 time-mode exercise, got: {data['exercises']}"
    # duration should be reasonably close to 5 min (300s). Accept 60..600 for LLM leeway.
    for e in time_ex:
        assert isinstance(e["duration_seconds"], int)
        assert 60 <= e["duration_seconds"] <= 900, f"duration out of range: {e}"


def test_parse_plan_amrap_mode(api):
    b64 = _make_amrap_image_b64()
    r = api.post(f"{BASE_URL}/api/parse-plan", json={"image_base64": b64}, timeout=90)
    assert r.status_code == 200, f"Got {r.status_code}: {r.text[:400]}"
    data = r.json()
    modes = [e.get("mode") for e in data["exercises"]]
    assert "amrap" in modes, f"Expected an amrap exercise, got modes: {modes}"
    amrap = [e for e in data["exercises"] if e["mode"] == "amrap"][0]
    assert isinstance(amrap["duration_seconds"], int)
    # 12 min = 720s. Allow 300..1200 for LLM variability.
    assert 300 <= amrap["duration_seconds"] <= 1200, f"amrap duration: {amrap}"


def _make_emom_image_b64() -> str:
    """Create a JPEG describing an EMOM workout."""
    W, H = 900, 550
    img = Image.new("RGB", (W, H), (250, 245, 255))
    d = ImageDraw.Draw(img)
    try:
        tf = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        bf = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except Exception:
        tf = bf = ImageFont.load_default()
    for i in range(0, W + H, 22):
        d.line([(i, 0), (0, i)], fill=(220, 215, 230), width=1)
    d.rectangle([(30, 30), (W - 30, H - 30)], outline=(50, 30, 80), width=3)
    d.text((60, 55), "EMOM 10 min", fill=(20, 20, 20), font=tf)
    d.text((70, 180), "10 pompes chaque minute", fill=(30, 30, 30), font=bf)
    d.text((70, 240), "Every Minute On the Minute", fill=(60, 60, 60), font=bf)
    d.text((70, 330), "Pendant 10 minutes", fill=(60, 60, 60), font=bf)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode()


def test_parse_plan_emom_mode(api):
    """EMOM regression: image describing EMOM should yield mode='emom', sets≈10, reps='10', duration_seconds=60."""
    b64 = _make_emom_image_b64()
    r = api.post(f"{BASE_URL}/api/parse-plan", json={"image_base64": b64}, timeout=90)
    assert r.status_code == 200, f"Got {r.status_code}: {r.text[:400]}"
    data = r.json()
    modes = [e.get("mode") for e in data["exercises"]]
    assert "emom" in modes, f"Expected an emom exercise, got modes: {modes}"
    emom = [e for e in data["exercises"] if e["mode"] == "emom"][0]
    # sets should be around 10 (LLM leeway)
    assert isinstance(emom["sets"], int)
    assert 5 <= emom["sets"] <= 15, f"sets out of range for EMOM: {emom}"
    assert isinstance(emom["reps"], str) and emom["reps"] != ""
    # duration is a full minute (LLM may return 60 exactly or close)
    assert isinstance(emom["duration_seconds"], int)
    assert 30 <= emom["duration_seconds"] <= 120, f"duration_seconds out of range: {emom}"


def test_parse_plan_schema_includes_emom_field(api):
    """Every returned exercise must include mode in the allowed set including 'emom'."""
    b64 = _make_emom_image_b64()
    r = api.post(f"{BASE_URL}/api/parse-plan", json={"image_base64": b64}, timeout=90)
    assert r.status_code == 200
    data = r.json()
    for ex in data["exercises"]:
        assert ex.get("mode") in ("reps", "time", "amrap", "emom")


def test_parse_plan_classic_has_mode_and_duration_fields(api):
    """Regression: classic musculation image response must still include mode + duration_seconds keys per exercise."""
    b64 = _make_workout_image_b64()
    r = api.post(f"{BASE_URL}/api/parse-plan", json={"image_base64": b64}, timeout=90)
    assert r.status_code == 200
    data = r.json()
    for ex in data["exercises"]:
        assert "mode" in ex
        assert ex["mode"] in ("reps", "time", "amrap", "emom")
        assert "duration_seconds" in ex  # may be null for reps


def test_parse_plan_malformed_base64(api):
    r = api.post(f"{BASE_URL}/api/parse-plan", json={"image_base64": "!!!not-valid-base64!!!"}, timeout=60)
    # Should fail gracefully (not 200, not 5xx from Python crash without handler)
    assert r.status_code in (400, 422, 500, 502), f"Unexpected status {r.status_code}: {r.text[:300]}"


def test_parse_plan_missing_field(api):
    r = api.post(f"{BASE_URL}/api/parse-plan", json={}, timeout=15)
    assert r.status_code == 422
