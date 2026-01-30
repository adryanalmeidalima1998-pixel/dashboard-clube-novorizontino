import csv
import json

def process_csv(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        players = []
        for row in reader:
            # Mapear os campos da nova planilha para o formato esperado pelo dashboard
            # Note que a nova planilha parece ser a própria central de dados ou similar
            player = {
                "Numero": row.get('?', row.get('Numero', '-')),
                "Jogador": row.get('Jogador', ''),
                "Nacionalidade": row.get('Nacionalidade', ''),
                "Altura": row.get('Altura', '-'),
                "Idade": row.get('Idade', '-'),
                "Posicao": row.get('Posição', row.get('Posicao', '')),
                "Index": row.get('Index', '-'),
                "Partidas": row.get('Partidas jogadas', row.get('Partidas', '0')),
                "Gols": row.get('Gols', '0'),
                "Acoes_Sucesso": row.get('Ações / com sucesso %', '0%'),
                "Passes_Precisos": row.get('Passes precisos %', '0%'),
                "Dribles": row.get('Dribles bem sucedidos', '0'),
                "Desafios": row.get('Desafios vencidos, %', '0%'),
                "Nota_Media": "-" # Removendo notas conforme solicitado
            }
            if player["Jogador"]:
                players.append(player)
        return players

def main():
    players = process_csv('/home/ubuntu/novo_elenco.csv')
    
    # Salvar no formato JS
    with open('/home/ubuntu/rebuild_temp/app/plantel/dados_elenco.js', 'w', encoding='utf-8') as f:
        f.write("export const elencoReal = " + json.dumps(players, indent=2, ensure_ascii=False) + ";")
    
    print(f"Processados {len(players)} jogadores da nova planilha.")

if __name__ == "__main__":
    main()
