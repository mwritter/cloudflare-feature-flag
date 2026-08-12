import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type { Applicaiton, Flags } from "../types";

type FlagUpdate = { key: string; enabled: boolean };

export type ApplicationContextType = {
  applications: Applicaiton[];
  selectedApp: Applicaiton | undefined;
  flags: Flags | undefined;
  isPending: boolean;
  setSelectedApp: (app: Applicaiton) => void;
  upsertFlag: (key: string, enabled: boolean) => Promise<void>;
};

const ApplicationContext = createContext({} as ApplicationContextType);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<Array<Applicaiton>>([]);
  const [selectedApp, setSelectedApp] = useState<Applicaiton | undefined>();
  const [flags, setFlags] = useState<Flags>();
  const [isPending, startTransition] = useTransition();

  const [optimisticFlags, setOptimisticFlags] = useOptimistic(
    flags,
    (current: Flags | undefined, { key, enabled }: FlagUpdate): Flags => ({
      ...(current ?? {}),
      [key]: enabled,
    }),
  );

  const handleSelectApp = (app: Applicaiton) => {
    setSelectedApp(app);
  };

  const upsertFlag = useCallback(
    (key: string, enabled: boolean) => {
      if (!selectedApp) {
        return Promise.reject(new Error("No application selected"));
      }

      return new Promise<void>((resolve, reject) => {
        startTransition(async () => {
          setOptimisticFlags({ key, enabled });

          try {
            const res = await fetch("/api/flags", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                application_id: selectedApp.id,
                key,
                enabled,
              }),
            });

            if (!res.ok) {
              throw new Error("Failed to save flag");
            }

            const result = (await res.json()) as {
              key: string;
              enabled: boolean;
            };

            // State updates after await need another transition wrap (React 19)
            startTransition(() => {
              setFlags((prev) => ({
                ...(prev ?? {}),
                [result.key]: result.enabled,
              }));
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    },
    [selectedApp, startTransition, setOptimisticFlags],
  );

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => res.json())
      .then(setApplications);
  }, []);

  useEffect(() => {
    if (selectedApp) {
      // fresh=1 reads D1 so the admin panel isn't affected by KV lag
      fetch(`/api/flags?application_id=${selectedApp.id}&fresh=1`)
        .then((res) => res.json())
        .then((result) => setFlags(result.data))
        .catch((err) => console.error(err));
    }
  }, [selectedApp]);

  return (
    <ApplicationContext
      value={{
        applications,
        selectedApp,
        flags: optimisticFlags,
        isPending,
        setSelectedApp: handleSelectApp,
        upsertFlag,
      }}
    >
      {children}
    </ApplicationContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApplicationContext = () => useContext(ApplicationContext);
