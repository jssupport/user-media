export async function getUserMedia (constraints) {
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
    throw e
  }
  return stream
}

export async function stopUserMediaStream (stream) {
  if (stream.getTracks) {
    stream.getTracks().forEach((track) => {
      track.stop()
    })
  } else if (stream.stop) {
    stream.stop()
  } else {
    // TODO Error
  }
}
