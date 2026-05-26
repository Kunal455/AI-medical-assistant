import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)

def test_analyze_medicine_validation_error():
    # Test endpoint handles empty inputs gracefully (expecting 422 Unprocessable Entity)
    response = client.post("/analyze/medicine", json={})
    assert response.status_code == 422

def test_analyze_medicine_not_found():
    # Mocking openFDA endpoint returning 404
    with patch('requests.get') as mock_get:
        mock_get.return_value.status_code = 404
        response = client.post("/analyze/medicine", json={"medicineName": "NonExistentDrug"})
        assert response.status_code == 200
        assert "error" in response.json()

def test_analyze_medicine_success():
    # Mocking openFDA returning healthy response
    with patch('requests.get') as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "results": [{
                "openfda": {
                    "brand_name": ["Ibuprofen"],
                    "generic_name": ["Ibuprofen"]
                },
                "indications_and_usage": ["Used for pain relief."],
                "warnings": ["Do not overdose."],
                "precautions": ["Consult doctor."],
                "adverse_reactions": ["Stomach upset."]
            }]
        }
        response = client.post("/analyze/medicine", json={"medicineName": "Ibuprofen"})
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "medicine" in data
        assert data["medicine"]["name"] == "Ibuprofen"
