"""Tests the iter-8 'send-to-my-agent' addition.

The /api/share-demo endpoint gained a new optional `share_target` field
("demo" default, or "preview"). When `preview`, the email link points at
/preview (read-only Command Center) instead of /demo/{vertical}.
"""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
                break
assert BASE_URL, "REACT_APP_BACKEND_URL required"
BASE_URL = BASE_URL.rstrip("/")


def test_share_demo_default_target_links_to_demo():
    r = requests.post(f"{BASE_URL}/api/share-demo", json={
        "recipient_email": "TEST_iter8_default@example.com",
        "sender_name": "Jeffrey",
        "demo_type": "realtor",
        "origin_url": BASE_URL,
    }, timeout=10)
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["demo_url"].endswith("/demo/realtor")


def test_share_demo_preview_target_links_to_preview():
    r = requests.post(f"{BASE_URL}/api/share-demo", json={
        "recipient_email": "TEST_iter8_preview@example.com",
        "sender_name": "Jeffrey",
        "demo_type": "realtor",  # required by schema; ignored when target=preview
        "share_target": "preview",
        "origin_url": BASE_URL,
    }, timeout=10)
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["demo_url"].endswith("/preview"), body
    assert "/demo/" not in body["demo_url"]


def test_share_demo_invalid_target_rejected():
    r = requests.post(f"{BASE_URL}/api/share-demo", json={
        "recipient_email": "TEST_iter8_bad@example.com",
        "sender_name": "X",
        "demo_type": "realtor",
        "share_target": "INVALID",
    }, timeout=10)
    assert r.status_code == 422
