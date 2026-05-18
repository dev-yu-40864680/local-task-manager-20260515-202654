export const UI_MESSAGES = {
  corrupted_storage: '保存データを読み込めなかったため、初期状態に戻しました。',
  limit_reached: 'タスクは100件までです。既存タスクを削除してから追加してください。',
  save_failed: '保存に失敗しました。ブラウザの保存領域や設定を確認してください。'
} as const;

export type UiMessageReason = keyof typeof UI_MESSAGES;
