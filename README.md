# BetterMaps

O objetivo deste projeto é desenvolver uma aplicação interativa que permita ao utilizador explorar um mapa baseado nos dados do OpenStreetMap (OSM), traçar rotas entre pontos de interesse e obter informações relevantes sobre o trajeto e a área circundante.

## Objetivos Gerais

- Fornecer uma interface de mapa interativa e intuitiva.
- Permitir a seleção de origem e destino diretamente no mapa.
- Calcular e apresentar rotas com base na **API OSRM (Open Source Routing Machine)**.
- Exibir informações detalhadas da rota (distância, tempo estimado, tipo de percurso).
- Integrar funcionalidades como:
  - **Rotas Normais** (cálculo de rotas padrão entre origem e destino);
  - **Rotas Turísticas** (pontos de interesse e locais culturais ao longo do trajeto);
  - **Rotas Climáticas** (condições meteorológicas locais ao longo da rota com segmentos coloridos).

## Use Case Diagram
<img src="https://i.imgur.com/XD0fC3C.png" width=800 height=auto>

## Decisões Tecnológicas

| Área | Decisão | Justificação |
|------|----------|--------------|
| **Mapa Base** | OpenStreetMap (OSM) | Fonte aberta e flexível de dados geográficos. |
| **Cálculo de Rotas** | OSRM API | Rápida, gratuita e de fácil integração via REST/JSON. |
| **Frontend** | HTML, CSS, JavaScript (React e Leaflet) | Permite construir uma aplicação leve e responsiva com controlo total do mapa. |
| **Backend** | Python (Django) | Uma framework que já utilizámos em outros projetos que conjuga bem com React. |
| **APIs Externas** | Open-Meteo (previsão meteorológica), Nominatim (geocoding), OSRM (roteamento) | Integração modular e extensível com APIs gratuitas e de código aberto. |
| **Gestão de Projeto** | GitHub + Scrum (Trello) | Gestão iterativa com controlo de progresso por sprints. |
| **Armazenamento Local** | SQLite (Django) | Armazena histórico de rotas e preferências offline. |

## Desenho do Software

O sistema é composto por **módulos principais** que interagem entre si:

### **Camada de Apresentação (Frontend)**
- Interface gráfica interativa baseada em Leaflet.
- Controlo de zoom, pan e seleção de pontos.
- Painel lateral para exibir opções de menu.

### **Camada Lógica (Backend)**
- **OSRM Service** → comunicação com OSRM para cálculo de trajetos e rotas.  
- **Weather Service** → integração com Open-Meteo API para previsões meteorológicas ao longo da rota.  
- **Tourism Service** → gestão e busca de pontos de interesse turísticos na base de dados local.  
- **Geocoding Service** → integração com Nominatim para conversão de endereços em coordenadas e vice-versa.

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

## Testes de Atributos de Qualidade

Este projeto implementa testes abrangentes para validar os atributos de qualidade definidos, garantindo que o sistema atende aos requisitos de interoperabilidade, usabilidade, modificabilidade e performance.

### A. Interoperabilidade (Interoperability)

**Justificação**: O sistema é fundamentalmente um integrador. Ele precisa de comunicar eficazmente com múltiplos sistemas externos (OSRM, Open-Meteo, Nominatim).

**Requisito**: O Backend deve ser capaz de normalizar as respostas JSON destas APIs diferentes num formato único e padrão para o Frontend consumir.

**Resultados dos Testes**:
- ✅ **PASSOU** - Todos os 4 testes passaram
  - `test_osrm_response_normalization`: Valida normalização da resposta OSRM com `weather_segments` e `tourist_spots`
  - `test_weather_api_response_normalization`: Valida normalização da resposta Open-Meteo para formato padrão
  - `test_nominatim_response_normalization`: Valida formato consistente da resposta Nominatim
  - `test_unified_response_structure`: Valida estrutura unificada que o frontend pode consumir

**Conclusão**: O backend normaliza com sucesso as respostas de todas as APIs externas (OSRM, Open-Meteo, Nominatim) num formato único e consistente, facilitando o consumo pelo frontend.

---

### B. Usabilidade (Usability)

**Justificação**: O README define como objetivo "fornecer uma interface de mapa interativa e intuitiva".

**Requisito**: A interface deve permitir "Zoom, Pan e Seleção" sem latência percetível na renderização gráfica. O sistema deve fornecer feedback visual imediato ao traçar rotas.

**Resultados dos Testes**:
- ✅ **PASSOU** - Todos os 5 testes passaram (2 backend + 3 frontend)
  
  **Backend:**
  - `test_route_response_time_acceptable`: Tempo de resposta de rotas < 2s ✅
  - `test_geocode_response_time_acceptable`: Tempo de resposta de geocoding < 1s ✅
  
  **Frontend:**
  - `B.1 - Interface permite zoom sem latência percetível`: Latência < 16ms (60fps) ✅
  - `B.2 - Seleção de pontos fornece feedback visual imediato`: Tempo de resposta < 100ms ✅
  - `B.3 - Renderização de rotas não bloqueia interface`: Interface não bloqueia por mais de 2s ✅

**Conclusão**: A interface permite interações (zoom, pan, seleção) sem latência percetível e fornece feedback visual imediato, garantindo uma experiência de utilizador fluida.

---

### C. Modificabilidade (Modularity/Maintainability)

**Justificação**: O projeto divide-se em serviços claros (RouteService, WeatherService, TourismService).

**Requisito**: A arquitetura deve permitir adicionar um novo serviço (ex: um futuro "EmergencyService") sem ter de reescrever o código do RouteService. O uso do Django promove este desacoplamento.

**Resultados dos Testes**:
- ✅ **PASSOU** - Todos os 6 testes passaram
  - `test_osrm_service_independent`: OSRM Service pode ser usado independentemente ✅
  - `test_weather_service_independent`: Weather Service pode ser usado independentemente ✅
  - `test_geocoding_service_independent`: Geocoding Service pode ser usado independentemente ✅
  - `test_tourism_service_independent`: Tourism Service pode ser usado independentemente ✅
  - `test_new_service_can_be_added`: Novo serviço pode ser adicionado sem modificar serviços existentes ✅
  - `test_services_use_standard_interfaces`: Serviços seguem interfaces padrão que facilitam extensão ✅

**Conclusão**: A arquitetura é modular e permite adicionar novos serviços sem modificar código existente. Todos os serviços são independentes e seguem interfaces padrão, facilitando a manutenção e extensão do sistema.

---

### D. Performance (Time Behaviour)

**Justificação**: O cálculo de rotas e a exibição de dados meteorológicos precisam de ser rápidos para não bloquear a navegação no mapa.

**Requisito**: O tempo de resposta entre o pedido de rota e a visualização deve ser otimizado, delegando o processamento pesado para as APIs externas (OSRM é citada como "rápida").

**Resultados dos Testes**:
- ✅ **PASSOU** - Todos os 5 testes passaram (3 backend + 2 frontend)
  
  **Backend:**
  - `test_route_calculation_performance`: Cálculo de rotas < 0.5s (com mocks) ✅
  - `test_weather_batch_performance`: Batch weather (50 pontos) < 1s ✅
  - `test_route_with_climatic_performance`: Rotas climáticas < 1s ✅
  
  **Frontend:**
  - `D.1 - Tempo entre pedido de rota e visualização é otimizado`: API responde < 100ms (com mocks) ✅
  - `D.2 - Processamento de segmentos climáticos é eficiente`: Processamento de 50 segmentos < 200ms ✅

**Conclusão**: O sistema demonstra excelente performance, com tempos de resposta otimizados tanto no backend quanto no frontend. O processamento pesado é delegado para APIs externas, mantendo a interface responsiva.

---

### Resumo Executivo

| Atributo | Testes | Status | Taxa de Sucesso |
|----------|--------|--------|-----------------|
| **A. Interoperabilidade** | 4 | ✅ PASSOU | 100% (4/4) |
| **B. Usabilidade** | 5 | ✅ PASSOU | 100% (5/5) |
| **C. Modificabilidade** | 6 | ✅ PASSOU | 100% (6/6) |
| **D. Performance** | 5 | ✅ PASSOU | 100% (5/5) |
| **TOTAL** | **20** | ✅ **PASSOU** | **100% (20/20)** |

**Executar os Testes**:
- **Backend**: `cd backend && python manage.py test routes.tests.test_quality_attributes -v 2`
- **Frontend**: `cd frontend && npm test -- qualityAttributes.test.js --watchAll=false`