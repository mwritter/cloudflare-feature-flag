import { useMemo, useState } from "react";
import { useApplicationContext } from "../../context/ApplicationProvider";
import styles from "./FlagList.module.css";

export function FlagList() {
  const { flags, selectedApp } = useApplicationContext();
  const list = useMemo(() => {
    if (!flags) return [];
    return Object.entries(flags).map(([k]) => k);
  }, [flags]);

  return (
    <div className={styles.flagList}>
      <h2>{selectedApp ? `Flags · ${selectedApp.name}` : "Flags"}</h2>
      {!selectedApp ? (
        <p className={styles.empty}>Select an application to view flags.</p>
      ) : list.length === 0 ? (
        <p className={styles.empty}>No flags for this application.</p>
      ) : (
        <ul className={styles.list}>
          {list.map((flag) => (
            <li key={flag}>
              <FlagListItem name={flag} enabled={flags![flag]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const FlagListItem = ({
  name,
  enabled,
}: {
  name: string;
  enabled: boolean;
}) => {
  const [isEnabled, setIsEnabled] = useState(enabled);

  const handleChange = (value: boolean) => {
    setIsEnabled(value);
    // TODO: toggle flag in db
  };

  return (
    <label className={styles.item}>
      <span className={styles.name}>{name}</span>
      <span className={styles.toggle}>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => handleChange(e.target.checked)}
        />
        <span className={styles.track} aria-hidden="true" />
      </span>
    </label>
  );
};
