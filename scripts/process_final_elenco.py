import csv
import json

def process_csv(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        # A planilha parece ter um cabeçalho na primeira linha
        reader = csv.DictReader(f)
        players = []
        for row in reader:
            # Extrair o número do jogador (parece estar na primeira coluna sem nome ou com '?')
            numero = row.get('?', row.get('', '-'))
            if not numero or numero == 'nan':
                # Tentar pegar pela primeira chave se o DictReader não mapeou corretamente
                first_key = list(row.keys())[0]
                numero = row.get(first_key, '-')

            player = {
                "Numero": numero,
                "Jogador": row.get('Jogador', ''),
                "Nacionalidade": row.get('Nacionalidade', 'BRA'),
                "Altura": row.get('Altura', '-'),
                "Idade": row.get('Idade', '-'),
                "Posicao": row.get('Posição', row.get('Posicao', '')),
                "Index": row.get('Index', '-'),
                "Partidas": row.get('Partidas jogadas', '0'),
                "Gols": row.get('Gols', '0'),
                "Acoes_Sucesso": row.get('Ações / com sucesso %', '0%'),
                "Passes_Precisos": row.get('Passes precisos %', '0%'),
                "Dribles": row.get('Dribles bem sucedidos', '0'),
                "Desafios": row.get('Desafios vencidos, %', '0%'),
                "Minutos": row.get('Minutos jogados', '0')
            }
            if player["Jogador"]:
                players.append(player)
        return players

def main():
    players = process_csv('/home/ubuntu/novo_elenco.csv')
    
    # Salvar no formato JS
    with open('/home/ubuntu/rebuild_temp/app/plantel/dados_elenco.js', 'w', encoding='utf-8') as f:
        f.write("export const elencoReal = " + json.dumps(players, indent=2, ensure_ascii=False) + ";")
    
    print(f"Sucesso! {len(players)} jogadores processados da nova planilha mestre.")

if __name__ == "__main__":
    main()
