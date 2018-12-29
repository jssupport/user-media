<style lang="scss">

</style>


<template>
  <audio v-if="url" controls="controls" :src="url">
    您的浏览器不支持 audio 标签。
  </audio>
</template>

<script>
import RecordMixin from '~~/client/mixins/user-media/record'

export default {
  name: 'test',
  mixins: [RecordMixin],
  data () {
    return {
      url: '',
    }
  },
  async mounted () {
    try {
      const isSupport = await this.isSupport()

      if (isSupport) {
        await this.startRecord()
      }
      setTimeout(() => {
        this.stopRecord()
      }, 3000)
    } catch (e) {
      alert(e)
    }
  },
}
</script>
