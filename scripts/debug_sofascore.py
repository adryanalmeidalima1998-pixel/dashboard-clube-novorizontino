import requests
import json

match_id = "15176543" # Jogo contra o Botafogo-SP
url = f"https://api.sofascore.com/api/v1/event/{match_id}/lineups"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

response = requests.get(url, headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print("Keys:", data.keys())
    for team in ['home', 'away']:
        players = data.get(team, {}).get('players', [])
        print(f"Time {team}: {len(players)} jogadores")
        if players:
            p = players[0]
            print(f"Exemplo jogador: {p.get('player', {}).get('name')}")
            print(f"Estatísticas: {p.get('statistics')}")
else:
    print(response.text)
