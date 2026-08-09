import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { Applicaiton, Flags } from "../types"

export type ApplicationContextType = {
    applications: Applicaiton[],
    selectedApp: Applicaiton | undefined,
    flags: Flags | undefined,
    setSelectedApp: (app: Applicaiton) => void
}

const ApplicationContext = createContext({} as ApplicationContextType)

export function ApplicationProvider({ children }: { children: ReactNode }) {

    const [applications, setApplications] = useState<Array<Applicaiton>>([])
    const [selectedApp, setSelectedApp] = useState<Applicaiton | undefined>()
    const [flags, setFlags] = useState<Flags>()

    const handleSelectApp = (app: Applicaiton) => {
        setSelectedApp(app)
    }

    useEffect(() => {
        fetch('/api/applications')
            .then(res => res.json())
            .then(setApplications)
    }, [])

    useEffect(() => {
        if (selectedApp) {
            fetch(`/api/flags?application_id=${selectedApp.id}`)
                .then(res => res.json())
                .then(result => setFlags(result.data))
                .catch(err => console.error(err))
        }
    }, [selectedApp])

    return <ApplicationContext value={{ applications, selectedApp, flags, setSelectedApp: handleSelectApp }}>
        {children}
    </ApplicationContext>
}


// eslint-disable-next-line react-refresh/only-export-components
export const useApplicationContext = () => useContext(ApplicationContext)