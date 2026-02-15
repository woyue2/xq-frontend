import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const rootDir = process.cwd()
const staticDir = path.join(rootDir, 'static')
const sourceSvg = path.join(staticDir, 'favicon.svg')

const ICON_BACKGROUND = '#e0f2fe'

const OUTPUTS = [
  { file: 'favicon-32.png', size: 32, mode: 'any' },
  { file: 'apple-touch-icon.png', size: 180, mode: 'any' },
  { file: 'pwa-192.png', size: 192, mode: 'any' },
  { file: 'pwa-512.png', size: 512, mode: 'any' },
  { file: 'pwa-maskable-192.png', size: 192, mode: 'maskable' },
  { file: 'pwa-maskable-512.png', size: 512, mode: 'maskable' }
]

const createAnyIcon = async (size) => {
  return sharp(sourceSvg, { density: 1024 })
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer()
}

const createMaskableIcon = async (size) => {
  const innerSize = Math.round(size * 0.8)
  const innerIcon = await sharp(sourceSvg, { density: 1024 })
    .resize(innerSize, innerSize, { fit: 'cover' })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: ICON_BACKGROUND
    }
  })
    .composite([
      {
        input: innerIcon,
        left: Math.floor((size - innerSize) / 2),
        top: Math.floor((size - innerSize) / 2)
      }
    ])
    .png()
    .toBuffer()
}

const main = async () => {
  await fs.access(sourceSvg)

  for (const output of OUTPUTS) {
    const buffer =
      output.mode === 'maskable'
        ? await createMaskableIcon(output.size)
        : await createAnyIcon(output.size)

    await fs.writeFile(path.join(staticDir, output.file), buffer)
  }

  console.log('Generated PWA icons:')
  for (const output of OUTPUTS) {
    console.log(`- ${output.file}`)
  }
}

main().catch((error) => {
  console.error('Failed to generate PWA icons.', error)
  process.exit(1)
})
