self.importScripts('/js/record/lame.min.js')

function clearBuffer () {
  self.dataBuffer = []
};

function appendToBuffer (mp3Buf) {
  self.dataBuffer.push(new Int8Array(mp3Buf))
};

function init (conf) {
  self.conf = Object.assign({
    sampleRate: 44100,
    maxSamples: 1152,
    bitRate: 128
  }, conf)
  self.mp3Encoder = new self.lamejs.Mp3Encoder(1, self.conf.sampleRate, self.conf.bitRate)
  clearBuffer()
};

function floatTo16BitPCM (input, output) {
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]))
    output[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF)
  }
};

function convertBuffer (arrayBuffer) {
  const data = new Float32Array(arrayBuffer)
  const out = new Int16Array(arrayBuffer.length)
  floatTo16BitPCM(data, out)
  return out
};

function encode (arrayBuffer) {
  const samplesMono = convertBuffer(arrayBuffer)
  let remaining = samplesMono.length
  for (let i = 0; remaining >= 0; i += self.conf.maxSamples) {
    const left = samplesMono.subarray(i, i + self.conf.maxSamples)
    const mp3buf = self.mp3Encoder.encodeBuffer(left)
    appendToBuffer(mp3buf)
    remaining -= self.conf.maxSamples
  }
};

function finish () {
  appendToBuffer(self.mp3Encoder.flush())
  self.postMessage(new Blob(self.dataBuffer, {type: 'audio/mp3'}))
  clearBuffer() // 清空缓存
}

self.onmessage = function (e) {
  switch (e.data.command) {
    case 'init':
      init(e.data.config)
      break
    case 'encode':
      encode(e.data.buffer)
      break
    case 'finish':
      finish()
      break
  }
}
