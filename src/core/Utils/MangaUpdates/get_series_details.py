import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def get_series_details(mangaupdates_url):
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(mangaupdates_url, headers=headers)
    if response.status_code != 200:
        return {"error": f"Erro ao acessar a página: {response.status_code}"}
    
    soup = BeautifulSoup(response.text, "html.parser")
    script_tag = soup.find("script", {"type": "application/ld+json"})
    if not script_tag:
        return {"error": "Erro: Não foi possível encontrar os metadados JSON-LD na página."}
    
    try:
        json_data = json.loads(script_tag.string)
        series_id = json_data.get("identifier")
        if not series_id:
            return {"error": "Erro: Series ID não encontrado nos metadados."}
    except json.JSONDecodeError:
        return {"error": "Erro ao analisar os metadados JSON-LD."}
    
    api_details_url = f"https://api.mangaupdates.com/v1/series/{series_id}"
    response = requests.get(api_details_url, headers=headers)
    if response.status_code != 200:
        return {"error": f"Erro ao obter detalhes da série: {response.status_code}, {response.text}"}
    
    return response.json()

def get_final_url(mu):
    url = f"https://www.mangaupdates.com/series.html?id={mu}"
    try:
        # Permite redirecionamentos para capturar a URL final
        response = requests.get(url, allow_redirects=True, timeout=10)
        return response.url
    except requests.RequestException as e:
        print(f"Erro ao acessar a URL: {e}")
        return None

def is_same_series(url1, url2):
    """
    Verifica se url2 é 'a mesma série' que url1,
    considerando que url2 pode ter um slug adicional.
    Exemplo:
        url1 -> https://www.mangaupdates.com/series/llwjwub
        url2 -> https://www.mangaupdates.com/series/llwjwub/isekai-meikyuu-de-harem-o
    """
    p1 = urlparse(url1)
    p2 = urlparse(url2)
    
    # Verifica se o domínio é igual
    if p1.netloc != p2.netloc:
        return False
    
    # Se o caminho de url2 começar com o caminho de url1,
    # consideramos como "mesma série".
    # Ex: p1.path = '/series/llwjwub'
    #     p2.path = '/series/llwjwub/isekai-meikyuu-de-harem-o'
    return p2.path.startswith(p1.path.rstrip('/'))
