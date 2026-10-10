// App-wide settings, and backup: saving everything to a file and bringing it back.

import { useRef, useState } from 'preact/hooks';
import { changeSettings, settings, type Settings as SettingsValues } from '../kit/settings';
import { loadAll, replaceAll } from '../storage/kv';
import { languages, t, type Language } from './strings';

/** What a backup file must say it is, so a stray file is never restored. */
const BACKUP_MARK = 'elsas-games-backup';

function Choice<V extends string>(props: { label: string; value: V; choices: Record<V, string>; onPick(v: V): void }) {
  const values = Object.keys(props.choices) as V[];
  return (
    <section class="setting">
      <h2>{props.label}</h2>
      <div class="ratings">
        {values.map((v) => (
          <button type="button" key={v} class={v === props.value ? 'on' : ''} aria-pressed={v === props.value} onClick={() => props.onPick(v)}>
            {props.choices[v]}
          </button>
        ))}
      </div>
    </section>
  );
}

async function saveBackup() {
  const file = { app: BACKUP_MARK, version: 1, savedAt: new Date().toISOString(), data: await loadAll() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `games-backup-${file.savedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Settings({ onExit }: { onExit(): void }) {
  const s = settings();
  const picker = useRef<HTMLInputElement>(null);
  // A backup that has been read and is waiting for her to confirm.
  const [pending, setPending] = useState<Record<string, unknown> | null>(null);
  const [bad, setBad] = useState(false);

  const set = (change: Partial<SettingsValues>) => changeSettings(change);

  const readBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.app !== BACKUP_MARK || typeof parsed.data !== 'object' || !parsed.data) throw new Error('not a backup');
      setBad(false);
      setPending(parsed.data);
    } catch {
      setBad(true);
    }
  };

  const restore = async () => {
    if (!pending) return;
    await replaceAll(pending);
    // Start afresh so every screen reads the restored data.
    location.reload();
  };

  return (
    <main class="page">
      <header class="bar">
        <button type="button" class="ghost back" aria-label={t.play.back} onClick={onExit}>
          ‹
        </button>
        <h1>{t.settings.title}</h1>
      </header>

      <Choice
        label={t.settings.language}
        value={s.language}
        choices={Object.fromEntries(Object.entries(languages).map(([k, v]) => [k, v.name])) as Record<Language, string>}
        onPick={(language) => set({ language })}
      />
      <Choice label={t.settings.theme} value={s.theme} choices={t.settings.themes} onPick={(theme) => set({ theme })} />
      <Choice label={t.settings.textSize} value={s.textSize} choices={t.settings.textSizes} onPick={(textSize) => set({ textSize })} />
      <Choice
        label={t.settings.timer}
        value={s.showTimer ? 'yes' : 'no'}
        choices={{ no: t.settings.no, yes: t.settings.yes }}
        onPick={(v) => set({ showTimer: v === 'yes' })}
      />

      <section class="setting">
        <h2>{t.settings.backup}</h2>
        <p>{t.settings.backupBody}</p>
        <div class="ratings stacked">
          <button type="button" onClick={() => void saveBackup()}>
            {t.settings.save}
          </button>
          <button type="button" onClick={() => picker.current?.click()}>
            {t.settings.restore}
          </button>
        </div>
        <input
          ref={picker}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void readBackup(e.currentTarget.files?.[0]);
            e.currentTarget.value = '';
          }}
        />
        {bad && <p class="warning">{t.settings.badFile}</p>}
      </section>

      {pending && (
        <div class="sheet" role="dialog" aria-label={t.settings.restore}>
          <h2>{t.settings.restore}</h2>
          <p>{t.settings.restoreSure}</p>
          <div class="ratings">
            <button type="button" onClick={() => setPending(null)}>
              {t.settings.cancel}
            </button>
            <button type="button" onClick={() => void restore()}>
              {t.settings.restoreYes}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
