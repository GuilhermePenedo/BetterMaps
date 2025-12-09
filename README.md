# BetterMaps

Aplicação interativa de mapas que permite explorar rotas baseadas em dados do OpenStreetMap (OSM), traçar rotas entre pontos de interesse e obter informações relevantes sobre o trajeto e a área circundante, incluindo previsões meteorológicas e pontos turísticos.

## Funcionalidades

- **Exploração de Mapas**: Visualização interativa de mapas usando OpenStreetMap
- **Cálculo de Rotas**: Traçado de rotas entre origem e destino com suporte para diferentes modos de transporte (carro, bicicleta, a pé)
- **Rotas Turísticas**: Descoberta automática de pontos de interesse ao longo do trajeto
- **Rotas Climáticas**: Visualização de condições meteorológicas ao longo da rota com segmentos coloridos
- **Geocoding**: Conversão de endereços em coordenadas e vice-versa
- **Localização GPS**: Uso da localização atual do utilizador como ponto de partida
- **Interface Moderna**: Design limpo e responsivo com painel lateral e modais informativos

## Arquitetura

O projeto está organizado em uma arquitetura modular, separando frontend (React) e backend (Django REST Framework).

### Frontend (`/frontend`)

Estrutura modular organizada em:

```
src/
├── components/          # Componentes React
│   ├── map/            # Componentes específicos do mapa
│   │   ├── LocationMarker.js
│   │   ├── MapCenterController.js
│   │   ├── MapMarkers.js
│   │   ├── RouteModal.js
│   │   ├── SidePanel.js
│   │   └── ZoomTracker.js
│   └── MapCompontent.js # Componente principal
├── hooks/               # Custom hooks
│   ├── useMapIcons.js
│   ├── useRouteData.js
│   └── useUserLocation.js
├── icons/               # Ícones SVG e Leaflet
│   ├── mapIcons.js
│   └── uiIcons.js
├── services/            # Serviços de API
│   └── api.js
├── utils/               # Funções utilitárias
│   ├── formatters.js
│   └── iconHelpers.js
└── styles/              # Estilos CSS
    └── MapComponent.css
```

### Backend (`/backend`)

API REST organizada em módulos:

```
routes/
├── models.py            # Modelos Django (SimpleTouristPoint)
├── views/               # Views organizadas por funcionalidade
│   ├── osrm_views.py    # Views OSRM (rotas)
│   └── geocoding_views.py # Views de geocoding
├── services/            # Serviços modulares
│   ├── config.py        # Configurações e constantes
│   ├── osrm_service.py  # Serviço principal de rotas
│   ├── weather_service.py # Serviço de meteorologia
│   ├── tourism_service.py # Serviço de pontos turísticos
│   ├── geocoding_service.py # Serviço de geocoding
│   └── utils.py         # Funções utilitárias
└── urls.py              # Configuração de URLs
```

## Tecnologias

### Frontend
- **React 19.2** - Framework JavaScript
- **React Leaflet 5.0** - Integração com Leaflet
- **Leaflet 1.9.4** - Biblioteca de mapas
- **Axios 1.12.2** - Cliente HTTP para API

### Backend
- **Django 5.2** - Framework Python
- **Django REST Framework 3.15** - API REST
- **httpx 0.28.1** - Cliente HTTP assíncrono
- **SQLite3** - Banco de dados (desenvolvimento)

### APIs Externas
- **OSRM** - Serviço de roteamento (router.project-osrm.org)
- **OpenStreetMap Routing** - Rotas para bicicleta e pedestres
- **Open-Meteo** - Previsão meteorológica
- **Nominatim** - Geocoding e reverse geocoding

## Instalação

### Pré-requisitos
- Node.js (v16 ou superior)
- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)

### Backend

1. Navegue para a pasta do backend:
```bash
cd backend
```

2. Crie um ambiente virtual (recomendado):
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

3. Instale as dependências:
```bash
pip install -r requirements.txt
```

4. Execute as migrações:
```bash
python manage.py migrate
```

5. (Opcional) Carregue pontos turísticos:
```bash
python manage.py load_points
```

6. Inicie o servidor:
```bash
python manage.py runserver
```

O backend estará disponível em `http://localhost:8000`

### Frontend

1. Navegue para a pasta do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm start
```

O frontend estará disponível em `http://localhost:3000`

## Endpoints da API

### Rotas OSRM
- `GET /api/osrm/nearest/` - Encontra a estrada mais próxima
  - Parâmetros: `lng`, `lat`, `profile` (opcional)
  
- `GET /api/osrm/route/` - Calcula rota entre dois pontos
  - Parâmetros: `origin_lng`, `origin_lat`, `dest_lng`, `dest_lat`, `profile` (opcional), `tourist` (opcional), `climatic` (opcional)

### Geocoding
- `GET /api/geocode/` - Converte endereço em coordenadas
  - Parâmetros: `address`
  
- `GET /api/reverse-geocode/` - Converte coordenadas em endereço
  - Parâmetros: `lat`, `lng`

## Estrutura de Dados

### Modelo SimpleTouristPoint
- `name` - Nome do ponto de interesse
- `category` - Categoria (ex: museum, castle)
- `lat` - Latitude
- `lng` - Longitude

## Funcionalidades Detalhadas

### Rotas Turísticas
Quando ativada, a funcionalidade de rotas turísticas:
- Analisa o trajeto base entre origem e destino
- Identifica pontos de interesse próximos ao longo da rota
- Adiciona até 15 waypoints para desviar e passar por pontos turísticos
- Retorna lista de pontos encontrados para exibição no mapa

### Rotas Climáticas
Quando ativada, a funcionalidade de rotas climáticas:
- Divide a rota em segmentos baseados na distância total
- Obtém previsões meteorológicas para cada segmento (batch requests otimizados)
- Coloriza os segmentos conforme as condições:
  - Sol (código ≤ 1)
  - Nublado (código ≤ 3)
  - Nevoeiro (código ≤ 48)
  - Chuva (código ≤ 67)
  - Neve (código ≤ 77)
  - Aguaceiros (código ≤ 82)
  - Trovoada (código ≥ 95)

## Testes

### Backend
```bash
cd backend
python manage.py test
```

### Frontend
```bash
cd frontend
npm test
```

## Build para Produção

### Frontend
```bash
cd frontend
npm run build
```

### Backend
Configure as variáveis de ambiente e use um servidor WSGI como Gunicorn:
```bash
gunicorn backend.wsgi:application
```

## Contribuição

Este projeto foi desenvolvido com uma arquitetura modular para facilitar manutenção e extensão. Ao adicionar novas funcionalidades:

- **Frontend**: Organize componentes em pastas apropriadas, use hooks customizados para lógica reutilizável
- **Backend**: Crie novos serviços em `routes/services/` e views correspondentes em `routes/views/`

## Licença

Este projeto é desenvolvido para fins educacionais e de demonstração.

## Autor

Desenvolvido como parte do projeto BetterMaps.
