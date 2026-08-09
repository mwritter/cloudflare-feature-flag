import styles from "./ApplicationsLists.module.css";
import { useApplicationContext } from "../../context/ApplicationProvider";

export function ApplicationsList() {
  const { applications, selectedApp, setSelectedApp } = useApplicationContext();

  return (
    <div className={styles.applicaitonsList}>
      <h2>Applications</h2>
      {applications.length === 0 ? (
        <p className={styles.empty}>No applications yet.</p>
      ) : (
        <ul className={styles.list}>
          {applications.map((app) => (
            <li key={app.id}>
              <button
                type="button"
                className={`${styles.item}${selectedApp?.id === app.id ? ` ${styles.itemActive}` : ""}`}
                onClick={() => setSelectedApp(app)}
              >
                {app.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
