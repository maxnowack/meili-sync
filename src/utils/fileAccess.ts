import fs from 'fs-extra'

const fileAccess = (file: string, mode?: number) => new Promise<boolean>((resolve) => {
  fs.access(file, mode).then(() => resolve(true)).catch(() => resolve(false))
})

export default fileAccess
