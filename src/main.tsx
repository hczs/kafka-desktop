import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './samples/node-api'
// import './index.scss'
import Test from "@/test";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Test />
  </React.StrictMode>,
)

postMessage({ payload: 'removeLoading' }, '*')
