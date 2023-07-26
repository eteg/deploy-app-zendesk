# deploy-app-zendesk

Action do github que realiza o deploy de aplicatios zendesk.

## Modo de uso

---

Após realizar o build da aplicação, incluir o step seguinte:

```yaml
- name: Deploy App Zendesk
  uses: eteg/deploy-app-zendesk@v1
```

Dentro desse step deve ser passado os seguintes parâmetros:

```yaml
with:
  # Subdomínio do ambiente zendesk
  zendesk_subdomain: ${{  SUBDOMAIN  }}

  # Email para acesso do ambiente zendesk
  zendesk_email: ${{  EMAIL  }}

  # API_TOKEN gerado no ambiente zendesk
  zendesk_api_token: ${{  API_TOKEN  }}

  # Ambiente onde será realizado o deploy
  environment: "develop"

  # Parâmetros do manifest
  params: "{}"

  # Opcional. Caminho do diretório raiz do app. Default: './'
  path: ${{ matrix.working-directory }}

  # Opcional. Caminho do app enpacotado em .zip. Não pode ser definido em conjunto com 'path'
  package: ${{ matrix.working-directory }}/app.zip

  # Opcional. Caminho do diretório que contém o arquivo zendesk.apps.config.json. Default: '/'
  zendesk_apps_config_path: ${{ matrix.working-directory }}
```

Após a execução da action, será criado o arquivo “zendesk.apps.config.json” na raiz do projeto. Nele, estão registradas os IDs dos apps e em quais ambientes cada um deles foi implantado. Ex:

```json
{
  "ids": {
    "dev": 12345,
    "prod": 98765
  }
}
```

**Obs: Um app sofre atualizações caso o `environment` inserido esteja registrado no arquivo a cima, caso contrário, um novo app será criado. Para se ter um app em um ambiente zendesk diferente, é preciso que não só o `environment` como também os inputs `zendesk_subdomain`, `zendesk_email` e `zendesk_api_token` sejam diferentes.**

## Exemplo de uso

---

No exemplo a seguir usamos os environments e as secrets do github para salvar e gerenciar as nossas secrets. Utilizamos também os nomes das branchs para ditar em qual environment será realizado o deploy.

```yaml
name: app-deploy

on:
  push:
    branches: ["main", "develop"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: ${{ github.ref_name }}
    strategy:
      matrix:
        node-version: [16.15.1]
        working-directory: [./]

    steps:
      - name: Check out repository code
        uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: "yarn"
          cache-dependency-path: "yarn.lock"

      - name: Install Yarn
        run: npm i yarn -g

      - name: Install app dependencies
        run: yarn
        working-directory: ${{ matrix.working-directory }}

      - name: Build Zendesk App
        run: yarn build
        working-directory: ${{ matrix.working-directory }}

      - name: Deploy Zendesk App
        uses: eteg/deploy-app-zendesk@v1
        with:
          environment: ${{ github.ref_name }}
          params: '{ "pou": "POU", "zelda": "fadinha" }'
          path: '${{ matrix.working-directory }}/dist'
          zendesk_apps_config_path: ${{ matrix.working-directory }}
          zendesk_subdomain: ${{  secrets.SUBDOMAIN  }}
          zendesk_email: ${{  secrets.EMAIL  }}
          zendesk_api_token: ${{  secrets.API_TOKEN  }}
```
