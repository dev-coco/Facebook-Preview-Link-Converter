const urlInput = document.getElementById('urlInput')
const processBtn = document.getElementById('processBtn')
const btnText = processBtn.querySelector('.btn-text')
const spinner = processBtn.querySelector('.spinner')
const resultContainer = document.getElementById('resultContainer')
const resultLink = document.getElementById('resultLink')
const copyBtn = document.getElementById('copyBtn')

// 按钮状态切换函数
function setButtonState (state) {
  // state: 'initial', 'loading', 'complete'
  if (state === 'loading') {
    btnText.classList.add('hidden')
    spinner.classList.remove('hidden')
    processBtn.disabled = true
    processBtn.style.backgroundColor = '#6c757d'
  } else if (state === 'complete') {
    btnText.classList.remove('hidden')
    btnText.textContent = '完成!'
    spinner.classList.add('hidden')
    processBtn.disabled = false
    processBtn.style.backgroundColor = '#28a745'

    // 2秒后恢复初始状态
    setTimeout(() => setButtonState('initial'), 2000)
  } else {
    // 'initial'
    btnText.classList.remove('hidden')
    btnText.textContent = '处理链接'
    spinner.classList.add('hidden')
    processBtn.disabled = false
    processBtn.style.backgroundColor = '#3b5998'
  }
}

processBtn.addEventListener('click', async () => {
  let url = urlInput.value.trim()
  resultContainer.classList.add('hidden')
  setButtonState('loading')
  // 缩短链接需要特殊处理
  if (url.includes('fb.com')) {
    // 获取重定向后的链接
    url = await fetch(url).then(response => response.url)
  }
  const previewLink = await getPreviewLink(url)

  // 显示结果并更新按钮状态
  resultLink.href = previewLink
  resultLink.textContent = previewLink
  resultContainer.classList.remove('hidden')
  setButtonState('complete')
})

// 复制链接功能
copyBtn.addEventListener('click', () => {
  const textToCopy = resultLink.textContent
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      alert('链接已复制到剪贴板！')
    })
    .catch(err => {
      console.error('复制失败: ', err)
    })
})

// 获取账号 token
async function getToken () {
  // 获取库存信息
  const config = await new Promise(resolve =>
    chrome.storage.local.get(null, config => {
      resolve(config)
    })
  )
  const { value, time } = config?.token ?? {}
  // 近 1 小时获取过 token 就不重复获取了，避免太频繁导致账号受限
  if (new Date().getTime() - time < 3600000) {
    return value
  }
  const newToken = await fetch('https://www.facebook.com/ajax/dtsg/?__a=true')
    .then(response => response.text())
    .then(text => JSON.parse(text.replace('for (;;);', '')).payload.token)
  chrome.storage.local.set({
    token: {
      value: newToken,
      time: new Date().getTime()
    }
  })
  return newToken
}

/**
 * @description 获取预览链接
 * @param {string} url - 原始链接
 * @returns 预览链接
 */
async function getPreviewLink (url) {
  const token = await getToken()
  const param = {
    feedLocation: 'FEED_COMPOSER',
    focusCommentID: null,
    goodwillCampaignId: '',
    goodwillCampaignMediaIds: [],
    goodwillContentType: null,
    params: { url },
    privacySelectorRenderLocation: 'COMET_COMPOSER',
    renderLocation: 'composer_preview',
    parentStoryID: null,
    scale: 2,
    useDefaultActor: false,
    shouldIncludeStoryAttachment: false,
    __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: false,
    __relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider: false,
    __relay_internal__pv__IsWorkUserrelayprovider: false,
    __relay_internal__pv__FBReels_enable_view_dubbed_audio_type_gkrelayprovider: false,
    __relay_internal__pv__CometImmersivePhotoCanUserDisable3DMotionrelayprovider: false,
    __relay_internal__pv__WorkCometIsEmployeeGKProviderrelayprovider: false,
    __relay_internal__pv__IsMergQAPollsrelayprovider: false,
    __relay_internal__pv__FBReels_deprecate_short_form_video_context_gkrelayprovider: true,
    __relay_internal__pv__FBReelsMediaFooter_comet_enable_reels_ads_gkrelayprovider: true
  }
  const body = new FormData()
  body.append('fb_dtsg', token)
  body.append('fb_api_req_friendly_name', 'ComposerLinkAttachmentPreviewQuery')
  body.append('variables', JSON.stringify(param))
  body.append('doc_id', '24758306610448322')
  const text = await fetch('https://www.facebook.com/api/graphql/', {
    body,
    method: 'POST'
  }).then(response => response.text())
  try {
    const json = JSON.parse(text.split('\n')[0])
    const link = json.data.link_preview.story_attachment.styles.attachment.url
    return link || '无法获取'
  } catch (error) {
    return '无法获取'
  }
}
