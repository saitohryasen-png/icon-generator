'use client'

import { useState } from 'react'
import styles from './page.module.css'

const PRESETS = [
  { label: '🏠 ホーム', value: 'シンプルなホームアイコン、フラットデザイン' },
  { label: '⭐ スター', value: 'カラフルな星のアイコン、ゲーム風' },
  { label: '💬 チャット', value: 'スリークなメッセージバブル、モダンUI' },
  { label: '🔥 炎', value: '炎のアイコン、エネルギッシュ、グラデーション' },
  { label: '🌿 エコ', value: '葉っぱのアイコン、エコ、グリーン系' },
  { label: '⚡ 電力', value: '稲妻のアイコン、スピード感、ボールド' },
]

type Status = { type: 'success' | 'error'; message: string } | null

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('ILLUSTRATION')
  const [bg, setBg] = useState('transparent')
  const [numImages, setNumImages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [status, setStatus] = useState<Status>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const handlePreset = (val: string, label: string) => {
    setPrompt(val)
    setActivePreset(label)
  }

  const generate = async () => {
    if (!prompt.trim()) {
      setStatus({ type: 'error', message: 'アイコンの説明を入力してください' })
      return
    }
    setLoading(true)
    setImages([])
    setStatus(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, bg, numImages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'サーバーエラーが発生しました')
      setImages(data.images ?? [])
      setStatus({ type: 'success', message: `✓ ${data.images.length}枚のアイコンを生成しました` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '不明なエラー'
      setStatus({ type: 'error', message: `❌ ${msg}` })
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = async (url: string, index: number) => {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `icon-${index + 1}.png`
    a.click()
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Icon Generator</h1>
          <p className={styles.sub}>コメントからアイコンを自動生成 · Powered by Leonardo.ai</p>
        </div>

        <div className={styles.card}>
          <p className={styles.sectionTitle}>アイコンの説明</p>
          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                className={`${styles.preset} ${activePreset === p.label ? styles.presetActive : ''}`}
                onClick={() => handlePreset(p.value, p.label)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            className={styles.textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例: 青いシールドのセキュリティアイコン、グロー効果付き、ダークテーマ向け..."
            rows={3}
          />
          <p className={styles.tip}>日本語でOK。スタイル・色・用途を詳しく書くほど精度が上がります</p>
        </div>

        <div className={styles.card}>
          <p className={styles.sectionTitle}>設定</p>
          <div className={styles.row}>
            <div>
              <label className={styles.label}>スタイル</label>
              <select className={styles.select} value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="ILLUSTRATION">イラスト</option>
                <option value="GENERAL">ジェネラル</option>
                <option value="REALISTIC">リアル</option>
                <option value="3D">3D</option>
              </select>
            </div>
            <div>
              <label className={styles.label}>背景</label>
              <select className={styles.select} value={bg} onChange={(e) => setBg(e.target.value)}>
                <option value="transparent">透明</option>
                <option value="white">白</option>
                <option value="dark">ダーク</option>
              </select>
            </div>
          </div>
          <label className={styles.label} style={{ marginTop: '0.75rem' }}>生成枚数</label>
          <div className={styles.countRow}>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                className={`${styles.countBadge} ${numImages === n ? styles.countActive : ''}`}
                onClick={() => setNumImages(n)}
              >
                {n}枚
              </button>
            ))}
          </div>
        </div>

        <button className={styles.btn} onClick={generate} disabled={loading}>
          {loading ? '生成中...' : '✦ アイコンを生成する'}
        </button>

        {status && (
          <div className={`${styles.status} ${status.type === 'error' ? styles.statusErr : styles.statusOk}`}>
            {status.message}
          </div>
        )}

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Leonardo.ai で生成中...</p>
            <p className={styles.loadingSub}>通常10〜30秒かかります</p>
          </div>
        )}

        {images.length > 0 && (
          <div className={styles.grid}>
            {images.map((url, i) => (
              <div key={i} className={styles.iconCard} onClick={() => downloadImage(url, i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`生成アイコン ${i + 1}`} className={styles.iconImg} />
                <span className={styles.dl}>⬇ 保存</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
