import { useMemo, useState, type FormEvent } from "react";
import { useApplicationContext } from "../../context/ApplicationProvider";
import { useToast } from "../../context/ToastProvider";
import styles from "./FlagList.module.css";

export function FlagList() {
  const { flags, selectedApp, upsertFlag, isPending } =
    useApplicationContext();
  const { setToast } = useToast();

  const [newKey, setNewKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => {
    if (!flags) return [];
    return Object.entries(flags).map(([k]) => k);
  }, [flags]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const key = newKey.trim();
    if (!key || !selectedApp) return;

    setError(null);
    try {
      await upsertFlag(key, false);
      setNewKey("");
      setToast({
        type: "success",
        message: `Created flag "${key}"`,
      });
    } catch {
      setError("Could not create flag");
      setToast({
        type: "error",
        message: `Failed to create flag "${key}"`,
      });
    }
  };

  const handleToggle = async (flag: string, value: boolean) => {
    try {
      await upsertFlag(flag, value);
      setToast({
        type: "success",
        message: `"${flag}" ${value ? "enabled" : "disabled"}`,
      });
    } catch {
      setToast({
        type: "error",
        message: `Failed to update "${flag}"`,
      });
    }
  };

  return (
    <div className={styles.flagList}>
      <h2>{selectedApp ? `Flags · ${selectedApp.name}` : "Flags"}</h2>
      {!selectedApp ? (
        <p className={styles.empty}>Select an application to view flags.</p>
      ) : (
        <>
          <form className={styles.create} onSubmit={handleCreate}>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="new_flag_key"
              aria-label="Flag key"
              disabled={isPending}
            />
            <button type="submit" disabled={isPending || !newKey.trim()}>
              Add
            </button>
          </form>
          {error ? <p className={styles.error}>{error}</p> : null}
          {list.length === 0 ? (
            <p className={styles.empty}>No flags for this application.</p>
          ) : (
            <ul className={styles.list}>
              {list.map((flag) => (
                <li key={flag}>
                  <FlagListItem
                    name={flag}
                    enabled={flags![flag]}
                    onToggle={(value) => handleToggle(flag, value)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

const FlagListItem = ({
  name,
  enabled,
  onToggle,
}: {
  name: string;
  enabled: boolean;
  onToggle: (value: boolean) => Promise<void>;
}) => {
  return (
    <label className={styles.item}>
      <span className={styles.name}>{name}</span>
      <span className={styles.toggle}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            void onToggle(e.target.checked);
          }}
        />
        <span className={styles.track} aria-hidden="true" />
      </span>
    </label>
  );
};
