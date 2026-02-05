const urlInput = document.getElementById('urlInput')
const processBtn = document.getElementById('processBtn')
const btnText = processBtn.querySelector('.btn-text')
const spinner = processBtn.querySelector('.spinner')
const resultContainer = document.getElementById('resultContainer')
const resultLink = document.getElementById('resultLink')
const copyBtn = document.getElementById('copyBtn')

const switchLinkBtn = document.getElementById('switchLink')
const switchPostBtn = document.getElementById('switchPost')
const switchGetIgBtn = document.getElementById('switchGetIg')
const groupIdEl = document.getElementById('groupId')

// 模式切换按钮绑定事件
switchLinkBtn.onclick = () => setMode('link')
switchPostBtn.onclick = () => setMode('post')
switchGetIgBtn.onclick = () => setMode('get_ig')

// 当前模式
let currentMode = 'link'

// 新的模式切换函数
function setMode (mode) {
  currentMode = mode

  // 重置所有按钮状态
  switchLinkBtn.classList.remove('active')
  switchPostBtn.classList.remove('active')
  switchGetIgBtn.classList.remove('active')

  // 激活当前按钮
  if (mode === 'link') {
    switchLinkBtn.classList.add('active')
  } else if (mode === 'post') {
    switchPostBtn.classList.add('active')
  } else if (mode === 'get_ig') {
    switchGetIgBtn.classList.add('active')
  }

  // post 状态时显示小组 ID 输入框
  groupIdEl.style.display = mode === 'post' ? 'block' : 'none'

  // 保存设置
  chrome.storage.local.set({ mode: mode })
}

// 保存修改的小组 ID
groupIdEl.addEventListener('change', () => {
  chrome.storage.local.set({
    groupId: groupIdEl.value.trim()
  })
})

// 初始化设置
chrome.storage.local.get(null, config => {
  groupIdEl.value = config?.groupId || ''
  const mode = config?.mode || 'link'
  setMode(mode)
})

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

    // 2 秒后恢复初始状态
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
  const groupId = groupIdEl.value.trim()
  let url = urlInput.value.trim()
  let previewLink = ''
  const config = await new Promise(resolve =>
    chrome.storage.local.get(null, config => {
      resolve(config)
    })
  )
  const mode = config?.mode || 'link'

  resultContainer.classList.add('hidden')
  setButtonState('loading')
  if (mode === 'link') {
    // 转换 IG 链接
    // 缩短链接需要特殊处理
    if (url.includes('fb.com')) {
      // 获取重定向后的链接
      url = await fetch(url).then(response => response.url)
    }
    previewLink = await getPreviewLink(url, 1)
  } else if (mode === 'post') {
    // 转换 IG 贴
    previewLink = await getShareLink(url, groupId)
  } else if (mode === 'get_ig') {
    // 获取 IG 链接
    previewLink = await getBindingIgLink(url)
  }

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

// 随机生成 uuid
function uuid () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, str => {
    const randomInt = (Math.random() * 16) | 0
    return (str === 'x' ? randomInt : (randomInt & 3) | 8).toString(16)
  })
}

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
async function getPreviewLink (url, type) {
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

    if (type === 1) {
      const link = json.data.link_preview.story_attachment.styles.attachment.story_attachment_link_renderer.attachment.url
      return link || '无法获取'
    } else if (type === 2) {
      const shareParam = json.data.link_preview.share_scrape_data
      return shareParam || '无法获取'
    }
  } catch (error) {
    return '无法获取'
  }
}

/**
 * @description 转换 IG 贴链接
 * @param {string} link - 帖子链接
 * @param {(string|number)} groupId - 小组 ID
 * @returns IG 分享贴链接
 */
async function getShareLink (link, groupId) {
  const token = await getToken()
  const pageId = await chrome.cookies
    .getAll({ domain: 'facebook.com', name: 'i_user' })
    .then(r => r[0].value)
    .catch(error => {
      console.log(error)
      alert('无法获取专页 ID，请先切换专页权限后再使用。')
    })
  const shareParam = await getPreviewLink(link, 2)
  if (shareParam === '无法获取') {
    return '无法获取'
  }
  const param = {
    input: {
      composer_entry_point: 'inline_composer',
      composer_source_surface: 'group',
      composer_type: 'group',
      logging: {
        composer_session_id: uuid()
      },
      source: 'WWW',
      message: {
        ranges: [],
        text: ''
      },
      with_tags_ids: null,
      inline_activities: [],
      text_format_preset_id: '0',
      group_flair: {
        flair_id: null
      },
      attachments: [
        {
          link: {
            share_scrape_data: shareParam
          }
        }
      ],
      composed_text: {
        block_data: ['{}'],
        block_depths: [0],
        block_types: [0],
        blocks: [''],
        entities: ['[]'],
        entity_map: '{}',
        inline_styles: ['[]']
      },
      navigation_data: {
        attribution_id_v2: 'CometGroupDiscussionRoot.react,comet.group,via_cold_start,1762396462500,232956,2361831622,,'
      },
      tracking: [null],
      event_share_metadata: {
        surface: 'newsfeed'
      },
      audience: {
        to_id: groupId
      },
      actor_id: pageId,
      client_mutation_id: '1'
    },
    feedLocation: 'GROUP',
    feedbackSource: 0,
    focusCommentID: null,
    gridMediaWidth: null,
    groupID: null,
    scale: 2,
    privacySelectorRenderLocation: 'COMET_STREAM',
    checkPhotosToReelsUpsellEligibility: false,
    renderLocation: 'group',
    useDefaultActor: false,
    inviteShortLinkKey: null,
    isFeed: false,
    isFundraiser: false,
    isFunFactPost: false,
    isGroup: true,
    isEvent: false,
    isTimeline: false,
    isSocialLearning: false,
    isPageNewsFeed: false,
    isProfileReviews: false,
    isWorkSharedDraft: false,
    hashtag: null,
    canUserManageOffers: false,
    __relay_internal__pv__CometUFIShareActionMigrationrelayprovider: true,
    __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: false,
    __relay_internal__pv__GHLShouldChangeAdIdFieldNamerelayprovider: false,
    __relay_internal__pv__CometUFI_dedicated_comment_routable_dialog_gkrelayprovider: false,
    __relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider: false,
    __relay_internal__pv__IsWorkUserrelayprovider: false,
    __relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider: false,
    __relay_internal__pv__FBReels_enable_view_dubbed_audio_type_gkrelayprovider: true,
    __relay_internal__pv__TestPilotShouldIncludeDemoAdUseCaserelayprovider: false,
    __relay_internal__pv__FBReels_deprecate_short_form_video_context_gkrelayprovider: true,
    __relay_internal__pv__FeedDeepDiveTopicPillThreadViewEnabledrelayprovider: false,
    __relay_internal__pv__CometImmersivePhotoCanUserDisable3DMotionrelayprovider: false,
    __relay_internal__pv__WorkCometIsEmployeeGKProviderrelayprovider: false,
    __relay_internal__pv__IsMergQAPollsrelayprovider: false,
    __relay_internal__pv__FBReels_enable_meta_ai_label_gkrelayprovider: true,
    __relay_internal__pv__FBReelsMediaFooter_comet_enable_reels_ads_gkrelayprovider: true,
    __relay_internal__pv__StoriesArmadilloReplyEnabledrelayprovider: false,
    __relay_internal__pv__FBReelsIFUTileContent_reelsIFUPlayOnHoverrelayprovider: true,
    __relay_internal__pv__GroupsCometGYSJFeedItemHeightrelayprovider: 206,
    __relay_internal__pv__StoriesShouldIncludeFbNotesrelayprovider: false,
    __relay_internal__pv__GHLShouldChangeSponsoredAuctionDistanceFieldNamerelayprovider: false,
    __relay_internal__pv__GHLShouldUseSponsoredAuctionLabelFieldNameV1relayprovider: false,
    __relay_internal__pv__GHLShouldUseSponsoredAuctionLabelFieldNameV2relayprovider: false
  }
  const body1 = new FormData()
  body1.append('fb_dtsg', token)
  body1.append('fb_api_req_friendly_name', 'ComposerStoryCreateMutation')
  body1.append('variables', JSON.stringify(param))
  body1.append('doc_id', '25066596746316496')
  const text = await fetch('https://www.facebook.com/api/graphql/', {
    body: body1,
    method: 'POST'
  }).then(response => response.text())
  const json = JSON.parse(text.split('\n')[0])
  try {
    return json.data.story_create.story.url
  } catch (error) {
    return '无法获取'
  }
}

/**
 * @description 获取专页绑定 Instagram 链接
 * @param {string} url - 专页链接
 * @returns {string} Instagram 链接
 */
async function getBindingIgLink (url) {
  async function urlCovertPageId () {
    const text = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    }).then(response => response.text())
    try {
      return text.match(/(?<=delegate_page":{"id":").*?(?=")/g)[0]
      // return text.match(/(?<="associated_page_id":").*?(?=")/g)[0]
    } catch (error) {
      return '无法获取专页编号'
    }
  }
  const token = await getToken()
  const pageId = await urlCovertPageId()
  console.log('编号', pageId)
  if (pageId === '无法获取专页编号') {
    return '无法获取专页编号'
  }
  const param = {
    activeStatus: 'ACTIVE',
    adType: 'ALL',
    audienceTimeframe: 'LAST_7_DAYS',
    bylines: [],
    collationToken: null,
    contentLanguages: [],
    countries: ['ALL'],
    country: 'ALL',
    deeplinkAdID: null,
    excludedIDs: [],
    fetchPageInfo: true,
    fetchSharedDisclaimers: true,
    hasDeeplinkAdID: false,
    isAboutTab: true,
    isAudienceTab: false,
    isLandingPage: false,
    isTargetedCountry: false,
    location: null,
    mediaType: 'ALL',
    multiCountryFilterMode: null,
    pageIDs: [],
    potentialReachInput: [],
    publisherPlatforms: [],
    queryString: '',
    regions: [],
    searchType: 'PAGE',
    sessionID: uuid(),
    shouldFetchCount: true,
    sortData: null,
    source: 'PAGE_TRANSPARENCY_WIDGET',
    startDate: null,
    viewAllPageID: pageId
  }
  const body = new FormData()
  body.append('fb_dtsg', token)
  body.append('fb_api_req_friendly_name', 'AdLibraryMobileFocusedStateProviderRefetchQuery')
  body.append('variables', JSON.stringify(param))
  body.append('doc_id', '25278989111737394')
  const text = await fetch('https://www.facebook.com/api/graphql/', {
    body,
    method: 'POST'
  }).then(response => response.text())
  const json = JSON.parse(text.split('\n')[1])
  const result = json.data.ad_library_page_info.page_info.ig_username
  return result ? `https://www.instagram.com/${result}` : '未绑定 IG'
}
