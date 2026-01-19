Gerçek Çözüm: Enforcement Mechanisms
Rules "tavsiyeler" değil "emir" yapmak için, sen şu mekanizmaları eklemelisin:
1. Hooks (Pre-Tool-Use Enforcement)
bash# PreToolUse hook
if [ commit_message_has_no_conventional_format ]; then
  REJECT_COMMIT
fi
Claude commit yapacakken, hook çalışıyor ve rejectliyor. Rules'a uyması OPTIONAL değil, FORCED.
2. Linters & Formatters (Automated Enforcement)
Rule: "Use Prettier for formatting"
Ama bunu CLI'ye embed et:
bashprettier --write src/
Claude bunu run'ediyor. Format automatic.
3. Permission Restrictions (settings.json)
Bazı komutları yasakla:
json{
  "permissions": {
    "deny": [
      "Bash(rm -rf /)",
      "Bash(commit without tests passing)"
    ]
  }
}
```

### 4. **Subagent-Level Rules**
Eğer backend expert subagent'i varsa, o subagent'in kendi CLAUDE.md'si olsun ve **daha strict rules'u** orada yap. Subagent invoke olunduğunda, o rules otomatik aktif.

## Senin İçin Gerçek Tavsiye

Rules yazıp hoppa bitmez. Burası çok önemli:

**Yazılı rules ≠ Uyulan rules**

Sen şunu yapmalısın:

1. **Rules'u** → `.claude/rules/` (baseline, context'te her zaman)
2. **Enforcement'u** → **Hooks + Permissions** (technical barriers)
3. **Verification'u** → **Pre-commit checks** (automated validation)

Örneğin:
```
Rules: "All API endpoints must validate input with Zod"
↓
Hook: Pre-commit, files staged'deyse src/api/**/*.ts
      Run: npm run type-check && npm run lint
↓
Enforcement: Eğer lint fail'erse commit reject
Claude bunu unutamaz. Çünkü git CLI ona reject veriyor. Rules file'ını "göz ardı etme" lüksü yok.