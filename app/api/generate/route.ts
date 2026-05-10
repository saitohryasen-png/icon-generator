import { NextRequest, NextResponse } from 'next/server'

const LEONARDO_API_BASE = 'https://cloud.leonardo.ai/api/rest/v1'

function containsJapanese(text: string): boolean {
  return /[　-鿿＀-￯]/.test(text)
}

async function translateToEnglish(text: string): Promise<string> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ja|en`
  )
  if (!res.ok) return text
  const data = await res.json()
  const translated = data?.responseData?.translatedText
  return typeof translated === 'string' && translated ? translated : text
}

function buildPrompt(userPrompt: string, style: string, bg: string): string {
  const bgMap: Record<string, string> = {
    transparent: 'on transparent background',
    white: 'on white background',
    dark: 'on dark background',
  }
  const bgText = bgMap[bg] || ''
  const styleText = style === '3D' ? '3d render,' : ''
  return `App icon, ${userPrompt}, ${bgText}, icon design, centered, isolated, high quality, clean edges, ${styleText} flat design, vector style, sharp details, no text, no watermark`
}

async function pollGeneration(apiKey: string, generationId: string, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const res = await fetch(`${LEONARDO_API_BASE}/generations/${generationId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) continue
    const data = await res.json()
    const gen = data?.generations_by_pk
    if (gen?.status === 'COMPLETE') return gen.generated_images ?? []
    if (gen?.status === 'FAILED') throw new Error('Leonardo.ai: 生成に失敗しました')
  }
  throw new Error('タイムアウト: 生成が完了しませんでした')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.LEONARDO_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    return NextResponse.json(
      { error: '.env.local に LEONARDO_API_KEY が設定されていません' },
      { status: 500 }
    )
  }

  let body: { prompt?: string; style?: string; bg?: string; numImages?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
  }

  const { prompt, style = 'ILLUSTRATION', bg = 'transparent', numImages = 1 } = body
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'アイコンの説明を入力してください' }, { status: 400 })
  }

  const presetStyleMap: Record<string, string> = {
    ILLUSTRATION: 'ILLUSTRATION',
    GENERAL: 'GENERAL',
    REALISTIC: 'CINEMATIC',
    '3D': 'DYNAMIC',
  }

  try {
    const englishPrompt = containsJapanese(prompt) ? await translateToEnglish(prompt) : prompt
    const fullPrompt = buildPrompt(englishPrompt, style, bg)

    const genRes = await fetch(`${LEONARDO_API_BASE}/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        negative_prompt: 'text, watermark, low quality, blurry, ugly, deformed, multiple objects',
        modelId: 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
        width: 512,
        height: 512,
        num_images: Math.min(Math.max(1, numImages), 4),
        num_inference_steps: 30,
        guidance_scale: 7,
        presetStyle: presetStyleMap[style] ?? 'GENERAL',
        public: false,
        scheduler: 'EULER_DISCRETE',
      }),
    })

    if (!genRes.ok) {
      const err = await genRes.json().catch(() => ({}))
      throw new Error(err.error ?? `Leonardo.ai API エラー (${genRes.status})`)
    }

    const genData = await genRes.json()
    const generationId = genData?.sdGenerationJob?.generationId
    if (!generationId) throw new Error('generationId が取得できませんでした')

    const images = await pollGeneration(apiKey, generationId)
    const urls = images.map((img: { url: string }) => img.url)
    return NextResponse.json({ images: urls })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '不明なエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
