import UserMediaMixin from '~~/client/mixins/user-media/base'

export default {
  data () {
    return {
      constraints: {
        audio: true,
      },
      ctx: null, // 音频上下文
      stream: null, // 录音流
      source: null, // 一个MediaStreamAudioSourceNode接口来关联可能来自本地计算机麦克风或其他来源的音频流 MediaStream.
      scriptProcessor: null, // 一个可以通过 JavaScript 直接处理音频的 ScriptProcessorNode
      blob: null, // 录音生成的mp3格式的Blob文件
    }
  },
  mixins: [UserMediaMixin],
  methods: {
    async isSupport () {
      if (window.Worker) {
        if (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext) {
          const stream = await this.getUserMedia(this.constraints)
          if (stream) {
            this.stop(stream)
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

      this.stream = await this.getUserMedia(this.constraints)

      this.mediaStreamSource = this.ctx.createMediaStreamSource(this.stream)

      const createScriptProcessor = this.ctx.createScriptProcessor || this.ctx.createJavaScriptNode
      this.scriptProcessor = createScriptProcessor.call(this.ctx, 0, 1, 1) // 单声道, 没有必要用双声道

      // 需要连到扬声器消费掉outputBuffer，process回调才能触发
      // 并且由于不给outputBuffer设置内容，所以扬声器不会播放出声音
      this.scriptProcessor.connect(this.ctx.destination)

      this.worker.onmessage = (e) => {
        this.blob = e.data
        this.url = URL.createObjectURL(this.blob)
        alert(this.blob.size)
      }
      this.worker.postMessage({
        command: 'init',
      })
      this.scriptProcessor.onaudioprocess = (e) => {
        this.worker.postMessage({
          command: 'encode',
          buffer: e.inputBuffer.getChannelData(0),
        })
      }

      this.mediaStreamSource.connect(this.scriptProcessor)
    },
    stopRecord () {
      this.stop(this.stream)
      this.mediaStreamSource.disconnect()
      this.scriptProcessor.disconnect()
      this.worker.postMessage({
        command: 'finish',
      })
    },
  }
}
