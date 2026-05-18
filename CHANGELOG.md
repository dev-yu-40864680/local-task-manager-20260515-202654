# Changelog

本ファイルは `local-task-manager` の主要な変更点を記録します。
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠し、バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [Unreleased]

### Known Issues

- `useTasks.addTask` の上限チェックに競合状態の可能性あり。`useCallback` の依存配列 `[tasks.length]` が原因で、同一レンダリングサイクル内に複数回 `addTask` が呼ばれた際に古い `tasks.length` を参照し、100 件上限を超えてタスクが追加され得る。通常の UI 操作では発生しないが、自動化呼び出し等で再現可能。
- `storage.ts` の `validateTask` は型存在チェック中心で、文字数上限・タグ数上限・日付フォーマットの厳密検証は未実装。手動改ざんに対する堅牢性に改善余地あり。
- 開発依存 `vite ^5.4.10` 経由の `esbuild <=0.24.2` に Dev Server 脆弱性 (`npm audit` 検出)。本番ビルド成果物には影響しない。

## [0.1.0] - 2026-05-15

### Added

- 初回リリース。Vite + React + TypeScript によるスキャフォールド。
- ドメインモデル `Task`（id / title / description / priority / dueDate / tags / status / createdAt / updatedAt）を `src/types.ts` に定義。
- `localStorage` 永続化レイヤ `src/storage.ts` を実装（キー: `local-task-manager:tasks:v1`）。
  - JSON パースエラー / 型不整合の検知。
  - 破損時は警告通知後にデータを破棄し初期状態へフォールバック。
- カスタムフック `src/hooks/useTasks.ts` でタスク CRUD・ステータス遷移を集約。
- UI コンポーネント:
  - `KanbanBoard.tsx`: TODO / 進行中 / 完了 の 3 列カンバン + D&D による状態遷移。
  - `TaskCard.tsx`: 単一タスクのカード表示。
  - `TaskModal.tsx`: 追加 / 編集モーダル、タグ候補補完つき。
  - `FilterBar.tsx`: 検索（タイトル / 説明 / タグ横断）・優先度 / タグ / 期限フィルタ。
- 控えめなダークテーマ（CSS 変数ベース）を `src/styles.css` に実装。
- 100 件上限ガード。超過時はエラーバナー表示で新規追加を拒否。
- ログイン・認証なしのローカル完結アーキテクチャ。
- README に概要・前提条件・手順・コマンド・データ構造・トラブルシュートを整備。

### Testing

- `vitest` + `@testing-library/react` + `jsdom` でテスト基盤構築。
- `src/storage.test.ts`: `localStorage` 読み書き / 破損 JSON / スキーマ違反検証。
- `src/hooks/useTasks.test.tsx`: CRUD・破損時初期化・上限拒否・**競合状態の脆弱性実証テスト**。
- `package.json` に `npm test` スクリプトを追加。

### Security

- 外部送信なし、認証なし、サーバー側状態なしのため、SQL injection / 認証バイパス / 権限昇格は該当しない。
- React の通常テキスト描画で出力しており `dangerouslySetInnerHTML` は未使用、XSS リスクは低い。
- 想定リスクは同一ブラウザ上の `localStorage` 直接改ざんのみ（影響範囲は当該端末内に限定）。

### Repository

- 新規 public Repository `local-task-manager` を `gh repo create` で自動作成・push。

## Decision Log

### 2026-05-15: 永続化を `localStorage` のみとする

- 背景: 「自分専用・ブラウザ保存のみ・ログインなし」というユーザー要件に合致。
- 採用: `localStorage` キー単一 (`local-task-manager:tasks:v1`)。
- 棄却: IndexedDB（オーバースペック）、外部 API（要件と不整合）。

### 2026-05-15: 上限 100 件・超過時はエラー表示で拒否

- 背景: `localStorage` 容量とパフォーマンスの観点で明示的なハード上限を設ける。
- 採用: 新規追加を拒否しエラーバナー表示。
- 棄却: 上限なし（破損リスク増大）、古いタスクの自動削除（データ損失リスク）。

### 2026-05-15: データ破損時は警告 + 初期化

- 背景: 部分復旧を試みるとコードが複雑化し、不整合データが温存される懸念。
- 採用: 警告バナーで通知後、ストレージを破棄して初期状態に戻す。
- 棄却: 部分復旧（複雑性増・テスト負担増）、サイレント破棄（ユーザー認知できない）。

### 2026-05-15: Repository 公開設定を public とする

- 背景: 機密情報を含まないローカル完結アプリのため public で問題なし。
- 採用: `gh repo create local-task-manager --public --source=. --remote=origin --push`。

### 2026-05-15: テーマは控えめなダークテーマ単一

- 背景: ユーザー要件「ダークテーマだが控えめ」に合致。
- 採用: CSS 変数ベースの単一テーマ。
- 棄却: ライト / ダーク切替（要件外）。
