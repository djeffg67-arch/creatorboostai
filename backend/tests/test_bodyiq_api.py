"""BodyIQ-AI backend API tests.

Covers:
  - POST /api/leads (valid/invalid source/email)
  - POST /api/admin/login (correct/wrong password)
  - GET  /api/admin/leads (auth required, no _id leak)
  - GET  /api/admin/leads/stats
  - GET  /api/admin/leads/export.csv?token=...
  - POST /api/admin/logout (invalidates token)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback to frontend/.env
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break
assert BASE_URL, "REACT_APP_BACKEND_URL is required"
BASE_URL = BASE_URL.rstrip("/")

ADMIN_PASSWORD = "bodyiq-admin-2026"
VALID_SOURCES = ["demo", "demo_training", "training", "contact", "newsletter", "home", "forensic_library"]


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    assert token and isinstance(token, str) and len(token) > 10
    return token


# ---------- /api/leads ----------
@pytest.mark.parametrize("source", VALID_SOURCES)
def test_create_lead_valid_source(session, source):
    payload = {"email": f"TEST_{source}@example.com", "source": source, "name": "Tester"}
    r = session.post(f"{BASE_URL}/api/leads", json=payload)
    assert r.status_code == 201, f"{source} => {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == payload["email"]
    assert data["source"] == source
    assert "id" in data and isinstance(data["id"], str)
    assert "timestamp" in data
    assert "_id" not in data  # no Mongo _id leak


def test_create_lead_invalid_source(session):
    r = session.post(f"{BASE_URL}/api/leads", json={"email": "TEST_bad@example.com", "source": "nope"})
    assert r.status_code == 400


def test_create_lead_invalid_email(session):
    r = session.post(f"{BASE_URL}/api/leads", json={"email": "not-an-email", "source": "home"})
    assert r.status_code == 422


def test_create_lead_with_message(session):
    r = session.post(
        f"{BASE_URL}/api/leads",
        json={
            "email": "TEST_contact_msg@example.com",
            "source": "contact",
            "name": "Contact User",
            "message": "Hello there\nMulti-line",
        },
    )
    assert r.status_code == 201
    d = r.json()
    assert d["message"] == "Hello there\nMulti-line"


# ---------- /api/admin/login ----------
def test_admin_login_wrong_password(session):
    r = session.post(f"{BASE_URL}/api/admin/login", json={"password": "WRONG"})
    assert r.status_code == 401


def test_admin_login_correct_password(admin_token):
    assert admin_token


# ---------- /api/admin/leads ----------
def test_admin_leads_requires_auth(session):
    r = session.get(f"{BASE_URL}/api/admin/leads")
    assert r.status_code == 401


def test_admin_leads_with_token(session, admin_token):
    r = session.get(
        f"{BASE_URL}/api/admin/leads",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= len(VALID_SOURCES)
    for item in data:
        assert "_id" not in item
        assert "id" in item
        assert "email" in item
        assert "source" in item


def test_admin_leads_invalid_token(session):
    r = session.get(
        f"{BASE_URL}/api/admin/leads",
        headers={"Authorization": "Bearer not-a-valid-token"},
    )
    assert r.status_code == 401


# ---------- /api/admin/leads/stats ----------
def test_admin_stats(session, admin_token):
    r = session.get(
        f"{BASE_URL}/api/admin/leads/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "total" in data and isinstance(data["total"], int)
    assert "by_source" in data and isinstance(data["by_source"], dict)
    assert data["total"] >= len(VALID_SOURCES)
    for src in VALID_SOURCES:
        assert src in data["by_source"], f"missing source {src}"


def test_admin_stats_requires_auth(session):
    r = session.get(f"{BASE_URL}/api/admin/leads/stats")
    assert r.status_code == 401


# ---------- /api/admin/leads/export.csv ----------
def test_admin_csv_export(session, admin_token):
    r = session.get(f"{BASE_URL}/api/admin/leads/export.csv", params={"token": admin_token})
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    cd = r.headers.get("content-disposition", "")
    assert "attachment" in cd and ".csv" in cd
    body = r.text
    assert body.startswith("id,email,source,name,message,timestamp")
    assert "TEST_contact_msg@example.com" in body


def test_admin_csv_export_requires_token(session):
    r = session.get(f"{BASE_URL}/api/admin/leads/export.csv", params={"token": "bogus"})
    assert r.status_code == 401


# ---------- /api/admin/logout ----------
def test_admin_logout_invalidates_token(session):
    # Make a fresh token so we don't break other tests
    login = session.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
    assert login.status_code == 200
    t = login.json()["token"]

    # Token works first
    r = session.get(f"{BASE_URL}/api/admin/leads", headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 200

    # Logout
    r = session.post(f"{BASE_URL}/api/admin/logout", headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 200

    # After logout, token should be invalid
    r = session.get(f"{BASE_URL}/api/admin/leads", headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 401
