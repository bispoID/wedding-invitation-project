# Testar e inspecionar o site localmente no Android Emulator

Este procedimento permite testar o HTML/CSS/JavaScript localmente em um celular virtual do Android Studio, sem precisar fazer deploy no GitHub Pages a cada alteração.

## 1. Abrir o Android Emulator

1. Abra o **Android Studio**.
2. Abra o **Device Manager**.
3. Inicie o dispositivo virtual **Medium Phone**.
4. Aguarde o Android iniciar.
5. Abra o **Chrome** dentro do emulador.

---

## 2. Iniciar o servidor local

Abra o **PowerShell** na pasta que contém o `index.html`.

```powershell
cd "C:\caminho\para\o\projeto\invite-app"
```

Inicie o servidor Python:

```powershell
python -m http.server 8000 --bind 0.0.0.0
```

Mantenha esse terminal aberto enquanto estiver testando.

---

## 3 Acesso

### Acessar o site no Android Emulator

No Chrome do emulador, acesse:

```text
http://10.0.2.2:8000
```
O endereço `10.0.2.2` permite que o Android Emulator acesse o `localhost` do computador hospedeiro.


### Acessar o site no Windows

No Chrome/edge, acesse:

```text
http://localhost:8000
```


---

## 4. Inspecionar pelo Edge

No **Microsoft Edge** do Windows, abra:

```text
edge://inspect/#devices
```

Em **Remote Target**, localize a página aberta no Chrome do emulador e clique em **inspect**.

O DevTools será aberto conectado ao Chrome do Android Emulator.

---

# Procedimentos de recuperação

Os procedimentos abaixo **não fazem parte do fluxo normal**. Utilize-os somente se o dispositivo ou a página não aparecer em `edge://inspect/#devices`.

## Recuperação 1 — verificar o ADB

Execute no PowerShell:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

O resultado esperado é semelhante a:

```text
List of devices attached
emulator-5554   device
```

## Recuperação 2 — encaminhar a porta do DevTools

Se o Edge continuar sem detectar o Chrome do emulador:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" forward tcp:9222 localabstract:chrome_devtools_remote
```

O comando deverá retornar:

```text
9222
```

## Recuperação 3 — verificar o DevTools remoto

No navegador do computador, acesse:

```text
http://localhost:9222/json
```

Se aparecer um JSON contendo informações sobre a página aberta no Chrome do Android, o DevTools remoto está funcionando.

Depois, volte para:

```text
edge://inspect/#devices
```

e atualize a página.

---

## Fluxo normal resumido

```text
Android Studio
    ↓
Abrir Medium Phone
    ↓
Chrome no emulador
    ↓
python -m http.server 8000
    ↓
http://10.0.2.2:8000
    ↓
Edge → edge://inspect/#devices
    ↓
inspect
```

Para testar alterações, basta salvar os arquivos e recarregar a página no Chrome do emulador.

**Não é necessário fazer um novo deploy no GitHub Pages a cada alteração.**
