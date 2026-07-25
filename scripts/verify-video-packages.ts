import * as fs from 'fs'
import * as path from 'path'

const REQUIRED_FIELDS = [
  'koId', 'koCode', 'title', 'description', 'durationTarget',
  'scenes', 'script', 'transcript', 'webvttContent',
  'voiceGuidance', 'thumbnailSpec', 'outputKey', 'checksum',
  'status', 'sourceCodes',
]

const REQUIRED_SCENE_FIELDS = ['sceneNumber', 'title', 'durationSeconds', 'visualDescription', 'onScreenText', 'narration']

function main() {
  const filePath = path.join(__dirname, '..', 'content', 'video-production-v1.json')
  if (!fs.existsSync(filePath)) {
    console.error('FAIL: content/video-production-v1.json not found')
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const packages = data.packages

  if (!packages || !Array.isArray(packages)) {
    console.error('FAIL: packages array missing')
    process.exit(1)
  }

  if (packages.length !== 30) {
    console.error(`FAIL: Expected 30 packages, got ${packages.length}`)
    process.exit(1)
  }

  let failures = 0

  for (const pkg of packages) {
    const koId = pkg.koId
    const code = pkg.koCode || `KO#${koId}`
    const errors: string[] = []

    for (const field of REQUIRED_FIELDS) {
      if (pkg[field] === undefined || pkg[field] === null) {
        errors.push(`Missing field: ${field}`)
      }
    }

    // Validate script word count (450-750)
    if (pkg.script) {
      const wc = pkg.script.split(/\s+/).length
      if (wc < 450) errors.push(`Script too short: ${wc} words (min 450)`)
      if (wc > 750) errors.push(`Script too long: ${wc} words (max 750)`)
    }

    // Validate duration target (180-360)
    if (pkg.durationTarget !== undefined) {
      if (pkg.durationTarget < 180 || pkg.durationTarget > 360) {
        errors.push(`DurationTarget out of range: ${pkg.durationTarget}s (180-360)`)
      }
    }

    // Validate scenes (5-8)
    if (pkg.scenes) {
      if (!Array.isArray(pkg.scenes)) {
        errors.push('Scenes is not an array')
      } else {
        if (pkg.scenes.length < 5 || pkg.scenes.length > 8) {
          errors.push(`Scene count: ${pkg.scenes.length} (expected 5-8)`)
        }
        for (const scene of pkg.scenes) {
          for (const sf of REQUIRED_SCENE_FIELDS) {
            if (scene[sf] === undefined || scene[sf] === null) {
              errors.push(`Scene ${scene.sceneNumber}: missing ${sf}`)
            }
          }
        }
      }
    }

    // Validate WebVTT
    if (pkg.webvttContent && !pkg.webvttContent.startsWith('WEBVTT')) {
      errors.push('WebVTT does not start with WEBVTT header')
    }

    // Validate status
    if (pkg.status !== 'script_ready') {
      errors.push(`Status is ${pkg.status}, expected script_ready`)
    }

    if (!Array.isArray(pkg.sourceCodes) || pkg.sourceCodes.length === 0) {
      errors.push('sourceCodes must contain at least one linked source')
    }

    // Validate checksum
    if (pkg.checksum && pkg.checksum.length < 8) {
      errors.push(`Checksum too short: ${pkg.checksum}`)
    }

    // Validate outputKey
    if (pkg.outputKey && !pkg.outputKey.includes(`${koId}`)) {
      errors.push(`outputKey does not contain KO ID ${koId}`)
    }

    if (errors.length > 0) {
      console.error(`FAIL ${code}: ${errors.join('; ')}`)
      failures++
    } else {
      console.log(`PASS ${code}`)
    }
  }

  if (failures > 0) {
    console.error(`\nFAIL: ${failures}/${packages.length} packages failed validation`)
    process.exit(1)
  }

  console.log(`\nPASS: All ${packages.length} video production packages validated successfully`)
}

main()
