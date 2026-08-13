## `.animoriarc.json`, with completion

```json
{
  "rules": {
    "no-gif": "warning",
    "no-duplicate-content": "error",
    "max-file-size-kb": ["warning", 1024]
  }
}
```

Animoria ships a JSON Schema for this file, so VS Code offers completion
and validation for every rule id and its accepted shape as you type.
