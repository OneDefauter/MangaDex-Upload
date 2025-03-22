import requests

class DetectLanguageAPI:
    def detect_language(self, text, API_KEY):
        url = "https://ws.detectlanguage.com/0.2/detect"
        headers = {
            "Authorization": f"Bearer {API_KEY}"
        }
        data = {
            "q": text
        }
        
        response = requests.post(url, headers=headers, data=data)
        if response.ok:
            result = response.json()
            if result.get("data") and result["data"].get("detections"):
                detection = result["data"]["detections"][0]
                data = {
                    "language": detection.get("language"),
                    "isReliable": detection.get("isReliable"),
                    "confidence": detection.get("confidence")
                }
                return data
