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
  ZENDESK_SUBDOMAIN: ${{  SUBDOMAIN  }}

  # Email para acesso do ambiente zendesk
  ZENDESK_EMAIL: ${{  EMAIL  }}

  # API_TOKEN gerado no ambiente zendesk
  ZENDESK_API_TOKEN: ${{  API_TOKEN  }}

  # Ambiente onde será realizado o deploy
  ENV: "develop"

  # Parâmetros do manifest
  PARAMS: "{}"

  # Opcional. Caminho do diretório raiz do app. Default: '/'
  PATH: ${{ matrix.working-directory }}
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

**Obs: Um app sofre atualizações caso o ENV inserido esteja registrado no arquivo a cima, caso contrário, um novo app será criado. Para se ter um app em um ambiente zendesk diferente, é preciso que não só o ENV como também os inputs ZENDESK_SUBDOMAIN, ZENDESK_EMAIL e ZENDESK_API_TOKEN sejam diferentes.**

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
          ENV: ${{ github.ref_name }}
          PARAMS: '{ "pou": "POU", "zelda": "fadinha" }'
          PATH: ${{ matrix.working-directory }}
          ZENDESK_SUBDOMAIN: ${{  secrets.SUBDOMAIN  }}
          ZENDESK_EMAIL: ${{  secrets.EMAIL  }}
          ZENDESK_API_TOKEN: ${{  secrets.API_TOKEN  }}
```
