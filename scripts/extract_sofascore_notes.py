import re
import json
import requests
import csv
from io import StringIO

def get_match_ids():
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTx9m5RGrJDNka8hpPUh2k1iTTSSs6lDOyDqNoDFOjBJDG7xCsIcEhdEutK2lKGmc5LgCmcsFcGZBY/pub?output=csv"
    response = requests.get(url)
    if response.status_code != 200:
        return []
    
    csv_text = response.text
    # Debug: imprimir os primeiros 500 caracteres
    print(f"CSV lido ({len(csv_text)} bytes)")
    
    # O CSV pode ter problemas com aspas nos iframes, vamos usar uma regex para pegar os IDs
    ids = re.findall(r'id[:=](\d+)', csv_text)
    return list(set(ids))

def get_player_notes(match_id):
    url = f"https://api.sofascore.com/api/v1/event/{match_id}/lineups"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return {}
        
        data = response.json()
        notes = {}
        
        for team in ['home', 'away']:
            players = data.get(team, {}).get('players', [])
            for p in players:
                player_name = p.get('player', {}).get('name')
                rating = p.get('statistics', {}).get('rating')
                if player_name and rating:
                    if player_name not in notes:
                        notes[player_name] = []
                    notes[player_name].append(float(rating))
        return notes
    except:
        return {}

def main():
    match_ids = get_match_ids()
    print(f"Encontrados {len(match_ids)} IDs de partidas: {match_ids}")
    
    all_notes = {}
    for mid in match_ids:
        print(f"Buscando notas para o jogo {mid}...")
        notes = get_player_notes(mid)
        for player, ratings in notes.items():
            if player not in all_notes:
                all_notes[player] = []
            all_notes[player].extend(ratings)
    
    final_averages = {player: round(sum(r)/len(r), 1) for player, r in all_notes.items() if r}
    
    output_path = '/home/ubuntu/rebuild_temp/app/plantel/notas_sofascore.js'
    with open(output_path, 'w') as f:
        f.write("export const notasSofascore = " + json.dumps(final_averages, indent=2, ensure_ascii=False) + ";")
    
    print(f"Sucesso! {len(final_averages)} jogadores processados. Arquivo salvo em {output_path}")

if __name__ == "__main__":
    main()
