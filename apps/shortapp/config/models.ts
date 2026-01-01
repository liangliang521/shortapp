/**
 * AI模型配置
 * 模型ID到显示名称的映射
 */

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

/**
 * 模型ID到显示名称的映射
 */
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'glm-4.7': 'GLM-4.7',
  'claude-haiku-4-5': 'Claude Haiku 4.5',
  'claude-sonnet-4-5': 'Claude Sonnet 4.5',
  'minimax-m2': 'MiniMax M2',
  'kimi-k2-thinking': 'Kimi K2 Thinking',
  'gpt-5.1-codex': 'GPT-5.1 Codex',
  'gemini-3-pro': 'Gemini 3 Pro',
  'grok-code-fast-1': 'Grok Code Fast 1',
};

/**
 * 模型描述映射
 */
export const MODEL_DESCRIPTIONS: Record<string, string> = {
  'glm-4.7': 'Advanced general-purpose model',
  'claude-haiku-4-5': 'Fast and efficient model',
  'claude-sonnet-4-5': 'Premier coding model',
  'minimax-m2': 'High-performance model',
  'kimi-k2-thinking': 'Deep thinking model',
  'gpt-5.1-codex': 'Excellent at coding tasks',
  'gemini-3-pro': 'Multimodal AI model',
  'grok-code-fast-1': 'Fast code generation',
};

/**
 * 所有可用的模型选项
 */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'glm-4.7',
    name: MODEL_DISPLAY_NAMES['glm-4.7'],
    description: MODEL_DESCRIPTIONS['glm-4.7'],
  },
  {
    id: 'claude-haiku-4-5',
    name: MODEL_DISPLAY_NAMES['claude-haiku-4-5'],
    description: MODEL_DESCRIPTIONS['claude-haiku-4-5'],
  },
  {
    id: 'claude-sonnet-4-5',
    name: MODEL_DISPLAY_NAMES['claude-sonnet-4-5'],
    description: MODEL_DESCRIPTIONS['claude-sonnet-4-5'],
  },
  {
    id: 'minimax-m2',
    name: MODEL_DISPLAY_NAMES['minimax-m2'],
    description: MODEL_DESCRIPTIONS['minimax-m2'],
  },
  {
    id: 'kimi-k2-thinking',
    name: MODEL_DISPLAY_NAMES['kimi-k2-thinking'],
    description: MODEL_DESCRIPTIONS['kimi-k2-thinking'],
  },
  {
    id: 'gpt-5.1-codex',
    name: MODEL_DISPLAY_NAMES['gpt-5.1-codex'],
    description: MODEL_DESCRIPTIONS['gpt-5.1-codex'],
  },
  {
    id: 'gemini-3-pro',
    name: MODEL_DISPLAY_NAMES['gemini-3-pro'],
    description: MODEL_DESCRIPTIONS['gemini-3-pro'],
  },
  {
    id: 'grok-code-fast-1',
    name: MODEL_DISPLAY_NAMES['grok-code-fast-1'],
    description: MODEL_DESCRIPTIONS['grok-code-fast-1'],
  },
];

/**
 * 获取模型的显示名称
 */
export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] || modelId;
}

/**
 * 获取模型的描述
 */
export function getModelDescription(modelId: string): string {
  return MODEL_DESCRIPTIONS[modelId] || 'AI model';
}

