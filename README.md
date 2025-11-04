# BetterMaps

O objetivo deste projeto é desenvolver uma aplicação interativa que permita ao utilizador explorar um mapa baseado nos dados do OpenStreetMap (OSM), traçar rotas entre pontos de interesse e obter informações relevantes sobre o trajeto e a área circundante.

## Objetivos Gerais

- Fornecer uma interface de mapa interativa e intuitiva.
- Permitir a seleção de origem e destino diretamente no mapa.
- Calcular e apresentar rotas com base na **API OSRM (Open Source Routing Machine)**.
- Exibir informações detalhadas da rota (distância, tempo estimado, tipo de percurso).
- Integrar funcionalidades como:
  - **Rotas Turísticas** (pontos de interesse e locais culturais);
  - **Rota de Emergência** (rotas seguras e alerta a contactos);
  - **Rota de Meteorológica** (condições meteorológicas locais).

## Use Case Diagram
<img src="https://i.imgur.com/XD0fC3C.png" width=800 height=auto>

## Decisões Tecnológicas

| Área | Decisão | Justificação |
|------|----------|--------------|
| **Mapa Base** | OpenStreetMap (OSM) | Fonte aberta e flexível de dados geográficos. |
| **Cálculo de Rotas** | OSRM API | Rápida, gratuita e de fácil integração via REST/JSON. |
| **Frontend** | HTML, CSS, JavaScript (React e Leaflet) | Permite construir uma aplicação leve e responsiva com controlo total do mapa. |
| **Backend** | Python (Django) | Uma framework que já utilizámos em outros projetos que conjuga bem com React. |
| **APIs Externas** | OpenWeatherMap (microclima) | Integração modular e extensível. |
| **Gestão de Projeto** | GitHub + Scrum (Trello) | Gestão iterativa com controlo de progresso por sprints. |
| **Armazenamento Local** | SQLite (Django) | Armazena histórico de rotas e preferências offline. |

## Desenho do Software

O sistema é composto por **módulos principais** que interagem entre si:

### **Camada de Apresentação (Frontend)**
- Interface gráfica interativa baseada em Leaflet.
- Controlo de zoom, pan e seleção de pontos.
- Painel lateral para exibir opções de menu.

### **Camada Lógica (Backend)**
- **RouteService** → comunicação com OSRM para cálculo de trajetos.  
- **MapService** → carregamento de dados do mapa OSM e gestão de camadas.  
- **WeatherService** → integração com API Meteorológica para microclimas.  
- **EmergencyService** → cálculo de rotas seguras em caso de emergência.

### **Camada de Dados**
- **Base de Dados Local / API** → armazenamento de pontos de interesse e histórico de rotas.
- **APIs Externas** → fornecem dados em tempo real (rotas e clima).

## Diagrama de Classes (Resumo)

<img src="https://i.imgur.com/B8pj58j.png" width=1000 height=auto>

## Planeamento e Gestão de Projeto

Todo o planeamento e gestão do projeto encontra-se no **[Trello](https://trello.com/b/h8m5Zs6d/project-general)**.

## Equipa
| Nome | Função | Responsabilidades |
|------|---------|-------------------|
| João Antunes | Scrum Master | Coordenação do projeto e gestão de tarefas |
| João Antunes | Developer Frontend | Interface, Leaflet.js, React.js, UX/UI |
| Guilherme Penedo | Developer Frontend | Interface, Leaflet.js, React.js, UX/UI |
| João Antunes | Developer Backend | Integração com APIs e lógica de rotas em Python (Django) |
| Guilherme Penedo | Developer Backend | Integração com APIs e lógica de rotas em Python (Django) |
| Guilherme Penedo | QA / Documentação | Testes, relatórios e documentação técnica |
