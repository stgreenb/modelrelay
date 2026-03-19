import { networkInterfaces } from 'node:os'
import HttpsProxyAgent from 'https-proxy-agent'

function isPrivateIpv4(ip) {
  if (!ip) return false

  if (ip.startsWith('10.')) return true
  if (ip.startsWith('192.168.')) return true

  if (ip.startsWith('172.')) {
    const secondOctet = Number(ip.split('.')[1])
    return secondOctet >= 16 && secondOctet <= 31
  }

  return false
}

export function getLocalIpv4Addresses() {
  const interfaces = networkInterfaces()
  const addresses = []

  for (const entries of Object.values(interfaces)) {
    if (!entries) continue

    for (const entry of entries) {
      const isIpv4 = entry.family === 'IPv4' || entry.family === 4
      if (!isIpv4 || entry.internal || !entry.address) continue
      addresses.push(entry.address)
    }
  }

  return [...new Set(addresses)]
}

export function getPreferredLanIpv4Address() {
  const addresses = getLocalIpv4Addresses()
  const privateAddress = addresses.find(isPrivateIpv4)
  return privateAddress || addresses[0] || null
}

function shouldBypassProxy(url) {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy || ''
  if (!noProxy) return false

  const hostname = new URL(url).hostname
  const noProxyList = noProxy.split(',').map(s => s.trim())

  for (const pattern of noProxyList) {
    if (pattern === '*') return true
    if (pattern === hostname) return true
    if (pattern.startsWith('.') && hostname.endsWith(pattern)) return true
    if (hostname.endsWith(pattern)) return true
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  }
  return false
}

function getProxyUrl(url) {
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy

  if (url.startsWith('https://')) {
    return httpsProxy || httpProxy
  }
  return httpProxy || httpsProxy
}

export async function fetchWithProxy(url, options = {}) {
  if (shouldBypassProxy(url)) {
    return fetch(url, options)
  }

  const proxyUrl = getProxyUrl(url)
  if (proxyUrl) {
    const agent = HttpsProxyAgent.parse(proxyUrl)
    return fetch(url, { ...options, agent })
  }

  return fetch(url, options)
}
