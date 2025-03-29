import { getVersion } from '@tauri-apps/api/app'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    const tauriVersion = async () => {
      try {
        setVersion(await getVersion())
      } catch (e) {
        console.error(e)
      }
    }

    tauriVersion()
  }, [])
  return (
    <header className='px-4 py-2 flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        <Link to='/'>
          <span className='text-3xl font-bold dark:text-slate-200'>Ignis</span>
        </Link>
        <span className='bg-slate-200 dark:bg-slate-800 dark:text-slate-200 px-3 py-px rounded-md text-sm'>
          v{version}
        </span>
      </div>
      <div className='flex items-center gap-2'>
        {/* <Link to='/'>Encryption</Link> */}
        {/* <Link to='/payment'>Payment</Link> */}
      </div>
    </header>
  )
}
