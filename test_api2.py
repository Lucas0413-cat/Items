import requests
print("Testing API with longer timeout...")

# Test without Dify (faster)
try:
    r = requests.post("http://localhost:5000/api/generate-questions",
        json={"section": "reading", "difficulty": "medium", "count": 1},
        timeout=30)
    print(f"Normal Generate: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        if 'data' in data and 'passages' in data['data']:
            p = data['data']['passages'][0]
            print(f"Title: {p.get('title', 'N/A')}")
            print(f"Questions: {len(p.get('questions', []))}")
except Exception as e:
    print(f"Normal Generate Error: {e}")