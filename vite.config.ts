import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  // GitHub Actions provides owner/repo in GITHUB_REPOSITORY
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]

  // If this is a user/org pages repo like "username.github.io", the site is served at root "/"
  const base = repo && repo.endsWith('.github.io') ? '/' : repo ? `/${repo}/` : '/'

  return {
    plugins: [react()],
    base,
  }
})
