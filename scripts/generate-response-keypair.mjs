import { generateKeyPairSync } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const directory = resolve('.response-keys')
const publicPath = resolve(directory, 'public.pem')
const privatePath = resolve(directory, 'private.pem')
const force = process.argv.includes('--force')

if (!force && (existsSync(publicPath) || existsSync(privatePath))) {
  console.error('.response-keys에 키가 이미 있습니다. 교체하려면 npm run keys:generate -- --force 를 사용하세요.')
  process.exit(1)
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 3072,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

mkdirSync(directory, { recursive: true })
writeFileSync(publicPath, publicKey, { mode: 0o644 })
writeFileSync(privatePath, privateKey, { mode: 0o600 })
console.log(`공개키: ${publicPath}`)
console.log(`개인키: ${privatePath}`)
console.log('개인키는 백업 후 저장소에 커밋하지 마세요.')
