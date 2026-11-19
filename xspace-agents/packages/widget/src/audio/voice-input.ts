// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 nirholas (https://github.com/nirholas/xspace-agent) [§79]

export type VoiceState = 'idle' | 'recording' | 'error'
export type VoiceStateHandler = (state: VoiceState) => void

export class VoiceInput {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private state: VoiceState = 'idle'
  private stateHandlers: VoiceStateHandler[] = []

  async start(): Promise<void> {
    if (this.state === 'recording') return

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })

      const mimeType = this.getSupportedMimeType()
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      })

      this.chunks = []

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data)
      }

      this.mediaRecorder.start(250) // collect in 250ms chunks
      this.setState('recording')
    } catch {
      this.setState('error')
      throw new Error('Microphone access denied')
    }
  }

  async stop(): Promise<{ buffer: ArrayBuffer; mimeType: string } | null> {
    if (this.state !== 'recording' || !this.mediaRecorder) return null

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        const mimeType = this.mediaRecorder!.mimeType
        const blob = new Blob(this.chunks, { type: mimeType })
        const buffer = await blob.arrayBuffer()
        this.cleanup()
        this.setState('idle')
        resolve({ buffer, mimeType })
      }

      this.mediaRecorder!.stop()
    })
  }

  cancel(): void {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.stop()
    }
    this.cleanup()
    this.setState('idle')
  }

  isRecording(): boolean {
    return this.state === 'recording'
  }

  getState(): VoiceState {
    return this.state
  }

  onStateChange(handler: VoiceStateHandler): void {
    this.stateHandlers.push(handler)
  }

  destroy(): void {
    this.cancel()
    this.stateHandlers = []
  }

  static isSupported(): boolean {
    return typeof navigator.mediaDevices?.getUserMedia === 'function' && typeof window.MediaRecorder !== 'undefined'
  }

  private setState(state: VoiceState): void {
    this.state = state
    this.stateHandlers.forEach((h) => h(state))
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    this.mediaRecorder = null
    this.chunks = []
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type
    }
    return 'audio/webm'
  }
}
