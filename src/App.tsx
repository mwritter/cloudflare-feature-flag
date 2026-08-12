import { ApplicationsList } from "./components/ApplicationsList/ApplicationsList";
import { FlagList } from "./components/FlagList/FlagList";
import { ApplicationProvider } from "./context/ApplicationProvider";
import { ToastProver } from "./context/ToastProvider";

export default function App() {
  return (
    <main className="app">
      <header className="appHeader">
        <h1>Feature Flag Admin</h1>
        <p>Select an application, then manage its flags.</p>
      </header>
      <ToastProver>
        <ApplicationProvider>
          <div className="appBody">
            <ApplicationsList />
            <FlagList />
          </div>
        </ApplicationProvider>
      </ToastProver>
    </main>
  );
}
