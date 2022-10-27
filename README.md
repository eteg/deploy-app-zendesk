# deploy-app-zendesk

Action do github feita para realizar deploy de aplicatios zendesk.

## Modo de uso

***

Adicione a etapa a seguir após o step de build da aplicação.


```yaml
  - name: Deploy App Zendesk
    uses: eteg/deploy-app-zendesk@v1
```


Dentro desse step deve ser passado os seguintes parâmetros:


```yaml
  - name: Deploy App Zendesk
    uses: eteg/deploy-app-zendesk@v1
    with:
      # Subdomínio do ambiente zendesk
	    ZENDESK_SUBDOMAIN: “domain.zendesk.com”
		
      # Email para acesso do ambiente zendesk
      ZENDESK_EMAIL: ${{  secrets.EMAIL  }}
      
      # API_TOKEN gerado no ambiente zendesk
      ZENDESK_API_TOKEN: ${{  secrets.API_TOKEN  }}
      
      # Ambiente onde será realizado o deploy
      ENV: "develop"
      
      # Parâmetros do manifest
      PARAMS: "{}"
      
      # Opcional. Diretório raiz do app
      PATH: ${{ matrix.working-directory }}
```


**Obs: Após a execução da action será criado um arquivo de configuração chamado “zendesk.apps.config.json” na raiz do projeto. Ele será utilizado para identificar e registrar o id do aplicativo de acordo com cada ambiente.**


## Exemplo de uso


***


No exemplo a seguir usamos os environments e as secrets do github para salvar e gerenciar nossas secrets. Utilizamos também os nomes das branchs para ditar qual o environment irá ser realizado o deploy.


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
          PARAMS: "{ \"pou\": \"POU\", \"zelda\": \"fadinha\" }"
          PATH: ${{ matrix.working-directory }}
          ZENDESK_SUBDOMAIN: ${{  secrets.SUBDOMAIN  }}
          ZENDESK_EMAIL: ${{  secrets.EMAIL  }}
          ZENDESK_API_TOKEN: ${{  secrets.API_TOKEN  }}
```

