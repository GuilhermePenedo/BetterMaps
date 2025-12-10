import csv
import os
import sys
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from routes.models import SimpleTouristPoint

# Aumentar o limite de tamanho de campo do CSV para evitar erros em linhas gigantes
csv.field_size_limit(sys.maxsize)


class Command(BaseCommand):
    help = 'Carrega pontos turísticos de um CSV localizado na pasta /data'

    def add_arguments(self, parser):
        parser.add_argument('filename', type=str, help='O nome do ficheiro CSV dentro da pasta data/')

    def handle(self, *args, **kwargs):
        filename = kwargs['filename']
        data_dir = os.path.join(settings.BASE_DIR, 'data')
        file_path = os.path.join(data_dir, filename)

        if not os.path.exists(file_path):
            raise CommandError(f"Ficheiro '{filename}' não encontrado em {data_dir}.")

        self.stdout.write(self.style.WARNING(f"A ler ficheiro: {file_path}"))

        print("A apagar dados antigos da BD...")
        SimpleTouristPoint.objects.all().delete()

        print("A carregar novos dados (isto pode demorar um pouco)...")
        points_to_create = []
        count = 0

        try:
            with open(file_path, 'r', encoding='utf-8') as csvfile:
                # O Overpass Turbo configurámos para usar TAB (\t)
                reader = csv.DictReader(csvfile, delimiter='\t')

                for row in reader:
                    try:
                        name = row.get('name')
                        if not name: continue

                        # Tentar descobrir a categoria olhando para todas as colunas possíveis
                        cat = (
                                row.get('tourism') or
                                row.get('historic') or
                                row.get('amenity') or
                                row.get('natural') or
                                row.get('leisure') or
                                'ponto de interesse'
                        )

                        if not row.get('@lat') or not row.get('@lon'):
                            continue

                        points_to_create.append(SimpleTouristPoint(
                            name=name,
                            category=cat,
                            lat=float(row['@lat']),
                            lng=float(row['@lon'])
                        ))

                        count += 1

                        # Salvar em blocos de 10.000 para não encher a memória do PC
                        if len(points_to_create) >= 10000:
                            SimpleTouristPoint.objects.bulk_create(points_to_create)
                            points_to_create = []
                            print(f"Processados {count} pontos...")

                    except ValueError:
                        continue
                    except Exception as e:
                        # print(f"Erro na linha: {e}") # Comentado para não poluir o terminal
                        pass

            # Salvar os restantes
            if points_to_create:
                SimpleTouristPoint.objects.bulk_create(points_to_create)

            self.stdout.write(self.style.SUCCESS(f"CONCLUÍDO! Total de {count} pontos de Portugal carregados."))

        except Exception as e:
            raise CommandError(f"Erro ao processar o ficheiro: {e}")