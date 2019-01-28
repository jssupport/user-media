import { uploadBlob } from '~~/client/utils/qiniu'
import getAudioBuffer from '~~/client/utils/getAudioBuffer'
import {getUserMedia, stopUserMediaStream} from '~~/client/utils/user-media'

// ctx 音频上下文(录音)
// stream 录音流
// source 一个MediaStreamAudioSourceNode接口来关联可能来自本地计算机麦克风或其他来源的音频流 MediaStream.
// scriptProcessor 一个可以通过 JavaScript 直接处理音频的 ScriptProcessorNode
// blob 录音生成的mp3格式的Blob文件
// audioBuffer 录音生成的mp3 转化成的 audioBuffer
export default {
  constraints: {
    audio: true,
  },
  _initPlayCtx () {
    if (!this.playCtx) {
      this.playCtx = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext)()
    }
  },
  async _recordSuccess (blob) {
    if (this.seconds) { // 有效录音秒数, 无效录音值为undefined
      this.blob = blob
      this._initPlayCtx()
      this.url = URL.createObjectURL(this.blob)

      const detail = {
        type: 'h5',
        id: `v_${Math.random().toString(36).substring(2)}`,
        localId: this.url,
        seconds: this.seconds,
      }

      try {
        detail.audioBuffer = await getAudioBuffer(this.playCtx, blob)
      } catch (e) {}

      document.dispatchEvent(new CustomEvent('onRecordPush', {
        detail,
      }))
      this.seconds = undefined

      detail.uploadPromise = this.uploadVoice()
      detail.persistentId = await detail.uploadPromise
    }
  },
  async isRecordSupport () {
    if (window.Worker) {
      if (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext) {
        const stream = await getUserMedia(this.constraints)

        if (stream) {
          stopUserMediaStream(stream)
          this.worker = new Worker('/js/record/worker.js') // 录音编码worker
          return true
        }
      }
    }
    return false
  },
  async startRecord () {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext)()
    }

    this.stream = await getUserMedia(this.constraints)
    this.mediaStreamSource = this.ctx.createMediaStreamSource(this.stream)

    const createScriptProcessor = this.ctx.createScriptProcessor || this.ctx.createJavaScriptNode
    this.scriptProcessor = createScriptProcessor.call(this.ctx, 0, 1, 1) // 单声道, 没有必要用双声道

    // 需要连到扬声器消费掉outputBuffer，process回调才能触发
    // 并且由于不给outputBuffer设置内容，所以扬声器不会播放出声音
    this.scriptProcessor.connect(this.ctx.destination)

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    this.worker.onmessage = (e) => {
      this._recordSuccess(e.data)
    }
    this.worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.ctx.sampleRate,
      }
    })
    this.scriptProcessor.onaudioprocess = (e) => {
      const buffer = e.inputBuffer.getChannelData(0)
      this.worker.postMessage({
        command: 'encode',
        buffer,
      })
    }

    this.mediaStreamSource.connect(this.scriptProcessor)

    this.autoRecordCompleteTimer && clearTimeout(this.autoRecordCompleteTimer)

    this.autoRecordCompleteTimer = setTimeout(() => {
      this.stopRecord(60)
      document.dispatchEvent(new CustomEvent('onRecordAutoComplete'))
    }, 60 * 1000) // 最长录音时长, 单位 s
  },
  /**
   * 停止录音
   * @param {Boolean} seconds 有效录音秒数, 无效录音值为undefined
   */
  stopRecord (seconds) {
    if (seconds) {
      this.seconds = seconds
      if (this.autoRecordCompleteTimer) {
        clearTimeout(this.autoRecordCompleteTimer)
        this.autoRecordCompleteTimer = 0
      }

      this.worker.postMessage({
        command: 'finish',
      })
    }

    stopUserMediaStream(this.stream)
    this.mediaStreamSource.disconnect()
    this.scriptProcessor.disconnect()
  },
  playVoice (voice) {
    this._initPlayCtx()
    if (this.playCtx.state === 'suspended') {
      this.playCtx.resume()
    }
    this.bufferSource = this.playCtx.createBufferSource()
    this.bufferSource.connect(this.playCtx.destination)
    this.bufferSource.onended = () => {
      document.dispatchEvent(new CustomEvent('onRecordPlayComplete', {detail: voice}))
    }

    this.bufferSource.buffer = voice.audioBuffer
    this.bufferSource.start()
  },
  pauseVoice () {
    this.playCtx.suspend()
  },
  resumeVoice () {
    this.playCtx.resume()
  },
  stopVoice () {
    this.bufferSource.stop()
  },
  async uploadVoice () {
    try {
      const token = await this.parent.getQiniuToken({
        type: 'audioMp3',
        useCatch: true
      })

      const blkRet = await uploadBlob(this.blob, Math.random().toString(36).substring(2) + '.mp3', token)

      return 'https://rs.daniujia.com/' + blkRet.key
    } catch (e) {
      this.$toast(e.message)
    }
  },
}
