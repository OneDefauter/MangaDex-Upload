### Versão 1.2.0 (21/09/2025)

## ✨ Novidades

* **Painel de Fila (/queue)**: nova página com **Socket.IO em tempo real**, paginação, ordenação e ações para acompanhar **downloads** e **uploads**.
* **Workers de fila**: processo em segundo plano para **downloads** e **uploads** com *heartbeat*, *lease* e recuperação de *jobs*.
* **Configurações dinâmicas (/settings)**:

  * Ajuste de **concorrência** (`dl.simultaneous`, `up.simultaneous`).
  * **Máximo de tentativas** de upload (`up.max_retries`).
  * Alterações críticas reiniciam os workers automaticamente.
* **i18n reestruturado (namespaces)**:

  * Novos arquivos em `app/src/lang/<lang>/{app,web,script}.json`.
  * Persistência de idioma via arquivo (`MangaDex Upload Settings/lang.txt`) e suporte a `APP_LANG`.
* **Agendamento**: utilitário `schedule_at` com normalização de ISO 8601, validações (“formato inválido”, “no passado”, *clamping*).
* **Pré-processamento de upload**:

  * Serviço `upload_preparer` com integração **SmartStitch** para corte/mescla de imagens.
  * Uso de **Pillow** e **natsort**; preparação, compactação e verificação de limites.
  * Emissão de eventos Socket.IO (progresso/erros).
* **Monitor de armazenamento temporário**:

  * `storage_usage` expõe uso de pastas `upload_prefetch_*` e `upload_raw_*` (bytes) para feedback na UI.
* **Suporte atualizado de plataformas**:

  * README renovado com *badges* e guia de uso em **Windows / Linux / macOS / Android**.
  * **Versão portátil (Windows)**: `run.bat` sem instalação.
  * Guia Android revisado (Pydroid3).

## 🛠️ Melhorias

* **README** totalmente revisado com passos de instalação, uso e créditos.
* **Socket.IO** centralizado (`app/src/SocketIO`) e eventos de fila padronizados (`jobs_page`, `jobs_changed`).
* **API da fila** (`/api/...`) para listar páginas da fila com ordenação e limites seguros.
* **Templates/estilos**: novas folhas em `app/static/css/queue` e JS de controle em `app/static/js/queue`.
* **Organização de código**:

  * Novos módulos para **workers** (`app/src/workers/*`) e *runners* de **uploads**/**downloads**.
  * Helpers de banco (`app/src/database/helpers/*`) e serviços de idioma (`app/src/services/language.py`).

## 🐛 Correções

* Tratamento robusto de **datas de agendamento** (mensagens de erro e *clamp* quando fora do limite).
* Consolidação de tradução nas camadas **web/script/app** (evita chaves faltantes e *fallback* inconsistentes).
* Emissão consistente de **toasts/erros** durante preparo de upload (incluindo exceções do SmartStitch/Pillow).

## ♻️ Mudanças internas

* **Estrutura de i18n**: arquivos antigos em `src/locale/*.json` foram **removidos** e substituídos por `app/src/lang/<lang>`.
* **Assets estáticos**: limpeza de ícones/bandeiras e reorganização de CSS/JS para as novas páginas (queue/settings).
* **Versão do app**: arquivo novo `__version__.py` com `VERSION = '1.2.0'`.

### Versão 1.1.3 (14/05/2025)

- Correções sobre a fila

- Corrigido comportamente para android no PC na página de multi upload

- Adicionado atualização em tempo real enquanto estiver no filtro da fila

- Correção ao criar obra na parte de mostrar os resultados encontrados

- Alteração de biblioteca do **opencv** para **scipy**

### Versão 1.1.2 (12/04/2025)

- Uma pequena correção ao buscar obras

### Versão 1.1.1 (03/04/2025)

- Correção sobre PATH nas configurações (android)

- Correção no envio de arquivos CBZ ou ZIP sem pré-processar ativo

- Adicionado uma simples página de erro

### Versão 1.1.0 (22/03/2025)

#### Mudanças

- Foi alterado o plano de fundo

- Agora a pasta de downloads é definida automaticamente

- Mudança em como é lidado com a fila

- Mudança nas notificações

- Pequenas mudanças na página de baixar e editar projetos

####  Adicionados

- Foi adicionado filtro de pesquisa personalizado (encontra-se na página de configurações) (afeta apenas a página de busca)

- Foi adicionado campo para colocar chave da API do "Detect Language" (usado na criação de obras)

- Foi adicionado opção para alterar carregamento simples ou complexo (afeta apenas na página de multi upload)

- Foi adicionado rolagem automática na página de fila

- Foi adicionado filtro na página de fila

- Foi adicionado contexto de menu na página de fila com as opções: Cancelar, Priorizar, Reenviar e Excluir

- Foi adicionado página para criar obra

- Na página de editar projeto, foi adicionado filtro e botão de remover todos os capítulos filtrados

- Foi adicionado tempo de espera para procurar obras e grupos (evitar várias chamadas)

### Versão 1.0.9 (31/12/2024)

- Removido suporte a PSD no [SmartStitch](https://github.com/MechTechnology/SmartStitch)

- Correções

- Corrigindo o envio de capítulos '0'

- Adicionado extração de título dentro de parênteses '()'

### Versão 1.0.8 (28/12/2024)

- Correções

- Adicionado suporte para Android usando [Pydroid3](https://play.google.com/store/apps/details?id=ru.iiec.pydroid3) (~~limitado a Pillow~~)

### Versão 1.0.7 (18/12/2024)

- Correções

### Versão 1.0.6 (24/11/2024)

- Correções

### Versão 1.0.5 (23/11/2024)

- Correção na busca de projetos +18

- Adicionado Multi Upload

- Adicionado opção de pré-processamento de imagens

- Foi implementado o [SmartStitch](https://github.com/MechTechnology/SmartStitch)

- Melhorias na página de configurações


### Versão 1.0.4 (15/09/2024)

- Correções

- Adicionado edição e exclusão de capítulos enviados

### Versão 1.0.3 (26/08/2024)

- Adicionado função de cancelar download e upload na fila e remover itens concluídos

- Adicionado traduções ('en' e 'pt-br')

- Adicionado verificação de imagem

- Adicionado logs de upload

- Adicionado opção de máxima de tentativas de upload em imagens

- Adicionado opção para enviar capítulos com imagens que falharam

- Adicionado opção de esquema da pasta de downloads

- Adicionado opção de qualidade das covers

- Adicionado opção para apagar a pasta das covers

- Adicionado upload para arquivos cbz e zip

- Adicionado botão em upload para selecionar pasta ou arquivo

### Versão 1.0.2 (17/08/2024)

- Pequenas correções

### Versão 1.0.1 (10/08/2024)

- Correção no botão de atualização

- Correção na fila de uploads

- Adicionada tela de carregamento no upload após clicar em "Enviar"

- Adicionada verificação de pasta antes do envio

- Incremento automático do capítulo após um envio bem-sucedido

### Versão 1.0.0 (08/08/2024)

- Versão inicial