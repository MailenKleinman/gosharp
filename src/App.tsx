import { useState } from 'react'
import { Box, Tabs, Tab, AppBar } from '@mui/material'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import BpmnEditor from './workflows/BPMNEditor/BPMNEditor'
import Workflows from './workflows/Workflows'
import Forms from './forms/Forms'

function Home() {
  const [count, setCount] = useState(0)

  return (
    <Box sx={{ p: 3 }}>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </Box>
  )
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{ height: value === index ? '100%' : 0, width: '100%', overflow: 'hidden' }}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%', width: '100%', overflow: 'hidden' }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', m: 0, p: 0 }}>
      <AppBar position="static" color="default" elevation={1} sx={{ flexShrink: 0 }}>
        <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)} aria-label="navigation tabs" >
          <Tab label="Observation Tools" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Workflows" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Executions" id="tab-2" aria-controls="tabpanel-2" />
        </Tabs>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'hidden', m: 0, p: 0 }}>
        <TabPanel value={tabValue} index={0}>
          <Forms />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Workflows />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <BpmnEditor />
        </TabPanel>
      </Box>
    </Box>
  )
}

export default App
