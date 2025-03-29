import { Outlet } from 'react-router-dom'
import Header from '../partials/header.partial'

export default function RootLayout() {
  return (
    <div className='flex flex-col h-screen w-full'>
      <Header />
      <div className='grow px-4'>
        <Outlet />
      </div>
    </div>
  )
}
