import requests
print("Testing API...")

# Health check
try:
    r = requests.get("http://localhost:5000/api/health", timeout=5)
    print(f"Health: {r.status_code}")
    print(r.json())
except Exception as e:
    print(f"Health Error: {e}")

# Generate questions
try:
    r = requests.post("http://localhost:5000/api/generate-questions",
        json={"section": "reading", "difficulty": 6.5, "count": 1},
        timeout=10)
    print(f"Generate: {r.status_code}")
    print(r.text[:300])
except Exception as e:
    print(f"Generate Error: {e}")