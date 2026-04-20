# Architecture

Coffer is a local-first, offline-capable PWA. No data leaves the device. Everything is encrypted in IndexedDB using keys derived from the user's master password.

---

## Crypto model

```
password + salt  ──PBKDF2-SHA256 (200k iter)──►  CryptoKey (AES-256-GCM, non-extractable)
```

- **Salt** — 16 random bytes, generated once at first launch and stored in plaintext in the `settings` store. Needed to re-derive the same key on future logins.
- **CryptoKey** — lives only in memory inside `SessionState.unlocked.key`. Never persisted. Closing the tab loses the key.
- **Verification token** — the fixed string `"coffer-v1-ok"` encrypted with the derived key, stored in `settings`. On login, decrypting this token proves the password is correct without touching real data.
- **Encrypted values** — `base64(IV[12 bytes] + AES-GCM ciphertext)`. The IV is freshly generated per write and prepended to the output so the reader can extract it without out-of-band storage.

---

## Session state machine

```
loading ──► setup    (no salt found — first launch)
loading ──► locked   (salt found — returning user)
setup   ──► unlocked (password created)
locked  ──► unlocked (correct password entered)
unlocked──► locked   (logout or auto-lock timeout)
```

The `SessionProvider` drives all transitions. Auto-lock uses `useAutoLock`, which monitors mouse/keyboard/touch activity and locks immediately if the tab was hidden long enough for the timeout to have elapsed.

---

## Persistence

**Object stores (IndexedDB `coffer` v1):**

| Store | Key | Value |
|-------|-----|-------|
| `settings` | `"salt"` | base64 Uint8Array |
| `settings` | `"verificationToken"` | base64(IV + ciphertext) |
| `settings` | `"lockTimeoutMinutes"` | `"5"` \| `"15"` \| `"30"` \| `"60"` \| `"never"` |
| `months` | `"YYYY-MM"` | base64(IV + ciphertext of MonthData JSON) |

All month data is encrypted before any write. `readMonth` decrypts and validates against `monthDataSchema`.

---

## Data model

```
MonthData {
  key: "YYYY-MM"
  expenses: Expense[]
  incomes: Income[]
  saving: number     // BRL amount set aside; subtracted from BRL balance
  adjustment: number // manual BRL correction (can be negative)
  budget: number     // optional spending threshold for UI warning (0 = off)
}
```

**Balance formula** (computed in `useYearSummary`):

```
balance[currency] = income[currency] - debit[currency] - credit[currency]
balance[BRL]     -= saving
balance[BRL]     += adjustment
```

Saving and adjustment are BRL-only because they are entered as plain numbers without a currency selector.

**Expense debit vs credit:**  
Both fields can be > 0 on the same record (e.g., partially paid in cash and partially by card). The schema enforces that at least one must be > 0.

---

## Month navigation and propagation

When the user moves **forward** one month (`goForward`), the app:

1. Reads the current month as the source of propagation.
2. Reads (or creates) the next month.
3. Calls `syncFixed` to find fixed expenses and in-progress installments not yet in the next month.
4. Clones recurring incomes (matched by `source + currency`) not yet in the next month.
5. If anything changed or the next month was new, writes the merged result to the DB.
6. Navigates to the next month.

**`syncFixed` identity rule:** expenses are matched by `name (case-insensitive) + category`. Two expenses with the same name but different currencies are treated as distinct.

**Installments:** the `installments` field counts remaining months to pay. `syncFixed` propagates when `installments > 1` and decrements by 1. When `installments === 1`, the expense is in its final month and won't be copied forward.

---

## Backup format

A `.coffer` backup file is a JSON envelope:

```json
{
  "version": 1,
  "salt": "<base64>",
  "ciphertext": "<base64(IV + AES-GCM(gzip(JSON(payload))))>"
}
```

The `salt` in the envelope is independent of the session salt — it is used to derive a key from the **backup password**, which may differ from the session password. This allows restoring a backup to a different device or account.

On import, each month is validated against `monthDataSchema` before being written. If any month fails validation the entire restore is aborted.

---

## CSV export/import

CSV files follow the format of the Google Sheets finance template the app was designed around.

- **Export** is BRL-only. Non-BRL entries are excluded silently.
- **Import** reads the summary row (row 2) for saving/adjustment/income total, then expense rows (row 4+) with category carry-forward.
- Both operations are one-shot: export downloads the current month; import requires the user to supply the target `YYYY-MM` key.
