
// 是否 能够使用 相应constraints的 UserMedia
export default {
  methods: {
    async getUserMedia (constraints) {
      let stream = null
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) { // 新版的getUserMedia
          stream = await navigator.mediaDevices.getUserMedia(constraints)
        } else {
          const getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia

          if (getUserMedia) {
            stream = await new Promise((resolve, reject) => {
              getUserMedia.call(navigator, constraints, resolve, reject)
            })
          }
        }
      } catch (e) {
        console.log('e', e.message)
        // TODO ERROR receive
      }
      return stream
    },
    stop (stream) {
      if (stream.getTracks) {
        stream.getTracks().forEach((track) => {
          track.stop()
        })
      } else if (stream.stop) {
        stream.stop()
      } else {
        // TODO Error
      }
    },
  }
}
