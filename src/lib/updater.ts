import { invoke } from '@tauri-apps/api/core'
import { ask, message } from '@tauri-apps/plugin-dialog'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { check } from '@tauri-apps/plugin-updater'
import { useState } from 'react'

export const checkForAppUpdates = async (onUserClick = false) => {
  const update = await check()
  console.log(update)
  if (update === null) {
    return await message('Failed to check for updates. \nPlease try again later.', {
      title: 'Error',
      kind: 'error',
      okLabel: 'OK'
    })
  } else if (update?.available) {
    console.log('update available')
    const yes = await ask(`Update to ${update.version} is available! \nRelease notes: ${update.body}`, {
      title: 'Update Available',
      kind: 'info',
      okLabel: 'Update',
      cancelLabel: 'Cancel'
    })

    if (yes) {
      try {
        await update.downloadAndInstall()
        return await message('Update downloaded and installed. \nPlease restart the app to apply the update.', {
          title: 'Update Applied',
          kind: 'info',
          okLabel: 'OK'
        })
        // await update.download(e => console.log(e))
      } catch (error) {
        console.error(error)
        return await message('Update failed to apply. \nPlease try again later. \nError: ' + error, {
          title: 'Error',
          kind: 'error',
          okLabel: 'OK'
        })
      }
      // await invoke('graceful_restart')
    }
  } else if (onUserClick) {
    await message('You are on the latest version. Stay awesome!', {
      title: 'No Updates Available',
      kind: 'info',
      okLabel: 'OK'
    })
  }
}