import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@petpals/theme/ThemeProvider.jsx'
import ClinicDashboard from './components/ClinicDashboard'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider>
            <ClinicDashboard />
        </ThemeProvider>
    </React.StrictMode>,
)
