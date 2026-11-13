// All six cases are fictional teaching material. Media panels are static
// illustrations/transcripts; they do not represent playable recordings.
export const quiz = [
  {
    id:'new-number', materialType:'chat', materialLabel:'聊天消息', icon:'chat', shortLabel:'换号求助',
    sender:'陌生号码', senderMeta:'自称你的孩子 · 尚未核实',
    title:'“妈，我换号码了。”',
    text:'一个陌生号码发来消息：“妈，我是你儿子，手机坏了，先帮我转 3000 元，着急！”',
    bodySegments:[{text:'妈，我是你儿子，'},{text:'手机坏了，',clue:'new-contact'},{text:'先帮我转 3000 元，',clue:'money'},{text:'着急！',clue:'urgency'}],
    keyClues:[{id:'new-contact',label:'换号无法确认身份'},{id:'money',label:'涉及转账'},{id:'urgency',label:'催促马上行动'}],
    answers:['马上转账，孩子的事不能耽误','拨打原来保存的号码，向本人核实','问对方是不是本人，收到“是”就转账'],correct:1,
    why:'称呼和语气都可能被模仿。请通过原来保存的号码或其他独立渠道核实身份。',
    reviewQA:{id:'review-new-number',question:'旧号码联系不上，还能怎么核实？',answer:'先暂停转账。换一个已经确认过的渠道，或联系认识双方的家人核实。不要使用这条可疑消息新提供的号码作为唯一核实方式。'}
  },
  {
    id:'short-video', materialType:'video', materialLabel:'视频请求转述', icon:'video', shortLabel:'短暂视频',
    sender:'自称家人的来电者', senderMeta:'画面身份尚未核实',
    title:'视频里的人，一定是本人吗？',
    text:'“家人”在视频中请求转账，但画面只有短短几秒，对方说信号不好，拒绝再次通话。',
    bodySegments:[{text:'视频里的人请求你转账。画面'},{text:'只有短短几秒',clue:'brief-video'},{text:'，对方说信号不好，'},{text:'拒绝再次通话。',clue:'no-confirmation'}],
    keyClues:[{id:'brief-video',label:'短画面不能证明身份'},{id:'no-confirmation',label:'拒绝独立核实'}],
    answers:['看到脸就放心转账','索要一张身份证照片','暂停转账，通过熟悉号码再次联系'],correct:2,
    why:'视频画面也可能被合成或替换。短视频不能证明身份，应该独立联系本人。',
    reviewQA:{id:'review-short-video',question:'为什么身份证照片也不能替代核实？',answer:'照片可能来自泄露、盗用或伪造材料。先暂停付款，再拨打原来保存的号码，确认本人以及这笔具体请求；不要只凭一张照片或几秒画面决定转账。'}
  },
  {
    id:'verification-code', materialType:'call', materialLabel:'来电内容转述', icon:'phone', shortLabel:'索要验证码',
    sender:'自称平台客服', senderMeta:'来电身份尚未核实',
    title:'验证码可以告诉“客服”吗？',
    text:'来电自称平台客服，说要帮你取消付费服务，需要你读出收到的短信验证码。',
    bodySegments:[{text:'您好，我是平台客服，可以帮您'},{text:'取消付费服务。',clue:'service-pretext'},{text:'请把刚收到的'},{text:'短信验证码读给我。',clue:'code-request'}],
    keyClues:[{id:'service-pretext',label:'主动来电制造业务理由'},{id:'code-request',label:'向来电者提供验证码'}],
    answers:['不提供验证码，通过官方渠道核实','对方知道我的名字，应该可信','先说一半验证码'],correct:0,
    why:'验证码与账户和资金安全有关。不要提供给来电者，请自行打开官方应用或拨打官方电话核实。',
    reviewQA:{id:'review-verification-code',question:'对方知道我的姓名和订单，也不能信吗？',answer:'知道部分个人信息并不能证明来电者身份。不要告知验证码，包括部分验证码。挂断后自行打开官方应用或查找官方电话，核实是否真的有这项业务。'}
  },
  {
    id:'safe-account', materialType:'call', materialLabel:'来电内容转述', icon:'phone', shortLabel:'安全账户',
    sender:'自称执法人员', senderMeta:'要求保密的陌生来电',
    title:'“安全账户”真的安全吗？',
    text:'来电者自称执法人员，要求你把钱转入“安全账户”，并强调不能告诉家人。',
    bodySegments:[{text:'请配合调查，把钱转入'},{text:'“安全账户”',clue:'safe-account'},{text:'证明清白。此事必须保密，'},{text:'不能告诉家人。',clue:'isolation'}],
    keyClues:[{id:'safe-account',label:'要求把钱转入指定账户'},{id:'isolation',label:'阻止向他人核实'}],
    answers:['配合转账，证明清白','挂断电话，自行联系官方机构核实','让对方发证件就转账'],correct:1,
    why:'要求转入所谓“安全账户”并阻止你与他人核实，是需要警惕的线索。不要转账，应自行查找官方联系方式。',
    reviewQA:{id:'review-safe-account',question:'对方发送证件或要求保密时怎么办？',answer:'停止转账，不按来电者提供的联系方式继续操作。自行查找官方机构的联系方式核实，并和可信的家人商量。证件图片和保密要求都不能替代独立核实。'}
  },
  {
    id:'voice-request', materialType:'audio', materialLabel:'语音内容转述', icon:'sound', shortLabel:'熟人代付',
    sender:'自称好友的消息', senderMeta:'声音熟悉 · 请求尚未核实',
    title:'熟人的语音消息，可以放心吗？',
    text:'好友发来语音：“帮我代付一下，不方便打电话。”声音和本人很像。',
    bodySegments:[{text:'帮我'},{text:'代付一下',clue:'payment'},{text:'，现在'},{text:'不方便打电话。',clue:'avoid-call'}],
    keyClues:[{id:'payment',label:'涉及付款'},{id:'avoid-call',label:'无法即时独立确认'}],
    answers:['先付款再打电话','根据声音判断，像本人就行','通过其他熟悉渠道联系本人，核实请求'],correct:2,
    why:'声音可以被克隆。即使声音熟悉，涉及付款时也应通过独立渠道核实。',
    reviewQA:{id:'review-voice-request',question:'熟悉的声音为什么还需要确认？',answer:'声音可能被模仿或克隆，账号也可能被他人使用。用另一个已确认的渠道联系本人，核对具体付款用途；联系不上时先不付款。'}
  },
  {
    id:'parcel-link', materialType:'message', materialLabel:'短信内容', icon:'chat', shortLabel:'包裹链接',
    sender:'陌生短信发送方', senderMeta:'声称包裹滞留',
    title:'收到可疑链接，先做什么？',
    text:'一条短信称你有包裹滞留，点击链接填写银行卡信息即可领取。',
    bodySegments:[{text:'您的包裹滞留，'},{text:'点击短信链接',clue:'unknown-link'},{text:'并'},{text:'填写银行卡信息',clue:'bank-info'},{text:'即可领取。'}],
    keyClues:[{id:'unknown-link',label:'短信中的陌生链接'},{id:'bank-info',label:'索要银行卡信息'}],
    answers:['自行打开官方快递应用核实','链接看起来很正规，直接填写','转给家人，让家人帮忙填写'],correct:0,
    why:'不要从陌生短信进入页面填写个人或银行卡信息。请自行打开官方应用查询。',
    reviewQA:{id:'review-parcel-link',question:'网页看起来和官方一样，能填写吗？',answer:'外观、图标和文字都可能被复制。不要沿短信链接填写信息，也不要转发让家人代填；退出链接后，自行打开官方快递应用查询包裹。'}
  }
];
