import { invoke } from '@tauri-apps/api/core'
import { ask, message } from '@tauri-apps/plugin-dialog'
import { check } from '@tauri-apps/plugin-updater'

export const checkForAppUpdates = async (onUserClick: false) => {
  const update = await check()
  if (update === null) {
    return await message('Failed to check for updates. \nPlease try again later.', {
      title: 'Error',
      kind: 'error',
      okLabel: 'OK'
    })
  } else if (update?.available) {
    const yes = await ask(`Update to ${update.version} is available! \nRelease notes: ${update.body}`, {
      title: 'Update Available',
      kind: 'info',
      okLabel: 'Update',
      cancelLabel: 'Cancel'
    })

    if (yes) {
      await update.downloadAndInstall()
      await invoke('graceful_restart')
    }
  } else if (onUserClick) {
    await message('You are on the latest version. Stay awesome!', {
      title: 'No Updates Available',
      kind: 'info',
      okLabel: 'OK'
    })
  }
}