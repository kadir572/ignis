import { BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import RootLayout from './components/layouts/root.layout'
import HomePage from './components/pages/home/page'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<RootLayout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
    </Router>
  )
}