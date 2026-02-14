/**
 * Template-based argument generation for debate agents
 * No LLM required - uses topic embedding in predefined templates
 */

/** Argument perspectives */
type Perspective = 'ethics' | 'practical' | 'economic' | 'innovation';

/** Debate phase */
type Phase = 'argue' | 'rebut';

/** Stance */
type Stance = 'pro' | 'con';

/**
 * Simple hash function for deterministic template selection
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Pro (in favor) argument templates by perspective
 */
const PRO_ARGUE_TEMPLATES: Record<Perspective, string[]> = {
  ethics: [
    '「{{topic}}」は、社会全体の公平性と正義の観点から積極的に推進すべきです。すべての人が恩恵を受けられる仕組みを作ることが、私たちの道義的責任です。',
    '「{{topic}}」を支持する立場から、倫理的な観点で申し上げます。これは人々の基本的な権利を守り、より包括的な社会を実現するための重要な一歩です。',
    '道徳的な観点から、「{{topic}}」は弱者を守り、社会的な格差を是正するための不可欠な取り組みです。私たちには次世代により良い社会を残す責任があります。',
    '「{{topic}}」は、人間の尊厳と自由を守るという普遍的な価値観に基づいています。倫理的に正しい選択をすることで、社会全体の信頼が向上します。',
  ],
  practical: [
    '実用的な観点から見ると、「{{topic}}」は現在の課題に対する効果的な解決策です。既存のインフラを活用しながら段階的に導入でき、実現可能性が高いと考えます。',
    '「{{topic}}」の実践的なメリットは明らかです。導入コストに対して得られる効果が大きく、短期間で目に見える成果を出すことができます。',
    '現場の視点から言えば、「{{topic}}」は日常の業務や生活を大幅に改善します。複雑な問題をシンプルに解決し、関係者全員にとって使いやすい仕組みを提供します。',
    '「{{topic}}」は机上の空論ではなく、実際に多くの先行事例で成功が確認されています。データに基づいた効果検証も行われており、実用性は十分に証明されています。',
  ],
  economic: [
    '経済的な観点から、「{{topic}}」は長期的な投資対効果が非常に高いです。初期投資は必要ですが、将来的な経済成長と雇用創出に大きく貢献します。',
    '「{{topic}}」がもたらす経済効果は計り知れません。新しい市場を開拓し、産業の活性化を促進することで、GDP成長率の向上が期待できます。',
    '費用対効果の面で、「{{topic}}」は非常に優れています。現在の社会的コストを削減しながら、新たな経済的価値を生み出すことができます。',
    '「{{topic}}」への投資は、将来世代への最も賢明な資産形成です。持続可能な経済モデルを構築し、国際競争力を高めることができます。',
  ],
  innovation: [
    '「{{topic}}」はイノベーションの起爆剤です。この取り組みにより、技術革新が加速し、これまで解決できなかった問題に新しいアプローチが可能になります。',
    '革新性の観点から、「{{topic}}」は次世代のスタンダードとなるべきものです。先行して取り組むことで、世界をリードする立場を確立できます。',
    '「{{topic}}」は、既存の枠組みを超えた新しい可能性を切り開きます。創造的な解決策を生み出し、社会全体のイノベーション能力を高めます。',
    '技術と社会の進歩という観点から、「{{topic}}」は避けて通れない道です。変化を恐れるのではなく、積極的に新しい未来を築くべきです。',
  ],
};

/**
 * Con (against) argument templates by perspective
 */
const CON_ARGUE_TEMPLATES: Record<Perspective, string[]> = {
  ethics: [
    '「{{topic}}」には重大な倫理的懸念があります。一部の人々に不当な負担を強いる可能性があり、個人の自由と選択の権利を侵害しかねません。',
    '倫理的な立場から反対します。「{{topic}}」は意図せず既存の社会的不平等を深刻化させるリスクがあります。十分な影響評価なしに進めるべきではありません。',
    '「{{topic}}」は、表面的には正しく見えても、深く掘り下げると道徳的なジレンマを内包しています。少数派の声が無視される危険性を見過ごすことはできません。',
    '道義的な観点から、「{{topic}}」には慎重な再検討が必要です。善意から始まった取り組みが、意図しない形で人々の権利を制限する歴史的事例は数多くあります。',
  ],
  practical: [
    '実際の運用を考えると、「{{topic}}」には多くの実務上の課題があります。現場での実装は想定以上に複雑で、予期しない問題が次々と発生する可能性が高いです。',
    '現実的に見て、「{{topic}}」は理想論に過ぎません。必要なリソース、人材、インフラが十分に整っておらず、実現までの道のりは極めて困難です。',
    '「{{topic}}」の実行可能性には大きな疑問があります。類似の取り組みが過去に失敗した事例が多く、同じ轍を踏むリスクを無視すべきではありません。',
    '実務者の視点から言えば、「{{topic}}」は現場の実情を十分に反映していません。理論と実践のギャップが大きく、期待された効果を得ることは難しいでしょう。',
  ],
  economic: [
    '経済的な影響を考慮すると、「{{topic}}」は財政的に持続不可能です。必要な予算は当初の見積もりを大幅に超える可能性が高く、他の重要な分野の予算が削られます。',
    '「{{topic}}」のコストパフォーマンスには重大な問題があります。同じ予算をより効果的な代替策に投じた方が、社会全体にとって大きなリターンが期待できます。',
    '経済学的な分析に基づくと、「{{topic}}」は市場メカニズムを歪め、非効率を生み出す危険があります。結果として、経済全体の生産性が低下する恐れがあります。',
    '「{{topic}}」への過度な投資は、経済的なリスクを増大させます。不確実性が高い中で大規模な資源配分を行うことは、財政的に無責任と言わざるを得ません。',
  ],
  innovation: [
    '「{{topic}}」は真のイノベーションを阻害する可能性があります。画一的なアプローチを強制することで、多様な解決策の探索が制限されてしまいます。',
    '革新の名の下に「{{topic}}」を推進することへの懸念を表明します。急速な変化は既存システムとの互換性問題を引き起こし、混乱を招く恐れがあります。',
    '「{{topic}}」が本当にイノベーティブかどうか、冷静に検証する必要があります。新しいものが常に優れているわけではなく、実証されていない手法への過信は危険です。',
    '技術的な不確実性を考慮すると、「{{topic}}」への全面的な移行はリスクが大きすぎます。段階的に検証を重ね、代替案も並行して検討すべきです。',
  ],
};

/**
 * Rebuttal templates (responding to opponent's argument)
 */
const PRO_REBUT_TEMPLATES: string[] = [
  '反対派の懸念は理解できますが、「{{topic}}」に関する反論には根本的な見落としがあります。{{opponent_point}}という指摘に対して、実際にはこれらの課題は適切な制度設計と段階的な導入により十分に解決可能です。むしろ行動しないリスクの方が遥かに大きいのです。',
  '反対意見を真摯に受け止めつつも、「{{topic}}」の重要性を改めて主張します。{{opponent_point}}との指摘がありましたが、最新の研究やデータはこれとは異なる結論を示しています。リスクを恐れて現状維持を選ぶことこそが、最大のリスクです。',
  '反対派の議論には一定の合理性がありますが、「{{topic}}」を推進しない場合のデメリットを過小評価しています。{{opponent_point}}については、先行事例からすでに効果的な対策が確立されています。前に進む勇気が今、求められています。',
  '「{{topic}}」に対する批判的な意見は、議論を深める上で価値がありますが、いくつかの重要な事実を見落としています。{{opponent_point}}という主張は、短期的な視点に偏っています。長期的なビジョンに基づけば、賛成の立場がより合理的であることは明白です。',
];

const CON_REBUT_TEMPLATES: string[] = [
  '賛成派の主張は情熱的ですが、「{{topic}}」に関する楽観論には現実的な根拠が不十分です。{{opponent_point}}とのことですが、そのような理想的なシナリオが実現した事例はごく限られています。冷静な分析と慎重な判断が必要です。',
  '賛成派の議論を注意深く検討しましたが、「{{topic}}」に関する反対の立場を改めて強調します。{{opponent_point}}という主張は、成功事例のみに注目し、多くの失敗事例を無視しています。バランスの取れた評価が不可欠です。',
  '「{{topic}}」への支持意見には魅力的な部分もありますが、根本的な問題点が解消されていません。{{opponent_point}}については、理論上は正しくても実際の運用では多くの障害が生じます。もっと現実的な代替案を検討すべきです。',
  '賛成派の論点は、「{{topic}}」のメリットを過大評価しています。{{opponent_point}}とのことですが、その前提条件が崩れた場合のリスク管理が全く議論されていません。最悪のシナリオも想定した上で判断すべきではないでしょうか。',
];

/**
 * Summary templates
 */
const SUMMARY_TEMPLATES: string[] = [
  '「{{topic}}」に関するディベートのまとめ：\n\n【賛成派の主要論点】\n{{pro_summary}}\n\n【反対派の主要論点】\n{{con_summary}}\n\n両者とも重要な観点を提示しており、この議題については多角的な視点からの継続的な議論が必要です。最終的な判断は、これらの論点を総合的に評価した上で行うべきでしょう。',
  '「{{topic}}」ディベート総括：\n\n賛成派は{{pro_summary}}と主張し、反対派は{{con_summary}}と反論しました。\n\nこのディベートを通じて、「{{topic}}」には明確なメリットとリスクの両面があることが浮き彫りになりました。建設的な対話を続けることが、より良い解決策を見出す鍵となるでしょう。',
];

const PERSPECTIVES: Perspective[] = ['ethics', 'practical', 'economic', 'innovation'];

/**
 * Generate an argument for a given topic, stance, and phase
 */
export function generateArgument(
  topic: string,
  stance: Stance,
  phase: Phase,
  opponentArgument?: string
): { text: string; perspective?: Perspective } {
  const hash = hashString(topic);

  if (phase === 'argue') {
    const perspective = PERSPECTIVES[hash % PERSPECTIVES.length];
    const templates = stance === 'pro' ? PRO_ARGUE_TEMPLATES : CON_ARGUE_TEMPLATES;
    const perspectiveTemplates = templates[perspective];
    const templateIndex = (hash + (stance === 'con' ? 1 : 0)) % perspectiveTemplates.length;
    const template = perspectiveTemplates[templateIndex];

    return {
      text: template.replace(/\{\{topic\}\}/g, topic),
      perspective,
    };
  }

  // Rebuttal phase
  const templates = stance === 'pro' ? PRO_REBUT_TEMPLATES : CON_REBUT_TEMPLATES;
  const templateIndex = hash % templates.length;
  const template = templates[templateIndex];

  // Extract a brief summary from opponent's argument for the rebuttal
  const opponentPoint = opponentArgument
    ? opponentArgument.slice(0, 80) + (opponentArgument.length > 80 ? '...' : '')
    : '先ほどの主張';

  return {
    text: template
      .replace(/\{\{topic\}\}/g, topic)
      .replace(/\{\{opponent_point\}\}/g, `「${opponentPoint}」`),
  };
}

/**
 * Generate a summary of the debate
 */
export function generateSummary(
  topic: string,
  proArgs: string[],
  conArgs: string[]
): string {
  const hash = hashString(topic);
  const template = SUMMARY_TEMPLATES[hash % SUMMARY_TEMPLATES.length];

  const proSummary = proArgs.map((arg, i) => `${i + 1}. ${arg.slice(0, 60)}...`).join('\n');
  const conSummary = conArgs.map((arg, i) => `${i + 1}. ${arg.slice(0, 60)}...`).join('\n');

  return template
    .replace(/\{\{topic\}\}/g, topic)
    .replace(/\{\{pro_summary\}\}/g, proSummary)
    .replace(/\{\{con_summary\}\}/g, conSummary);
}
